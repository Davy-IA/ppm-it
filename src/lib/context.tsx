'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, t as translate, TranslationKey } from './i18n';
import { AppSettings, DEFAULT_SETTINGS, applyColorTheme } from './settings';

interface SettingsCtx {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  t: (k) => k,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ppm-settings');
      if (saved) {
        const parsed = JSON.parse(saved) as AppSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        applyColorTheme(parsed.colorTheme ?? 'indigo');
      }
    } catch {}
  }, []);

  const updateSettings = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    localStorage.setItem('ppm-settings', JSON.stringify(next));
    if (partial.colorTheme) applyColorTheme(partial.colorTheme);
  };

  const tFn = (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(settings.locale, key, vars);

  return <Ctx.Provider value={{ settings, updateSettings, t: tFn }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
