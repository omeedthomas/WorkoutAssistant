import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readJson, writeJson } from './storage';

/** This phone's preferences (not part of your progress, so never synced). */
export interface Prefs {
  /** The voice coach reads out each set, rest and countdown. */
  voice: boolean;
}

const STORAGE_KEY = 'ascent:prefs:v1';
const DEFAULTS: Prefs = { voice: true };

const PrefsContext = createContext<{ prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void } | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, set] = useState<Prefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void readJson(STORAGE_KEY).then((raw) => {
      const saved = raw && typeof raw === 'object' ? (raw as Partial<Prefs>) : {};
      set({ voice: typeof saved.voice === 'boolean' ? saved.voice : DEFAULTS.voice });
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) void writeJson(STORAGE_KEY, prefs);
  }, [prefs, loaded]);

  const value = useMemo(() => ({ prefs, setPrefs: (p: Partial<Prefs>) => set((cur) => ({ ...cur, ...p })) }), [prefs]);
  if (!loaded) return null;
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}
