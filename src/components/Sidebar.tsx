'use client';
import { useEffect, useState } from 'react';
import { View } from './App';
import { AppData } from '@/types';
import { computeAlerts } from '@/lib/alerts';
import { useSettings } from '@/lib/context';
import { LOCALES } from '@/lib/i18n';

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const saved = localStorage.getItem('ppm-theme') as 'light' | 'dark' | null;
    const t = saved ?? 'light';
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : '');
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next === 'dark' ? 'dark' : '');
    localStorage.setItem('ppm-theme', next);
  };
  return { theme, toggle };
}

interface Props {
  view: View; setView: (v: View) => void;
  open: boolean; setOpen: (o: boolean) => void;
  saving: boolean; data: AppData;
}

export default function Sidebar({ view, setView, open, setOpen, saving, data }: Props) {
  const alerts = computeAlerts(data);
  const alertCount = alerts.length;
  const { theme, toggle } = useTheme();
  const { settings, updateSettings, t } = useSettings();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const NAV: { id: View; labelKey: string; icon: string }[] = [
    { id: 'dashboard', labelKey: 'nav_dashboard', icon: '▣' },
    { id: 'projects', labelKey: 'nav_projects', icon: '◉' },
    { id: 'gantt', labelKey: 'nav_planning', icon: '▦' },
    { id: 'staff', labelKey: 'nav_staff', icon: '◎' },
    { id: 'workload', labelKey: 'nav_workload', icon: '◈' },
    { id: 'capacity', labelKey: 'nav_capacity', icon: '▤' },
    { id: 'alerts', labelKey: 'nav_alerts', icon: '◬' },
    { id: 'settings', labelKey: 'nav_settings', icon: '⚙' },
  ];

  const currentLocale = LOCALES.find(l => l.code === settings.locale);

  return (
    <aside style={{
      width: open ? 224 : 60, minWidth: open ? 224 : 60,
      background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden', zIndex: 20, boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Logo */}
      <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setOpen(!open)} style={{
          width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: settings.logo ? 'transparent' : 'var(--accent-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
          boxShadow: settings.logo ? 'none' : '0 2px 8px rgba(99,102,241,0.35)',
          padding: 0,
        }}>
          {settings.logo
            ? <img src={settings.logo} alt="logo" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 8 }} />
            : <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>P</span>
          }
        </button>
        {open && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.03em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {settings.appName || 'PPM·IT'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 500 }}>Capacity Planning</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {open && <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', padding: '4px 12px 8px' }}>{t('nav_section')}</div>}
        {NAV.map(item => {
          const isActive = view === item.id;
          const isAlerts = item.id === 'alerts';
          const isSettings = item.id === 'settings';
          return (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={!open ? t(item.labelKey as any) : undefined}
              style={{ justifyContent: open ? 'flex-start' : 'center', position: 'relative' }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              {open && <span style={{ fontWeight: isActive ? 700 : 500 }}>{t(item.labelKey as any)}</span>}
              {open && isAlerts && alertCount > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{alertCount}</span>
              )}
              {!open && isAlerts && alertCount > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, background: 'var(--danger)', borderRadius: '50%' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Language selector */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowLangMenu(!showLangMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: open ? 8 : 0, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px', borderRadius: 8, justifyContent: open ? 'flex-start' : 'center' }}
            title={!open ? currentLocale?.label : undefined}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{currentLocale?.flag}</span>
            {open && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, flex: 1, textAlign: 'left' }}>{currentLocale?.label}</span>}
            {open && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>▾</span>}
          </button>
          {showLangMenu && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', zIndex: 100,
              marginBottom: 4,
            }}>
              {LOCALES.map(loc => (
                <button key={loc.code}
                  onClick={() => { updateSettings({ locale: loc.code }); setShowLangMenu(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '9px 12px', background: settings.locale === loc.code ? 'var(--accent-subtle)' : 'none',
                    border: 'none', cursor: 'pointer', fontSize: 13, color: settings.locale === loc.code ? 'var(--accent)' : 'var(--text)',
                    fontWeight: settings.locale === loc.code ? 700 : 400,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{loc.flag}</span>
                  <span>{loc.label}</span>
                  {settings.locale === loc.code && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={toggle}
          style={{ display: 'flex', alignItems: 'center', gap: open ? 10 : 0, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px', borderRadius: 8, justifyContent: open ? 'flex-start' : 'center' }}
          title={!open ? (theme === 'dark' ? t('theme_light') : t('theme_dark')) : undefined}
        >
          <div style={{ position: 'relative', width: 34, height: 18, flexShrink: 0, background: theme === 'dark' ? 'var(--accent)' : 'var(--border-light)', borderRadius: 9, transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: theme === 'dark' ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
          </div>
          {open && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{theme === 'dark' ? t('theme_dark') : t('theme_light')}</span>}
        </button>

        {open && (
          <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 4px' }}>
            {saving
              ? <span style={{ color: 'var(--warning)' }}>● {t('saving')}</span>
              : `${data.projects.length} projets · ${data.staff.length} res.`
            }
          </div>
        )}
      </div>
    </aside>
  );
}
