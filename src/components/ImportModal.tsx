import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { MediaType, MediaItem, MediaStatus } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Partial<MediaItem>[]) => void;
  mode?: 'library' | 'watchlist';
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, mode = 'library' }) => {
  const [step, setStep] = useState<'config' | 'upload' | 'processing'>(mode === 'watchlist' ? 'upload' : 'config');
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.MOVIE);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('processing');
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const importedItems: Partial<MediaItem>[] = results.data.map((row: any) => {
            if (mode === 'watchlist') {
              // Letterboxd Watchlist: Date, Name, Year, Letterboxd URI
              const title = row.Name || row.name || row.Title || row.title;
              if (!title) return null;

              return {
                id: crypto.randomUUID(),
                title: title.trim(),
                type: MediaType.MOVIE,
                status: MediaStatus.PLANNED,
                dateAdded: row.Date || row.addedDate || new Date().toISOString(),
                link: row['Letterboxd URI'] || row.uri || undefined,
              };
            }

            // Basic mapping logic for Letterboxd/Goodreads Library
            // Letterboxd: Name, Year, Rating
            // Goodreads: Title, Author, My Rating
            const title = row.Name || row.Title || row.title || row.name;
            const rawRating = row.Rating || row['My Rating'] || row.rating || '0';
            const rating = Math.round(parseFloat(rawRating)) || 0;
            
            // Letterboxd diary exports have 'Watched Date' as the actual viewing date
            // Goodreads has 'Date Read'
            const dateStr = row['Watched Date'] || row.Date || row['Date Read'] || row.date || new Date().toISOString();

            if (!title) return null;

            return {
              id: crypto.randomUUID(),
              title: title.trim(),
              type: mediaType,
              status: MediaStatus.COMPLETED,
              rating: Math.min(5, Math.max(0, rating)),
              dateAdded: new Date().toISOString(),
              watchDate: dateStr,
              endDate: mediaType === MediaType.BOOK ? dateStr : undefined,
            };
          }).filter(Boolean) as Partial<MediaItem>[];

          if (importedItems.length === 0) {
            throw new Error('No valid entries found in CSV. Please check the column headers (Title/Name).');
          }

          onImport(importedItems);
          onClose();
          setStep(mode === 'watchlist' ? 'upload' : 'config');
        } catch (err: any) {
          setError(err.message || 'Failed to parse CSV');
          setStep('upload');
        }
      },
      error: (err) => {
        setError(err.message);
        setStep('upload');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-secondary-accent border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-serif italic text-white">
              {mode === 'watchlist' ? 'Import Watchlist' : 'Import Library'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          {step === 'config' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-white uppercase tracking-widest ml-1">1. Media Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setMediaType(MediaType.MOVIE)}
                    className={`p-4 rounded-2xl border transition-all text-left ${mediaType === MediaType.MOVIE ? 'bg-primary-accent border-primary-accent text-app-bg' : 'bg-white/5 border-white/5 text-zinc-400 hover:border-white/10'}`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider mb-1">Visual</div>
                    <div className="text-[10px] opacity-70">Movies, Series, Docs</div>
                  </button>
                  <button 
                    onClick={() => setMediaType(MediaType.BOOK)}
                    className={`p-4 rounded-2xl border transition-all text-left ${mediaType === MediaType.BOOK ? 'bg-primary-accent border-primary-accent text-app-bg' : 'bg-white/5 border-white/5 text-zinc-400 hover:border-white/10'}`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider mb-1">Reading</div>
                    <div className="text-[10px] opacity-70">Books, Novels</div>
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setStep('upload')}
                className="w-full bg-white text-app-bg py-4 rounded-2xl font-bold hover:brightness-90 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <div className="text-zinc-400">→</div>
              </button>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-primary-accent/50 transition-all cursor-pointer group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv" 
                  className="hidden" 
                />
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="text-zinc-300 group-hover:text-primary-accent" />
                </div>
                <h3 className="text-white font-medium mb-1">Select CSV File</h3>
                <p className="text-xs text-white">
                  {mode === 'watchlist' ? 'Letterboxd Watchlist export' : 'Letterboxd or Goodreads export'}
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button 
                onClick={() => mode === 'watchlist' ? onClose() : setStep('config')}
                className="w-full py-4 text-xs font-bold text-white uppercase tracking-widest hover:text-primary-accent transition-colors"
              >
                ← Back to settings
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 border-2 border-primary-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-white font-serif italic">Processing your library...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
