# Ultimatives Übergabeprotokoll & Entwickler-Handbuch (Mosaic App)

Dieses Dokument bietet eine lückenlose, tiefgehende technische Dokumentation der **Mosaic**-Anwendung. Es ist speziell darauf ausgelegt, neuen Entwicklern in **Google Antigravity** einen blitzschnellen Einstieg zu ermöglichen, die Architektur im Detail zu vermitteln und bewährte Entwicklungsrichtlinien festzulegen.

---

## 1. Das Anwendungs-Konzept ("Mosaic")

**Mosaic** ist ein hochperformanter, ästhetisch anspruchsvoller All-in-One-Medien-Tracker. Benutzer können ihren Konsum über vier Haupt-Medienkategorien hinweg erfassen, bewerten und verwalten:
*   🎥 **Movies** (Filme)
*   📺 **Shows** (Serien/TV)
*   📚 **Books** (Bücher)
*   🎮 **Games** (Videospiele)

### Design-Philosophie & Visuals:
- **Atmosphärische Tiefe:** Die App verwendet eine schlichte, hochelegante Oberfläche im *Atmospheric Dark-Slate-Stil*. Durch `DynamicBackground.tsx` werden weiche, farbige Glow-Effekte (Blurs) erzeugt, die sich dezent im Hintergrund bewegen.
- **Typografie:** Perfekt abgestimmte serifenlose Fonts (Inter für Benutzeroberflächen, Space Grotesk für markante Header) gepaart mit JetBrains Mono für Metadaten und Kennzahlen.
- **Fluidität & Animation:** Sämtliche Übergänge, Seitenwechsel und Slider-Interaktionen sind mit der Animationsbibliothek `motion` (aus `motion/react`) umgesetzt. Es gibt keine sprunghaften Zustandsänderungen; alles verhält sich weich und reaktiv.
- **Die namensgebende „Mosaik“-Ansicht:** Abgeschlossene Medien werden standardmäßig als wunderschöne, visuelle Cover-Raster (Mosaike) dargestellt. Ein visueller Meilenstein-Effekt (`MosaicLaunch.tsx`) feiert das Hinzufügen neuer abgeschlossener Medien.

---

## 2. Detaillierte Verzeichnis- und Datei-Architektur

Die Codebasis ist streng modular aufgebaut. Jede Datei hat eine eindeutig abgegrenzte Aufgabe:

```text
/
├── SUPABASE_SETUP.md        # Komplette SQL-Datenbank-Skripte (Tabellen, Indizes, RLS)
├── UEBERGABE.md             # Dieses Dokument (Handover & Deep Dive)
├── index.html               # Einstiegspunkt für den Browser
├── package.json             # Abhängigkeiten, Skripte und Metadaten
├── vite.config.ts           # Konfiguration für Vite und PWA
├── src/
│   ├── main.tsx             # React-Mounting und globale Initialisierung
│   ├── index.css            # Zentraler Tailwind v4 Import und globale CSS-Variablen
│   ├── types.ts             # Gemeinsame TypeScript-Typdefinitionen (Schnittstellen & Enums)
│   ├── App.tsx              # Core-Anwendungslogik, State-Management und Routing
│   ├── lib/
│   │   └── supabase.ts      # Supabase-Client-Konfiguration und Verbindungsprüfung
│   ├── services/
│   │   ├── bookService.ts   # Schnittstelle zu Buch-Metadaten (Open Library / Google Books)
│   │   ├── gameService.ts   # Schnittstelle zu Spiele-Datenbanken (IGDB / RAWG)
│   │   └── tmdbService.ts   # Schnittstelle zu Film-/Serien-Metadaten (The Movie Database)
│   └── components/
│       ├── Layout.tsx       # Globales Layout (Sticky Header, Footer, responsive Navigation)
│       ├── DynamicBackground.tsx # Animierte Ambient-Hintergrund-Blurs
│       ├── AppLogo.tsx      # Das geometrische Vektor-Logo von Mosaic
│       ├── Auth.tsx         # Anmelde- und Registrierungsformulare (Supabase Auth)
│       ├── ActiveMediaShelf.tsx # „Aktive“-Leiste für Medien, die gerade konsumiert werden
│       ├── TrackerRow.tsx   # Listenzeile für abgeschlossene Einträge im Tracker-Tab
│       ├── BacklogRow.tsx   # Listenzeile für geplante Einträge im Backlog-Tab
│       ├── MosaicView.tsx   # Grid-Darstellung von abgeschlossenen Medien-Covern
│       ├── MosaicLaunch.tsx # Konfetti-artiger Launch-Effekt bei Fertigstellung eines Mediums
│       ├── EditModal.tsx    # Fortschritts-Tracker und Einstellungs-Modal für bestehende Einträge
│       ├── MediaForm.tsx    # Erstellungs-Formular inklusive Live-API-Suche nach Covern
│       ├── BarcodeScanner.tsx # Integrierter Kamera-Scan für Buch-ISBNs (@zxing/library)
│       ├── ChallengeProgress.tsx # Fortschrittsbalken und Filter-Widgets für aktive Challenges
│       ├── ChallengeModal.tsx # Erstellungs-Modal für zeitlich begrenzte Konsum-Herausforderungen
│       ├── Analytics.tsx    # Daten-Visualisierung mit interaktiven Recharts-Diagrammen
│       ├── ImportModal.tsx  # Dialog für Massen-Importe aus CSV und JSON (papaparse)
│       └── Settings.tsx     # Profilverwaltung, Exporte, Importe und Datenlöschung
```

