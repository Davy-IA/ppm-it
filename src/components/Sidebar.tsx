'use client';
import { useEffect, useState } from 'react';
import { View } from './App';
import { AppData } from '@/types';
import { computeAlerts } from '@/lib/alerts';

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const saved = localStorage.getItem('ppm-theme') as 'light'|'dark'|null;
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

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▣' },
  { id: 'projects', label: 'Portefeuille', icon: '◉' },
  { id: 'gantt', label: 'Planning', icon: '▦' },
  { id: 'staff', label: 'Ressources', icon: '◎' },
  { id: 'workload', label: 'Charge & Staffing', icon: '◈' },
  { id: 'capacity', label: 'Capacité', icon: '▤' },
  { id: 'alerts', label: 'Alertes', icon: '◬' },
];

interface Props {
  view: View; setView: (v: View) => void;
  open: boolean; setOpen: (o: boolean) => void;
  saving: boolean; data: AppData;
}

export default function Sidebar({ view, setView, open, setOpen, saving, data }: Props) {
  const alerts = computeAlerts(data);
  const alertCount = alerts.length;
  const { theme, toggle } = useTheme();

  return (
    <aside style={{
      width: open ? 224 : 60, minWidth: open ? 224 : 60,
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden', zIndex: 20,
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setOpen(!open)} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'var(--accent-gradient)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
        }}>P</button>
        {open && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.03em', color: 'var(--text)' }}>PPM·IT</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 500 }}>Capacity Planning</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {open && <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', padding: '4px 12px 8px' }}>Navigation</div>}
        {NAV.map(item => {
          const isActive = view === item.id;
          const isAlerts = item.id === 'alerts';
          return (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={!open ? item.label : undefined}
              style={{ justifyContent: open ? 'flex-start' : 'center' }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              {open && <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>}
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
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        {/* Theme toggle */}
        <button onClick={toggle} title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          style={{ display: 'flex', alignItems: 'center', gap: open ? 10 : 0, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px', borderRadius: 8, justifyContent: open ? 'flex-start' : 'center' }}>
          <div style={{
            position: 'relative', width: 36, height: 20, flexShrink: 0,
            background: theme === 'dark' ? 'var(--accent)' : 'var(--border-light)',
            borderRadius: 10, transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: theme === 'dark' ? 19 : 3,
              width: 14, height: 14, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }} />
          </div>
          {open && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{theme === 'dark' ? '🌙 Sombre' : '☀️ Clair'}</span>}
        </button>

        {open && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-faint)', padding: '0 4px' }}>
            {saving
              ? <span style={{ color: 'var(--warning)' }}>● Sauvegarde…</span>
              : `${data.projects.length} projets · ${data.staff.length} ressources`
            }
          </div>
        )}
      </div>
    </aside>
  );
}
