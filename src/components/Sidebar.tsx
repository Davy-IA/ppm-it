'use client';
import { useEffect, useState } from 'react';
import { View } from './App';
import { AppData } from '@/types';
import { computeAlerts } from '@/lib/alerts';
import { useSettings } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
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

interface Space { id: string; name: string; color: string; icon: string; }

interface Props {
  view: View; setView: (v: View) => void;
  open: boolean; setOpen: (o: boolean) => void;
  saving: boolean; data: AppData;
  currentSpace?: Space | null;
  onChangeSpace?: () => void;
}

export default function Sidebar({ view, setView, open, setOpen, saving, data, currentSpace, onChangeSpace }: Props) {
  const alerts = computeAlerts(data);
  const alertCount = alerts.length;
  const { theme, toggle } = useTheme();
  const { settings, updateSettings, t } = useSettings();
  const { user, logout } = useAuth();
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Nav items — Budget is a real nav entry (external link), handled separately
  const NAV_ITEMS: { id: View | 'budget'; labelKey: string; icon: string; external?: string }[] = [
    { id: 'dashboard',  labelKey: 'nav_dashboard', icon: '▣' },
    { id: 'projects',   labelKey: 'nav_projects',  icon: '◉' },
    { id: 'gantt',      labelKey: 'nav_planning',  icon: '▦' },
    { id: 'staff',      labelKey: 'nav_staff',     icon: '◎' },
    { id: 'workload',   labelKey: 'nav_workload',  icon: '◈' },
    { id: 'capacity',   labelKey: 'nav_capacity',  icon: '▤' },
    { id: 'budget',     labelKey: 'nav_budget',    icon: '◈', external: (settings as any).budgetUrl || '#' },
    { id: 'alerts',     labelKey: 'nav_alerts',    icon: '◬' },
    { id: 'settings',   labelKey: 'nav_settings',  icon: '⚙' },
  ];

  const currentLocale = LOCALES.find(l => l.code === settings.locale);
  const ROLE_COLORS: Record<string, string> = { superadmin: 'var(--danger)', admin: 'var(--purple)', global: 'var(--warning)', member: 'var(--accent)' };
  const ROLE_LABELS: Record<string, string> = { superadmin: 'Super Admin', admin: 'Admin', global: 'CODIR', member: 'Membre' };

  return (
    <aside style={{ width: open ? 224 : 60, minWidth: open ? 224 : 60, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)', overflow: 'hidden', zIndex: 20, boxShadow: 'var(--shadow-sm)' }}>

      {/* Logo + org name */}
      <div style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setOpen(!open)} style={{ width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer', background: settings.logo ? 'transparent' : 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', boxShadow: settings.logo ? 'none' : '0 2px 8px rgba(99,102,241,0.35)', padding: 0 }}>
            {settings.logo ? <img src={settings.logo} alt="logo" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 8 }} /> : <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>P</span>}
          </button>
          {open && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{settings.appName || 'VEJA Project Management'}</div>
            </div>
          )}
        </div>
        {/* Space switcher */}
        {currentSpace && open && (
          <button onClick={onChangeSpace} style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${currentSpace.color}12`, border: `1px solid ${currentSpace.color}30`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', width: '100%', fontSize: 11, fontWeight: 600, color: currentSpace.color }}>
            <span>{currentSpace.icon}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{currentSpace.name}</span>
            <span style={{ opacity: 0.5, flexShrink: 0 }}>⇄</span>
          </button>
        )}
        {currentSpace && !open && (
          <button onClick={onChangeSpace} title={currentSpace.name} style={{ width: 34, height: 22, borderRadius: 5, border: 'none', background: `${currentSpace.color}20`, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentSpace.icon}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {open && <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', padding: '4px 12px 6px' }}>{t('nav_section')}</div>}
        {NAV_ITEMS.map(item => {
          // Hide settings for members
          if (item.id === 'settings' && user?.role === 'member') return null;
          // Hide budget if no URL configured
          if (item.id === 'budget' && !(settings as any).budgetUrl) return null;

          const isActive = view === item.id;
          const isAlerts = item.id === 'alerts';
          const label = (t as any)(item.labelKey) ?? item.labelKey;

          // External link (Budget)
          if (item.external) {
            return (
              <a key={item.id} href={item.external} target="_blank" rel="noopener noreferrer"
                className="nav-item"
                title={!open ? label : undefined}
                style={{ justifyContent: open ? 'flex-start' : 'center', textDecoration: 'none', gap: 10 }}>
                <span style={{ fontSize: 15, flexShrink: 0, opacity: 0.7, lineHeight: 1, width: 20, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                {open && <span style={{ fontWeight: 500 }}>{label}</span>}
                {open && <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 'auto', flexShrink: 0 }}>↗</span>}
              </a>
            );
          }

          return (
            <button key={item.id} onClick={() => setView(item.id as View)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={!open ? label : undefined}
              style={{ justifyContent: open ? 'flex-start' : 'center', position: 'relative' }}>
              <span style={{ fontSize: 15, flexShrink: 0, opacity: isActive ? 1 : 0.7, width: 20, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
              {open && <span style={{ fontWeight: isActive ? 700 : 500 }}>{label}</span>}
              {open && isAlerts && alertCount > 0 && <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{alertCount}</span>}
              {!open && isAlerts && alertCount > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, background: 'var(--danger)', borderRadius: '50%' }} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* User info */}
        {open && user && (
          <div style={{ padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.firstName} {user.lastName}</div>
              <div style={{ fontSize: 10, color: ROLE_COLORS[user.role] ?? 'var(--text-faint)', fontWeight: 600 }}>{ROLE_LABELS[user.role] ?? user.role}</div>
            </div>
            <button onClick={logout} className="btn-icon" style={{ width: 24, height: 24, fontSize: 12 }} {...{title: String(t('logout'))}}>⎋</button>
          </div>
        )}

        {/* Lang selector */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowLangMenu(!showLangMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: open ? 8 : 0, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 4px', borderRadius: 8, justifyContent: open ? 'flex-start' : 'center' }}
            title={!open ? currentLocale?.label : undefined}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{currentLocale?.flag}</span>
            {open && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, flex: 1, textAlign: 'left' }}>{currentLocale?.label}</span>}
            {open && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>▾</span>}
          </button>
          {showLangMenu && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', zIndex: 100, marginBottom: 4 }}>
              {LOCALES.map(loc => (
                <button key={loc.code} onClick={() => { updateSettings({ locale: loc.code }); setShowLangMenu(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: settings.locale === loc.code ? 'var(--accent-subtle)' : 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: settings.locale === loc.code ? 'var(--accent)' : 'var(--text)', fontWeight: settings.locale === loc.code ? 700 : 400 }}>
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
          style={{ display: 'flex', alignItems: 'center', gap: open ? 10 : 0, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 4px', borderRadius: 8, justifyContent: open ? 'flex-start' : 'center' }}
          title={!open ? (theme === 'dark' ? t('theme_light') : t('theme_dark')) : undefined}>
          <div style={{ position: 'relative', width: 34, height: 18, flexShrink: 0, background: theme === 'dark' ? 'var(--accent)' : 'var(--border-light)', borderRadius: 9, transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: theme === 'dark' ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
          </div>
          {open && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{theme === 'dark' ? t('theme_dark') : t('theme_light')}</span>}
        </button>

        {open && (
          <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 4px' }}>
            {saving ? <span style={{ color: 'var(--warning)' }}>● {t('saving')}</span> : `${data.projects.length} projets · ${data.staff.length} res.`}
          </div>
        )}
      </div>
    </aside>
  );
}
