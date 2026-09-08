import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Client-side Web Push helpers.
 *
 * Delivery relies on a Supabase Edge Function ("send-reminders") that runs on a
 * daily pg_cron schedule. This module only handles the browser side:
 *   - checking support / permission,
 *   - subscribing the current device to push and storing the subscription,
 *   - silently re-subscribing on app start (iOS push subscriptions can expire
 *     without any error), so a stored reminder still reaches the device.
 *
 * IMPORTANT (iOS): Web Push only works when the app has been installed to the
 * Home Screen ("Add to Home Screen") and permission was granted from inside the
 * installed PWA via a user gesture.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/**
 * Device-local flag remembering that the user switched notifications OFF here.
 * A push subscription is per-device, so this preference is per-device too — and
 * without it `ensurePushSubscription()` would silently re-subscribe on the next
 * app start (browser permission stays "granted" after unsubscribing).
 */
const PUSH_DISABLED_KEY = 'mosaic_push_disabled';

const isLocallyDisabled = (): boolean => {
  try {
    return localStorage.getItem(PUSH_DISABLED_KEY) === '1';
  } catch {
    return false;
  }
};

const setLocallyDisabled = (disabled: boolean): void => {
  try {
    if (disabled) localStorage.setItem(PUSH_DISABLED_KEY, '1');
    else localStorage.removeItem(PUSH_DISABLED_KEY);
  } catch {
    /* storage unavailable — non-fatal */
  }
};

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const getPermission = (): PushPermission => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as PushPermission;
};

/** Convert a base64url VAPID public key into the Uint8Array the API expects. */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/** Wait for the service worker (registered by vite-plugin-pwa) to be ready. */
const getRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn('Service worker not ready:', err);
    return null;
  }
};

/** Persist a PushSubscription to Supabase (idempotent on the endpoint). */
const storeSubscription = async (sub: PushSubscription): Promise<void> => {
  if (!isSupabaseConfigured) return;
  const json = sub.toJSON();
  const keys = json.keys || ({} as Record<string, string>);
  if (!json.endpoint || !keys.p256dh || !keys.auth) {
    console.warn('Push subscription is missing endpoint/keys, skipping store.');
    return;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'endpoint' }
    );
  if (error) console.warn('Failed to store push subscription:', error.message);
};

/**
 * Enable push for this device. Must be called from a user gesture (button tap),
 * which is required for the iOS permission prompt.
 * Returns the resulting permission state.
 */
export const enablePush = async (): Promise<PushPermission> => {
  if (!isPushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) {
    console.error('VITE_VAPID_PUBLIC_KEY is not configured.');
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission as PushPermission;

  const registration = await getRegistration();
  if (!registration) return 'unsupported';

  try {
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await storeSubscription(sub);
    setLocallyDisabled(false);
  } catch (err) {
    console.error('Failed to subscribe to push:', err);
  }
  return 'granted';
};

/**
 * Is this device currently subscribed to push? Reflects the real state, not just
 * the browser permission (permission can be "granted" while unsubscribed).
 */
export const isSubscribed = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (isLocallyDisabled()) return false;
  const registration = await getRegistration();
  if (!registration) return false;
  try {
    return !!(await registration.pushManager.getSubscription());
  } catch {
    return false;
  }
};

/**
 * Turn notifications off for this device: unsubscribe from push and drop the
 * stored subscription so the server stops sending to it. The browser permission
 * itself cannot be revoked programmatically — only the user can do that in the
 * OS/browser settings — but without a subscription nothing is delivered.
 */
export const disablePush = async (): Promise<void> => {
  setLocallyDisabled(true);
  if (!isPushSupported()) return;

  const registration = await getRegistration();
  if (!registration) return;

  try {
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return;
    const { endpoint } = sub;
    await sub.unsubscribe();
    if (isSupabaseConfigured && endpoint) {
      const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      if (error) console.warn('Failed to remove push subscription:', error.message);
    }
  } catch (err) {
    console.warn('disablePush failed:', err);
  }
};

/**
 * On app start: if permission is already granted, make sure a valid subscription
 * exists and is stored. Silently re-subscribes when the old subscription expired
 * (common on iOS). No-op when unsupported or permission is not granted.
 */
export const ensurePushSubscription = async (): Promise<void> => {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return;
  if (Notification.permission !== 'granted') return;
  // Respect an explicit "off" on this device — never silently re-subscribe.
  if (isLocallyDisabled()) return;

  const registration = await getRegistration();
  if (!registration) return;

  try {
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await storeSubscription(sub);
  } catch (err) {
    console.warn('ensurePushSubscription failed:', err);
  }
};
