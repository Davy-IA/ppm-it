'use client';
import { useEffect, useState } from 'react';
import { View } from './App';
import { AppData } from '@/types';
import { computeAlerts } from '@/lib/alerts';

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const saved = localStorage.getItem('ppm-theme') as 'dark' | 'light' | null;
    if (saved) { setTheme(saved); document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : ''); }
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : '');
    localStorage.setItem('ppm-theme', next);
  };
  return { theme, toggle };
}

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '⬡' },
  { id: 'projects', label: 'Portefeuille', icon: '◎' },
  { id: 'gantt', label: 'Planning Gantt', icon: '▤' },
  { id: 'staff', label: 'Ressources', icon: '◉' },
  { id: 'workload', label: 'Charge & Staffing', icon: '◈' },
  { id: 'capacity', label: 'Capacité', icon: '▦' },
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
      width: open ? 230 : 60, minWidth: open ? 230 : 60,
      background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden', zIndex: 20, boxShadow: 'var(--shadow)',
    }}>
      {/* Logo */}
      <div style={{ padding: open ? '18px 16px 14px' : '18px 10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.05em',
        }}>P</div>
        {open && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>PPM · IT</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1, whiteSpace: 'nowrap' }}>Capacity Planning</div>
          </div>
        )}
        <button onClick={() => setOpen(!open)} style={{
          marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-faint)', fontSize: 13, padding: '4px 2px', flexShrink: 0,
          borderRadius: 4, transition: 'color 0.15s',
        }}>
          {open ? '◀' : '▶'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {open && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 8px 4px' }}>Navigation</div>}
        {NAV.map(item => {
          const isActive = view === item.id;
          const isAlerts = item.id === 'alerts';
          return (
            <button key={item.id} onClick={() => setView(item.id as View)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={!open ? item.label : undefined}
              style={{ justifyContent: open ? 'flex-start' : 'center' }}
            >
              <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
              {open && <span style={{ flex: 1 }}>{item.label}</span>}
              {isAlerts && alertCount > 0 && (
                <span style={{
                  background: 'var(--danger)', color: '#fff',
                  borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>{alertCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {open && (
          <div style={{ fontSize: 11, color: 'var(--text-faint)', paddingLeft: 4 }}>
            {saving
              ? <span style={{ color: 'var(--warning)' }}>● Sauvegarde…</span>
              : <span>{data.projects.length} projets · {data.staff.length} ressources</span>
            }
          </div>
        )}
        {/* Theme toggle */}
        <button onClick={toggle} title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          style={{ display: 'flex', alignItems: 'center', gap: open ? 10 : 0, background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', width: '100%', justifyContent: open ? 'flex-start' : 'center', transition: 'all 0.15s' }}>
          <span style={{ fontSize: 15 }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
          {open && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{theme === 'dark' ? 'Thème sombre' : 'Thème clair'}</span>}
          {open && (
            <div style={{ marginLeft: 'auto', position: 'relative', width: 32, height: 18, background: theme === 'light' ? 'var(--accent)' : 'var(--border-light)', borderRadius: 9, transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: theme === 'light' ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