---

## 3. Datenmodell & Supabase-Datenbank-Design

Die PostgreSQL-Datenbank auf Supabase-Ebene verwendet vier relationale Haupttabellen. Alle Schemata unterstützen vollständige Mandantenfähigkeit (Multi-User-Support) mittels Row Level Security (RLS).

### A. Die Tabellen im Detail

#### 1. `profiles`
Speichert zusätzliche Benutzerdaten abseits der Kern-Auth-Tabelle von Supabase.
- `id` (uuid, primary key) -> Verweist auf `auth.users.id`
- `username` (text)
- `avatar_url` (text)
- `created_at` (timestamp with time zone)

#### 2. `media_items`
Die zentrale Tabelle für alle eingetragenen Medien (sowohl aktive, abgeschlossene als auch Backlog-Medien).
- `id` (uuid, primary key)
- `user_id` (uuid) -> Verweist auf `auth.users.id`
- `title` (text, not null)
- `type` (text) -> Enums: `movie`, `show`, `book`, `game`
- `status` (text) -> Enums: `planned` (Backlog), `active`, `completed`, `dnf` (Did Not Finish)
- `rating` (integer) -> 0 bis 5 Sterne
- `watchDate` / `endDate` (text/date) -> Wann abgeschlossen
- `startDate` (text/date) -> Wann begonnen
- `dateAdded` (timestamp) -> Erstellungszeitpunkt im System
- `imageUrl` (text) -> Pfad oder URL zum Coverbild
- `tags` (text) -> Komma-separierte Liste von Tags
- `platform` / `console` (text) -> Plattform des Konsums (PC, PS5, Kindle, etc.)
- `notes` (text) -> Persönliche Notizen oder Rezensionen
- `current_season` / `current_episode` / `total_seasons` / `total_episodes` (integer) -> Serien-Fortschritt
- `current_pages` / `total_pages` (integer) -> Buch-Lesefortschritt
- `progress_percent` (integer) -> Spiel-Fortschritt in %

#### 3. `challenges`
Vom Nutzer selbst gesetzte Challenges (z.B. „Lese 12 Bücher im Jahr 2026“).
- `id` (uuid, primary key)
- `user_id` (uuid) -> Verweist auf `auth.users.id`
- `title` (text)
- `mediaType` (text) -> `movie`, `show`, `book`, `game`
- `targetCount` (integer)
- `startDate` / `endDate` (date)
- `created_at` (timestamp)

