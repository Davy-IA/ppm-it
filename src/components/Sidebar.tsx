'use client';
import { useState } from 'react';
import { useSettings } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import type { View } from './App';

interface Space { id: string; name: string; color: string; icon: string; }

interface Props {
  view: View;
  setView: (v: View) => void;
  currentSpace: Space;
  spaces: Space[];
  onChangeSpace: () => void;
  onSelectSpace: (s: Space) => void;
  saving: boolean;
  alertCount?: number;
}

const NAV_ITEMS: { id: View; labelKey: string; icon: JSX.Element; badgeKey?: 'alert' }[] = [
  { id: 'dashboard', labelKey: 'nav_dashboard', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8.5l5-5.5 3.5 4L13 4l1.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 14h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )},
  { id: 'projects', labelKey: 'nav_portfolio', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 3V2M11 3V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )},
  { id: 'gantt', labelKey: 'nav_planning', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3.5 5h5M3.5 8h8M3.5 11h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )},
  { id: 'staff', labelKey: 'nav_staff', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.5" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 14c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )},
  { id: 'workload', labelKey: 'nav_workload', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 11l2.5-4 3 3.5 2.5-4.5 2 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )},
  { id: 'dashboard', labelKey: 'nav_dashboard_alerts', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 10h10M3 6h6.5M3 13.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ), badgeKey: 'alert' },
  { id: 'settings', labelKey: 'nav_settings', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 1.5h3l.4 1.5a5 5 0 011 .6l1.6-.5 1.5 2.6-1.2 1a4.8 4.8 0 010 1.2l1.2 1-1.5 2.6-1.6-.5a5 5 0 01-1 .6l-.4 1.5h-3l-.4-1.5a5 5 0 01-1-.6l-1.6.5L1.8 9.9l1.2-1a4.8 4.8 0 010-1.2l-1.2-1 1.5-2.6 1.6.5a5 5 0 011-.6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )},
];

export default function Sidebar({ view, setView, currentSpace, spaces, onChangeSpace, onSelectSpace, saving, alertCount = 0 }: Props) {
  const { t, settings } = useSettings();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showSpaces, setShowSpaces] = useState(false);

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'U';
  const userName = user?.email?.split('@')[0] ?? 'User';

  // Unique nav items — dashboard appears once mapped to 'projects' as default
  const items = [
    { id: 'projects' as View,  label: t('nav_portfolio'), icon: NAV_ITEMS[1].icon },
    { id: 'gantt' as View,     label: t('nav_planning'),  icon: NAV_ITEMS[2].icon },
    { id: 'staff' as View,     label: t('nav_staff'),     icon: NAV_ITEMS[3].icon },
    { id: 'workload' as View,  label: t('nav_workload'),  icon: NAV_ITEMS[4].icon },
    { id: 'dashboard' as View, label: t('nav_dashboard'), icon: NAV_ITEMS[0].icon, badge: alertCount > 0 ? String(alertCount) : undefined, badgeRed: true },
    { id: 'settings' as View,  label: t('nav_settings'),  icon: NAV_ITEMS[6].icon, bottom: true },
  ];

  const topItems = items.filter(i => !i.bottom);
  const bottomItems = items.filter(i => i.bottom);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sb-inner">
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo-mark">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.2" fill="white" opacity=".9"/>
              <rect x="8" y="1" width="5" height="5" rx="1.2" fill="white" opacity=".55"/>
              <rect x="1" y="8" width="5" height="5" rx="1.2" fill="white" opacity=".55"/>
              <rect x="8" y="8" width="5" height="5" rx="1.2" fill="white" opacity=".82"/>
            </svg>
          </div>
          <span className="sb-logo-text">{settings.appName || 'PPM·IT'}</span>
        </div>

        {/* Space selector */}
        {!collapsed && (
          <div style={{ padding: '8px 10px 4px', position: 'relative' }}>
            <button className="space-pill" style={{ width: '100%' }} onClick={() => setShowSpaces(!showSpaces)}>
              <span style={{ fontSize: 14 }}>{currentSpace.icon}</span>
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSpace.name}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {showSpaces && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setShowSpaces(false)} />
                <div style={{ position: 'absolute', top: '100%', left: 10, right: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', zIndex: 201, padding: '4px' }}>
                  {spaces.map(s => (
                    <button key={s.id} onClick={() => { onSelectSpace(s); setShowSpaces(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: 'none', background: s.id === currentSpace.id ? 'var(--accent-subtle)' : 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: s.id === currentSpace.id ? 600 : 400, color: 'var(--text)' }}>
                      <span>{s.icon}</span><span>{s.name}</span>
                    </button>
                  ))}
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  <button onClick={() => { onChangeSpace(); setShowSpaces(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: 'none', background: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text-muted)' }}>
                    🌐 Tous les espaces
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="sb-nav">
          {topItems.map(item => (
            <button key={item.id + item.label} className={`sb-item${view === item.id ? ' active' : ''}`}
              onClick={() => setView(item.id)}>
              <span className="sb-item-icon">{item.icon}</span>
              <span className="sb-item-label">{item.label}</span>
              {item.badge && (
                <span className="sb-item-badge" style={item.badgeRed ? { background: 'var(--danger)' } : {}}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {saving && !collapsed && (
            <div style={{ padding: '6px 10px' }}>
              <span className="saving-indicator">✓ Sauvegardé</span>
            </div>
          )}

          {bottomItems.map(item => (
            <button key={item.id + item.label} className={`sb-item${view === item.id ? ' active' : ''}`}
              onClick={() => setView(item.id)}>
              <span className="sb-item-icon">{item.icon}</span>
              <span className="sb-item-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User foot */}
        <div className="sb-foot">
          <div className="sb-foot-avatar">{userInitials}</div>
          <div className="sb-foot-info">
            <div className="sb-foot-name">{userName}</div>
            <div className="sb-foot-role">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Toggle button — outside sb-inner so it sits on the border */}
      <button className="sb-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Étendre' : 'Réduire'}>
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          {collapsed
            ? <path d="M2.5 1.5L6 4.5l-3.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            : <path d="M6.5 1.5L3 4.5l3.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          }
        </svg>
      </button>
    </aside>
  );
}
