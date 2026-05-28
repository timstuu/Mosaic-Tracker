import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Camera, Clipboard } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const nativeDetectorRef = useRef<any>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  
  const [useNative, setUseNative] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  
  // Fallback state
  const [manualIsbn, setManualIsbn] = useState('');

  // 1. Determine native vs software parsing on mount
  useEffect(() => {
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    let fallback = false;
    
    if (!BarcodeDetectorClass) {
      fallback = true;
    } else {
      try {
        nativeDetectorRef.current = new BarcodeDetectorClass({ formats: ['ean_13'] });
        setUseNative(true);
      } catch (e) {
        console.warn('Native BarcodeDetector unsupported formats. Falling back to zxing:', e);
        fallback = true;
      }
    }

    if (fallback) {
      setUseNative(false);
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]);
      zxingReaderRef.current = new BrowserMultiFormatReader(hints);
    }
  }, []);

  // 2. Camera Setup & Detection Loop
  useEffect(() => {
    let isActive = true;

    const startCameraAndScan = async () => {
      setCameraLoading(true);
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        
        if (!isActive) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
          await videoRef.current.play().catch(e => console.log('Video play interrupted:', e));
        }

        setCameraLoading(false);

        // STAGE 1: Use Native BarcodeDetector (Chrome/Android)
        if (useNative && nativeDetectorRef.current) {
          const scanFrame = async () => {
            if (!videoRef.current || !nativeDetectorRef.current || !streamRef.current || !isActive) return;
            
            try {
              if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const barcodes = await nativeDetectorRef.current.detect(videoRef.current);
                if (isActive && barcodes && barcodes.length > 0) {
                  const scannedIsbn = barcodes[0].rawValue;
                  if (scannedIsbn) {
                    triggerHapticAndSubmit(scannedIsbn);
                    return;
                  }
                }
              }
            } catch (e) {
              console.error('Native frame parsing exception:', e);
            }

            if (isActive) {
              frameIdRef.current = requestAnimationFrame(scanFrame);
            }
          };
          frameIdRef.current = requestAnimationFrame(scanFrame);
        } else if (zxingReaderRef.current && videoRef.current) {
          // STAGE 2: iOS/Safari Fallback via ZXing software loop
          try {
            await zxingReaderRef.current.decodeFromVideoElement(videoRef.current, (result, error) => {
              if (!isActive) return;
              if (result) {
                const text = result.getText();
                if (text) {
                  triggerHapticAndSubmit(text);
                }
              }
            });
          } catch (zxingError) {
            console.error('ZXing decoder registration error:', zxingError);
          }
        }
      } catch (err: any) {
        console.error('Camera access source error:', err);
        setCameraError(
          err?.name === 'NotAllowedError' 
            ? 'Camera access denied. Please grant permissions in your settings and refresh.' 
            : 'Unable to start camera stream feed. Enter ISBN details below manually.'
        );
        setCameraLoading(false);
      }
    };

    const triggerHapticAndSubmit = (code: string) => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch (e) {
          // ignore
        }
      }
      onScan(code);
    };

    startCameraAndScan();

    // 3. Complete Cleanup & Hardware Release when scanner closes or unmounts
    return () => {
      isActive = false;
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.reset();
        } catch (e) {
          console.log('ZXing reset exception:', e);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [useNative, onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIsbn = manualIsbn.trim().replace(/[-\s]/g, '');
    if (cleanIsbn.length >= 10 && cleanIsbn.length <= 13) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch (e) {
          // ignore
        }
      }
      onScan(cleanIsbn);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#242d3a]/95 backdrop-blur-md z-[120] flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-md bg-app-bg border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#242d3a]/40">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Barcode Scanner</h3>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
              {useNative ? 'Hardware Accelerated' : 'iOS Software Fallback Loop'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-zinc-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Viewfinder or Fallback UI */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden min-h-[280px]">
          {!cameraError ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-app-bg/60 glass z-10 p-4 text-center">
                  <div className="w-6 h-6 border-2 border-primary-accent border-t-transparent rounded-full animate-spin mb-3" />
                  <span className="text-xs text-zinc-400 font-mono">Initializing Camera...</span>
                </div>
              )}
              <video 
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              {/* Minimalist viewfinder target borders */}
              <div className="absolute pointer-events-none inset-6 border border-white/20 rounded-xl flex items-center justify-center">
                <div className="text-[9px] font-mono text-white bg-[#242d3a]/80 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
                  Align Barcode Inside Frame
                </div>
              </div>
            </div>
          ) : (
            /* Fallback manual input UI style matching instructions exactly */
            <div className="w-full space-y-5 text-center px-2 py-4">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-[#576d87]">
                <Camera size={22} />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest block">
                  Manual Entry
                </span>
                <p className="text-xs text-zinc-400 max-w-[280px] mx-auto leading-relaxed">
                  {cameraError}
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3 pt-2">
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={13}
                    placeholder="Enter EAN-13 ISBN (e.g. 9780140328721)"
                    value={manualIsbn}
                    onChange={(e) => setManualIsbn(e.target.value.replace(/[^0-9\s-]/g, ''))}
                    className="w-full bg-secondary-accent/50 border border-white/10 rounded-xl px-4 py-3 text-center text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-primary-accent/50 transition-colors"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={manualIsbn.trim().replace(/[-\s]/g, '').length < 10}
                  className="w-full bg-primary-accent text-app-bg hover:brightness-110 active:scale-[0.98] py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary-accent/5"
                >
                  <Clipboard size={14} />
                  <span>Verify and Retrieve</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer info/controls */}
        {!cameraError && (
          <div className="p-4 border-t border-white/5 bg-[#242d3a]/20 flex justify-center items-center gap-3">
            <span className="text-[9.5px] text-[#576d87] font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Scanning for active ean_13 barcodes...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