#### 4. `friendships`
Abbildung des sozialen Netzwerks zum Teilen von Abschlüssen im „Friends“-Feed.
- `id` (uuid, primary key)
- `user_id` (uuid) -> Verweist auf `auth.users.id` (Der Absender/Folgende)
- `friend_id` (uuid) -> Verweist auf `profiles.id` (Der Empfänger/Gefolgte)
- `created_at` (timestamp)
- *Constraint:* `friendships_user_friend_unique` stellt sicher, dass Freundschaften nicht mehrfach angelegt werden können.

---

## 4. RLS & Index-Optimierungen (Supabase Entlastung)

Kürzlich traten Performance-Spitzen in Supabase auf. Um die CPU- und Arbeitsspeicherauslastung des Datenbank-Containers zu minimieren, wurden tiefgreifende Optimierungen vorgenommen, die jeder Entwickler zwingend fortführen muss:

### A. RLS-Subquery-Caching
Standardmäßig prüft Postgres in RLS-Sicherheitsregeln den Auth-Kontext per Funktionsaufruf: `auth.uid() = user_id`. Bei Abfragen mit vielen Zeilen wird diese Funktion $O(N)$-mal aufgerufen, was zu CPU-Spikes führt.
**Lösung:** Umhüllung des Aufrufs in eine SELECT-Unterabfrage. Postgres wertet diese einmalig aus und cached den Wert für den gesamten Query-Scan ($O(1)$):
```sql
-- Hocheffiziente RLS-Regel
create policy "Users can view their own media" on media_items
  for select using ((select auth.uid()) = user_id);
```
*Dies wurde auf alle Richtlinien für `media_items`, `challenges` und `friendships` angewendet.*

### B. Index-Strategie für Fremdschlüssel
Lade- und Join-Abfragen führten ohne Indizes zu teuren Full-Table-Scans. Es wurden präzise Fremdschlüssel-Indizes angelegt:
- `media_items_user_id_idx` auf `media_items(user_id)`
- `challenges_user_id_idx` on `challenges(user_id)`
- `friendships_friend_id_idx` on `friendships(friend_id)`

*Redundanz-Vermeidung:* Der Index `friendships_user_id_idx` wurde gelöscht, da Abfragen über `user_id` bereits hocheffizient durch den zusammengesetzten Unique-Key `(user_id, friend_id)` abgedeckt sind. Das spart Schreib-Overhead.

---

## 5. Das Ladeverhalten & Daten-Caching (Frontend-Optimierung)

Auch das Frontend wurde umstrukturiert, um die Last auf die Datenbank-Schnittstelle zu minimieren.

### A. Datenbank-Filterung vor Client-Filterung
Früher wurden alle Tabellenzeilen unspezifisch geladen und im React-Client gefiltert. Nun filtert die Query direkt auf Datenbank-Ebene:
```typescript
// Abfrage filtert streng serverseitig nach der aktuellen Benutzer-ID
const { data, error } = await supabase
  .from('media_items')
  .select('id, user_id, title, type, status, rating, watchDate, endDate, dateAdded, imageUrl, tags, platform, console, notes')
  .eq('user_id', currentUserId);
```

### B. Begrenzungs- & Paginations-Schranken
1.  **Die 6-Monatsschranke (Tracker-Tab):**
    Der Tracker zeigt standardmäßig nur abgeschlossene Einträge der **letzten 6 Monate** an. Das reduziert die Datenmenge beim App-Start massiv. Ältere Einträge werden erst geladen und gerendert, wenn der Benutzer explizit auf den Button `Show Older Entries / Ältere Einträge anzeigen` klickt.
2.  **Die 10-Elemente-Schranke (Backlog-Tab):**
    Im Backlog werden pro Medientyp (Games, Books, etc.) initial nur die ersten **10 Einträge** gerendert. Weitere Einträge werden erst über ein interaktives „Show More“ dynamisch freigeschaltet, was den DOM-Tree klein und performant hält.
