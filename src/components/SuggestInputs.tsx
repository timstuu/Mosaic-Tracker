import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { MediaItem } from '../types';

export const DEFAULT_PLATFORMS = ['Netflix', 'AppleTV+', 'Prime Video', 'ARD Mediathek'];

const normalize = (value: string) => value.trim().toLowerCase();
// Ignores case and spaces, so "Apple TV+" and "AppleTV+" count as the same option.
const optionKey = (value: string) => value.toLowerCase().replace(/\s+/g, '');

// Defaults plus every value already used, deduplicated (the default spelling wins)
// and sorted alphabetically.
const buildSelectOptions = (values: (string | undefined)[], defaults: string[] = []): string[] => {
  const byKey = new Map<string, string>();
  defaults.forEach(d => byKey.set(optionKey(d), d));
  values.forEach(raw => {
    const value = raw?.trim();
    if (value && !byKey.has(optionKey(value))) byKey.set(optionKey(value), value);
  });
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
};

export const buildPlatformOptions = (items: MediaItem[]) =>
  buildSelectOptions(items.map(item => item.platform), DEFAULT_PLATFORMS);

export const buildConsoleOptions = (items: MediaItem[]) =>
  buildSelectOptions(items.map(item => item.console));

// Every tag already used, most frequent first.
export const buildTagOptions = (items: MediaItem[]): string[] => {
  const counts = new Map<string, { label: string; count: number }>();
  items.forEach(item => {
    (item.tags || '').split(',').map(t => t.trim()).filter(Boolean).forEach(tag => {
      const key = normalize(tag);
      const entry = counts.get(key);
      if (entry) entry.count++;
      else counts.set(key, { label: tag, count: 1 });
    });
  });
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de', { sensitivity: 'base' }))
    .map(e => e.label);
};

const inputClass =
  'w-full bg-app-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-accent/50 transition-colors';
const listClass =
  'absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-app-bg border border-white/10 rounded-xl shadow-2xl py-1';
const optionClass = (active: boolean) =>
  `w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${active ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/5'}`;

interface OptionSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  emptyLabel: string;
}

// Searchable dropdown that also accepts a new value typed by the user.
export const OptionSelect: React.FC<OptionSelectProps> = ({ value, onChange, options, placeholder, emptyLabel }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return q ? options.filter(o => normalize(o).includes(q)) : options;
  }, [options, query]);
  const canCreate = query.trim() !== '' && !options.some(o => optionKey(o) === optionKey(query));
  const entries = canCreate ? [...filtered, query.trim()] : filtered;

  const pick = (next: string) => {
    onChange(next);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive(i => Math.min(i + 1, entries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (entries[active]) pick(entries[active]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : value}
        placeholder={open && value ? value : placeholder}
        onFocus={() => { setOpen(true); setQuery(''); setActive(0); }}
        onBlur={() => setOpen(false)}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={handleKeyDown}
        className={`${inputClass} pr-10`}
      />
      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      {open && (
        <div className={listClass}>
          {value && (
            <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(''); }} className={`${optionClass(false)} text-zinc-500 italic`}>
              {emptyLabel}
            </button>
          )}
          {entries.map((entry, i) => {
            const isNew = canCreate && i === entries.length - 1;
            return (
              <button
                key={entry + (isNew ? '-new' : '')}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(entry); }}
                onMouseEnter={() => setActive(i)}
                className={optionClass(i === active)}
              >
                {isNew && <Plus size={14} />}
                {isNew ? `„${entry}“ hinzufügen` : entry}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

const MAX_TAG_SUGGESTIONS = 8;

export const TagInput: React.FC<TagInputProps> = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const parts = value.split(',');
  const current = normalize(parts[parts.length - 1]);
  const used = new Set(parts.slice(0, -1).map(normalize).filter(Boolean));

  const suggestions = useMemo(() => {
    if (!current) return [];
    return options
      .filter(o => !used.has(normalize(o)) && normalize(o).includes(current) && normalize(o) !== current)
      // Prefix matches first; the stable sort keeps frequency order within each group.
      .sort((a, b) => Number(normalize(b).startsWith(current)) - Number(normalize(a).startsWith(current)))
      .slice(0, MAX_TAG_SUGGESTIONS);
  }, [options, current, value]);

  const apply = (tag: string) => {
    const kept = parts.slice(0, -1).map(t => t.trim()).filter(Boolean);
    onChange([...kept, tag].join(', ') + ', ');
    setActive(0);
    inputRef.current?.focus();
  };

  const showList = open && suggestions.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      apply(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => { onChange(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={handleKeyDown}
        className={inputClass}
      />
      {showList && (
        <div className={listClass}>
          {suggestions.map((tag, i) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); apply(tag); }}
              onMouseEnter={() => setActive(i)}
              className={optionClass(i === active)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
