'use client';
import { useState, useRef, useEffect } from 'react';
import { View } from './App';
import { AppData } from '@/types';
import { computeAlerts } from '@/lib/alerts';
import { useSettings } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { LOCALES } from '@/lib/i18n';
import { formatMonth } from '@/lib/locale-utils';

interface Space { id: string; name: string; color: string; icon: string; description?: string; }
interface Props {
  view: View; setView: (v: View) => void;
  saving: boolean; data: AppData;
  currentSpace?: Space | null;
  onChangeSpace?: () => void;
  spaces?: Space[];
  onSelectSpace?: (space: Space) => void;
}

// SVG icon components — modern, contextual
const Icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/>
    </svg>
  ),
  projects: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 6h6M5 8.5h4M5 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  gantt: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 8h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 12h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  staff: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 13c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="11.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" opacity="0.6"/>
      <path d="M13 13c0-1.66-1.34-3-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
  workload: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M4 6v8M12 4v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  capacity: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 11l3.5-4 3 2.5L12 5l2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  alerts: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14 13H2L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8 7v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="8" cy="11.5" r="0.8" fill="currentColor"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 1.5h3l.4 1.6a5 5 0 011 .6l1.6-.5 1.5 2.6-1.2 1.1c0 .4 0 .7.1 1l1.2 1.1-1.5 2.6-1.6-.5a5 5 0 01-1 .6l-.4 1.6h-3l-.4-1.6a5 5 0 01-1-.6l-1.6.5L2 9.9l1.2-1.1A5 5 0 013 7.8V7l-1.2-1L3.3 3.4l1.6.5a5 5 0 011-.6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  budget: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 7h12" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="5.5" cy="10.5" r="1" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  tasks: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4.5h7M2 8h9M2 11.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 7l1.5 1.5L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

function useTheme() {
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('ppm-theme') as 'light'|'dark') ?? 'light';
  });
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next === 'dark' ? 'dark' : '');
    localStorage.setItem('ppm-theme', next);
  };
  return { theme, toggle };
}