3.  **Die 50er-Schranke (Friends-Feed):**
    Die Social-Abfrage der Freundesaktivitäten limitiert die Ergebnisse per `.limit(50)` direkt in der API-Abfrage, sortiert nach Abschlussdatum (`watchDate`), und filtert anschließend clientseitig auf das letzte halbe Jahr.

### C. Redundanz-Sperre & Retry-Engine in `App.tsx`
*   **Doppel-Fetch-Sperre:** Der React Strict Mode oder schnelle Tab-Wechsel triggern oft identische API-Fetches parallel. Mithilfe von `lastFetchedUserIdRef` (`useRef<string | null>`) wird die Benutzer-ID getrackt. Ein Fetch wird blockiert, wenn die Daten für diesen Benutzer bereits aktiv im Zustand gehalten werden.
*   **Netzwerk-Ausfallsicherheit:** Tritt beim Abrufen von Medien oder Challenges ein Verbindungsfehler auf (`TypeError: Failed to fetch`), greift ein intelligenter Retry-Mechanismus mit exponentiellem Backoff (bis zu 2 Versuche mit steigender Verzögerung), um die App stabil zu halten:
    ```typescript
    } catch (err: any) {
      if (retryCount < 2 && (err instanceof TypeError || String(err).includes('Failed to fetch'))) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => fetchMedia(userIdOverride, retryCount + 1), delay);
      }
    }
    ```

---

## 6. Wichtige Metadaten-Integrationsdienste (`/src/services`)

Mosaic sucht beim Hinzufügen von neuen Medien automatisch nach Covers und Metadaten im Internet. Dafür sind drei schlanke Dienste integriert:

1.  **`tmdbService.ts`:**
    Fragt die offizielle API von *The Movie Database* ab. Holt Poster-Pfade, Filmbeschreibungen, Veröffentlichungsdaten und unterscheidet intelligent zwischen Filmen (`movie`) und Serien (`tv`).
2.  **`gameService.ts`:**
    Greift auf Spiele-APIs oder Fallback-Bibliotheken zu, um qualitativ hochwertige Spiele-Cover und Release-Jahre für Video-Konsolen zu ermitteln.
3.  **`bookService.ts`:**
    Sucht Bücher über die *Open Library* und *Google Books* APIs. Unterstützt sowohl Titelsuchen als auch direkte Suchen nach der eindeutigen **ISBN** (wird intensiv vom Barcode-Scanner genutzt).

---

## 7. Leitfaden für neue Entwickler in Google Antigravity

Wenn du die Entwicklung fortführst, beachte folgende Prinzipien:

*   **Keine API-Schlüssel im Client:** Wenn du neue externe Dienste integrierst, halte die API-Schlüssel auf Server-Ebene verdeckt oder nutze die sichere Key-Verwaltung in den Einstellungen von AI Studio.
*   **Linter- und Buildprüfung:** Vor jedem Einreichen deines Codes führe die Verifizierungsschritte aus:
    - `npm run lint` (Typ-Prüfung per `tsc --noEmit`)
    - `npm run build` (Voller Produktions-Build zur Validierung der Buildfähigkeit)
*   **UI-Konsistenz:** Nutze für visuelle Komponenten ausschließlich Tailwind v4 Utility-Klassen. Ändere die Farbpalette nicht unüberlegt. Das Farbschema basiert auf gedeckten Erd- und Schiefer-Tönen (`#DFD0B8`, `#393E46`, `#5C8374`, `#9EC8B9`, `#1B262C`).
*   **Fremdschlüssel immer indizieren:** Wenn du neue Datenbank-Tabellen (z.B. für Kommentare oder Gruppen) erstellst, erstelle zwingend abdeckende Indizes für die Fremdschlüssel und dokumentiere das SQL-Skript in `SUPABASE_SETUP.md`.
*   **Zustands-Persistenz:** Benutzerspezifische Daten gehören in die Supabase-Datenbank. Lokaler Zustand im Browser (`localStorage`) darf nur für rein kosmetische Einstellungen (wie Suchfilter-Präferenzen oder Ansichtsmodi) verwendet werden.
