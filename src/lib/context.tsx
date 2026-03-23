'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, t as translate } from './i18n';
import { AppSettings, DEFAULT_SETTINGS, applyColorTheme } from './settings';

// Keys saved to Supabase (shared across all users/browsers)
const GLOBAL_KEYS: (keyof AppSettings)[] = ['logo', 'logoDark', 'appName', 'budgetUrl'];

interface SettingsCtx {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function getLocalSettings(): Partial<AppSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('ppm-settings');
    if (saved) return JSON.parse(saved) as Partial<AppSettings>;
  } catch {}
  return {};
}

async function loadGlobalSettings(): Promise<Partial<AppSettings>> {
  try {
    const token = localStorage.getItem('ppm_token');
    const url = token ? '/api/settings' : '/api/settings?public=1';
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await fetch(url, { headers });
    if (!r.ok) return {};
    const data = await r.json();
    // Settings are stored as { general: { logo, logoDark, appName, budgetUrl } }
    const general = data.general ?? data;
    return {
      logo: general.logo ?? null,
      logoDark: general.logoDark ?? null,
      appName: general.appName ?? DEFAULT_SETTINGS.appName,
      budgetUrl: general.budgetUrl ?? DEFAULT_SETTINGS.budgetUrl,
    };
  } catch { return {}; }
}

async function saveGlobalSettings(partial: Partial<AppSettings>) {
  const globalPartial: Record<string, any> = {};
  (GLOBAL_KEYS as string[]).forEach(k => {
    if (k in partial) globalPartial[k] = (partial as any)[k];
  });
  if (Object.keys(globalPartial).length === 0) return;
  try {
    const token = localStorage.getItem('ppm_token');
    if (!token) return;
    // First fetch current general settings, then merge
    const r0 = await fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } });
    const current = r0.ok ? await r0.json() : {};
    const general = { ...(current.general ?? {}), ...globalPartial };
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ general }),
    });
  } catch {}
}

const Ctx = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  t: (k: string) => k,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...getLocalSettings(),
  }));

  useEffect(() => {
    applyColorTheme(settings.colorTheme ?? 'indigo');
    const fs = settings.tableFontSize ?? 12;
    document.documentElement.style.setProperty('--table-fs', `${fs}px`);
    // Load global settings from Supabase and merge
    loadGlobalSettings().then(global => {
      if (Object.keys(global).length > 0) {
        setSettings(prev => ({ ...prev, ...global }));
      }
    });
  }, []);

  const updateSettings = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    // Save local settings (locale, theme, fontSize) to localStorage
    const local: Partial<AppSettings> = {};
    (Object.keys(partial) as (keyof AppSettings)[]).forEach(k => {
      if (!GLOBAL_KEYS.includes(k)) (local as any)[k] = (partial as any)[k];
    });
    if (Object.keys(local).length > 0) {
      const saved = getLocalSettings();
      localStorage.setItem('ppm-settings', JSON.stringify({ ...saved, ...local }));
    }
    // Save global settings (logo, appName, budgetUrl) to Supabase
    saveGlobalSettings(partial);
    if (partial.colorTheme) applyColorTheme(partial.colorTheme);
    if (partial.tableFontSize !== undefined) {
      document.documentElement.style.setProperty('--table-fs', `${partial.tableFontSize}px`);
    }
  };

  const tFn = (key: string, vars?: Record<string, string | number>): string =>
    translate(settings.locale, key as any, vars);

  return <Ctx.Provider value={{ settings, updateSettings, t: tFn }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