export default function TopNav({ view, setView, saving, data, currentSpace, onChangeSpace, spaces = [], onSelectSpace }: Props) {
  const { t, settings, updateSettings } = useSettings();
  const { user, logout, token, refreshUser, updateUser } = useAuth();
  const { theme, toggle } = useTheme();
  const alerts = computeAlerts(data);
  const alertCount = alerts.length;
  const [showLang, setShowLang] = useState(false);
  const [showSpaces, setShowSpaces] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const isSpaceAdmin = user?.role === 'space_admin';
  const spaceHiddenNavItems: string[] = (data as any)?.spaceConfig?.hiddenNavItems ?? [];
  const NAV_ITEMS = isSpaceAdmin
    ? [{ id: 'settings', labelKey: 'nav_settings', icon: Icons.settings }]
    : [
        { id: 'projects',  labelKey: 'nav_projects',  icon: Icons.projects },
        { id: 'gantt',     labelKey: 'nav_planning',   icon: Icons.gantt },
        { id: 'tasks',     labelKey: 'nav_tasks',      icon: Icons.tasks },
        { id: 'staff',     labelKey: 'nav_staff',      icon: Icons.staff },
        { id: 'workload',  labelKey: 'nav_workload',   icon: Icons.workload },
        ...(settings.budgetUrl ? [{ id: 'budget', labelKey: 'nav_budget', icon: Icons.budget, external: settings.budgetUrl }] : []),
        { id: 'dashboard', labelKey: 'nav_dashboard', icon: Icons.dashboard },
        ...(user?.role !== 'member' ? [{ id: 'settings', labelKey: 'nav_settings', icon: Icons.settings }] : []),
      ].filter(item => !spaceHiddenNavItems.includes(item.id));

  const currentLocale = LOCALES.find(l => l.code === settings.locale);

  return (
    <header className="topnav">
      {/* Left: Logo + Space */}
      <div className="topnav-brand">
        <div className="topnav-logo" onClick={onChangeSpace}
          style={{ background: (() => {
            const hasLogo = settings.logo || (settings as any).logoDark;
            if (!hasLogo) return 'var(--accent-gradient)';
            // White bg in light mode, dark bg in dark mode for PNG transparency
            return theme === 'dark' ? 'rgba(30,35,50,0.95)' : 'rgba(255,255,255,0.95)';
          })() }}>
          {(() => {
            const activeLogo = theme === 'dark'
              ? ((settings as any).logoDark || settings.logo)
              : (settings.logo || (settings as any).logoDark);
            return activeLogo
              ? <img src={activeLogo} alt="logo" style={{ height: 22, width: 22, objectFit: 'contain' }} />
              : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" opacity=".55"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" opacity=".55"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" opacity=".82"/></svg>;
          })()}
        </div>
        {/* Space selector dropdown */}
        <div style={{ position: 'relative' }}>
          <button className="topnav-space-btn" onClick={() => setShowSpaces(s => !s)}>
            {currentSpace
              ? <><span style={{ color: currentSpace.color }}>{currentSpace.icon}</span><span>{currentSpace.name}</span></>
              : <span>{t('spaces_label')}</span>
            }
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
              style={{ opacity: 0.5, transition: 'transform 0.15s', transform: showSpaces ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
              <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showSpaces && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 3999 }} onClick={() => setShowSpaces(false)} />
              <div className="topnav-dropdown" style={{ minWidth: 220, left: 0, right: 'auto', zIndex: 4000 }}>
                <div style={{ padding: '10px 14px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('spaces_label')}
                </div>
                {spaces.filter((s: Space) => s.id !== '__global__').map((space: Space) => (
                  <button key={space.id}
                    className={`topnav-dropdown-item ${currentSpace?.id === space.id ? 'active' : ''}`}
                    onClick={() => { onSelectSpace?.(space); setShowSpaces(false); }}>
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{space.icon}</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{space.name}</div>
                      {space.description && <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>{space.description}</div>}
                    </div>
                    {currentSpace?.id === space.id && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
                {user && (user.role !== 'space_admin') && spaces.filter(s => s.id !== '__global__').length > 1 && (
                  <button
                    className={`topnav-dropdown-item ${currentSpace?.id === '__global__' ? 'active' : ''}`}
                    style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 10 }}
                    onClick={() => { onSelectSpace?.({ id: '__global__', name: t('global_portfolio'), color: '#f59e0b', icon: '🌐' } as Space); setShowSpaces(false); }}>
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>🌐</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{t('global_portfolio')}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>{t('global_portfolio_subtitle')}</div>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Nav pills */}
      <nav className="topnav-nav">
        {NAV_ITEMS.map(item => {
          const label = t(item.labelKey);
          const isActive = view === (item.id as View);
          const isAlerts = item.id === 'dashboard';
          if ('external' in item && item.external) {
            return (
              <a key={item.id} href={item.external as string} target="_blank" rel="noopener noreferrer"
                className="topnav-item">
                <span className="topnav-icon">{item.icon}</span>
                <span>{label}</span>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ opacity: 0.4, marginLeft: -2 }}>
                  <path d="M1.5 6.5l5-5M4 1.5h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            );
          }
          return (
            <button key={item.id}
              className={`topnav-item ${isActive ? 'active' : ''}`}
              onClick={() => setView(item.id as View)}>
              <span className="topnav-icon">{item.icon}</span>
              <span>{label}</span>
              {isAlerts && alertCount > 0 && (
                <span className="topnav-badge">{alertCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: Controls */}
      <div className="topnav-actions">
        {saving && <span className="topnav-saving">{t('saving')}</span>}

        {/* Theme toggle */}
        <button className="topnav-icon-btn" onClick={toggle} title={theme === 'dark' ? t('theme_light') : t('theme_dark')}>
          {theme === 'dark'
            ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 9.5A6 6 0 116.5 3c0 0-1 3.5 1.5 5s5 1.5 5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          }
        </button>

        {/* Language selector */}
        <div style={{ position: 'relative' }}>
          <button className="topnav-icon-btn" onClick={() => setShowLang(!showLang)} title="Language">
            <span style={{ fontSize: 14 }}>{currentLocale?.flag}</span>
          </button>
          {showLang && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 3999 }} onClick={() => setShowLang(false)} />
              <div className="topnav-dropdown" style={{ zIndex: 4000 }} onClick={() => setShowLang(false)}>
              {LOCALES.map(loc => (
                <button key={loc.code} className={`topnav-dropdown-item ${settings.locale === loc.code ? 'active' : ''}`}
                  onClick={() => { updateSettings({ locale: loc.code }); setShowLang(false); }}>
                  <span style={{ fontSize: 15 }}>{loc.flag}</span>
                  <span>{loc.label}</span>
                  {settings.locale === loc.code && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto' }}><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              ))}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <button className="topnav-avatar" onClick={() => { setShowUser(!showUser); setShowProfile(false); }}
            style={{ overflow: 'hidden', padding: 0 }}>
            {(user as any)?.avatar
              ? <img src={(user as any).avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
            }
          </button>
          {showUser && !showProfile && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 3999 }} onClick={() => setShowUser(false)} />
              <div className="topnav-dropdown" style={{ zIndex: 4000 }} onClick={e => e.stopPropagation()}>
              <div className="topnav-dropdown-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="topnav-avatar" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0, overflow: 'hidden', padding: 0 }}>
                  {(user as any)?.avatar
                    ? <img src={(user as any).avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{user?.email}</div>
                </div>
              </div>
              <button className="topnav-dropdown-item" onClick={() => { setShowProfile(true); }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <span>{t('my_profile')}</span>
              </button>
              <button className="topnav-dropdown-item danger" onClick={logout}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 7h7M9 5l2 2-2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 2H3a1 1 0 00-1 1v8a1 1 0 001 1h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <span>{t('logout')}</span>
              </button>
              </div>
            </>
          )}
        </div>

        {/* Profile panel */}
        {showProfile && <ProfilePanel user={user} onClose={() => { setShowProfile(false); setShowUser(false); }} t={t} token={token} refreshUser={refreshUser} updateUser={updateUser} />}
      </div>
    </header>
  );
}

// ── Profile Panel ──────────────────────────────────────────────
function ProfilePanel({ user, onClose, t, token, refreshUser, updateUser }: { user: any; onClose: () => void; t: Function; token: string | null; refreshUser: () => Promise<void>; updateUser: (patch: any) => void }) {
  const [avatar, setAvatar] = useState<string | null>((user as any)?.avatar ?? null);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const avatarRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 160px and compress to keep under 100KB
        const MAX = 160;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        setAvatar(compressed);
        setErr('');
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    if (!avatar) return;
    setSaving(true);
    setErr(''); setMsg('');
    try {
      const r = await fetch('/api/auth/me-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar }),
      });
      const d = await r.json();
      if (d.ok) {
        updateUser({ avatar });
        setMsg(String(t('avatar_saved')));
      } else if (d.error === 'migration_needed') {
        setErr('Migration SQL requise : ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;');
      } else {
        setErr(d.message || d.error || 'Erreur sauvegarde avatar');
      }
    } catch {
      setErr('Erreur réseau');
    }
    setSaving(false);
  };

  const save = async () => {
    setErr(''); setMsg('');
    if (newPw && newPw !== confirmPw) { setErr(String(t('error_passwords_no_match'))); return; }
    if (newPw && newPw.length < 8) { setErr(String(t('error_password_too_short'))); return; }
    if (newPw && !curPw) { setErr(String(t('error_current_password_required'))); return; }
    setSaving(true);
    if (newPw) {
      const r = await fetch('/api/auth/me-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const d = await r.json();
      if (!d.ok) { setSaving(false); setErr(d.error || 'Error saving password'); return; }
    }
    setSaving(false);
    setMsg(String(t('avatar_saved')));
    setCurPw(''); setNewPw(''); setConfirmPw('');
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 3999 }} onClick={onClose} />
      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 300, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 8px 30px rgba(124,92,191,0.15)', zIndex: 4000, overflow: 'hidden', animation: 'dropIn 0.15s ease' }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{t('my_profile')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatar ? 'transparent' : 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid var(--border)', cursor: 'pointer' }} onClick={() => avatarRef.current?.click()}>
                {avatar ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>}
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg2)' }} onClick={() => avatarRef.current?.click()}>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 8l2-2 4-4 1 1-4 4-2 1H1z" fill="white"/><path d="M6 2l1 1" stroke="white" strokeWidth="1" strokeLinecap="round"/></svg>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.firstName} {user?.lastName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{user?.email}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <button onClick={() => avatarRef.current?.click()} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  {t('change_avatar')}
                </button>
                {avatar && (
                  <button onClick={() => setAvatar(null)} style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    {t('remove')}
                  </button>
                )}
              </div>
              {avatar && avatar !== ((user as any)?.avatar ?? null) && (
                <button className="btn btn-primary" onClick={saveAvatar} disabled={saving}
                  style={{ marginTop: 8, fontSize: 11, padding: '4px 12px' }}>
                  {saving ? '⏳…' : '💾 ' + t('save_photo')}
                </button>
              )}
            </div>
          </div>

          {/* Change password */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t('change_password')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="input" type="password" placeholder={String(t('current_password'))} value={curPw} onChange={e => setCurPw(e.target.value)} style={{ fontSize: 12 }} />
              <input className="input" type="password" placeholder={String(t('new_password'))} value={newPw} onChange={e => setNewPw(e.target.value)} style={{ fontSize: 12 }} />
              <input className="input" type="password" placeholder={String(t('confirm_password'))} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={{ fontSize: 12 }} />
            </div>
          </div>

          {err && <div style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>⚠ {err}</div>}
          {msg && <div style={{ background: 'var(--success-subtle)', color: 'var(--success)', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>✓ {msg}</div>}

          {newPw && (
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ width: '100%', fontSize: 13 }}>
              {saving ? '⏳…' : t('save')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
