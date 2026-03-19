'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, t as translate } from './i18n';
import { AppSettings, DEFAULT_SETTINGS, applyColorTheme } from './settings';

interface SettingsCtx {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function getInitialSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem('ppm-settings');
    if (saved) {
      const parsed = JSON.parse(saved) as AppSettings;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

const Ctx = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  t: (k: string) => k,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);

  useEffect(() => {
    // Apply color theme on mount
    applyColorTheme(settings.colorTheme ?? 'indigo');
  }, []);

  const updateSettings = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    localStorage.setItem('ppm-settings', JSON.stringify(next));
    if (partial.colorTheme) applyColorTheme(partial.colorTheme);
  };

  const tFn = (key: string, vars?: Record<string, string | number>): string =>
    translate(settings.locale, key as any, vars);

  return <Ctx.Provider value={{ settings, updateSettings, t: tFn }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
