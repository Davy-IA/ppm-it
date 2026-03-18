'use client';
import { View } from './App';
import { AppData, CapacityAlert } from '@/types';
import { computeAlerts } from '@/lib/alerts';

const NAV = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '◈' },
  { id: 'projects', label: 'Portefeuille', icon: '◉' },
  { id: 'staff', label: 'Ressources', icon: '◎' },
  { id: 'workload', label: 'Charge & Staffing', icon: '◈' },
  { id: 'capacity', label: 'Plan de capacité', icon: '▦' },
  { id: 'alerts', label: 'Alertes', icon: '◬' },
] as const;

interface Props {
  view: View;
  setView: (v: View) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  saving: boolean;
  data: AppData;
}

export default function Sidebar({ view, setView, open, setOpen, saving, data }: Props) {
  const alerts = computeAlerts(data);
  const alertCount = alerts.length;

  return (
    <aside style={{
      width: open ? 220 : 56, minWidth: open ? 220 : 56,
      background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden', zIndex: 20,
    }}>
      {/* Header */}
      <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: 4, flexShrink: 0 }}
        >
          {open ? '◀' : '▶'}
        </button>
        {open && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.02em' }}>PPM·IT</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>Capacity Planning</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const isActive = view === item.id;
          const isAlerts = item.id === 'alerts';
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={!open ? item.label : undefined}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>{item.icon}</span>
              {open && <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>}
              {isAlerts && alertCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'var(--danger)', color: '#fff',
                  borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        {saving && open && (
          <div style={{ fontSize: 11, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 1s infinite' }}></span>
            Sauvegarde…
          </div>
        )}
        {!saving && open && (
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            {data.projects.length} projets · {data.staff.length} ressources
          </div>
        )}
      </div>
    </aside>
  );
}
