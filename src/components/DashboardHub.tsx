'use client';
import { useState } from 'react';
import { AppData } from '@/types';
import { View } from './App';
import { useSettings } from '@/lib/context';
import Dashboard from './Dashboard';
import CapacityView from './CapacityView';
import AlertsView from './AlertsView';
import { computeAlerts } from '@/lib/alerts';

interface Props { data: AppData; setView: (v: View) => void; }

type SubTab = 'capacity' | 'alerts';

export default function DashboardHub({ data, setView }: Props) {
  const { t } = useSettings();
  const [tab, setTab] = useState<SubTab>('capacity');
  const alertCount = computeAlerts(data).length;

  const tabs: { id: SubTab; label: string; icon: JSX.Element; badge?: number }[] = [

    {
      id: 'capacity',
      label: t('nav_capacity') as string,
      icon: (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1 10l3-4 3 2.5L11 4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: 'alerts',
      label: t('nav_alerts') as string,
      icon: (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 1L12 12H1L6.5 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M6.5 5.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <circle cx="6.5" cy="10" r="0.7" fill="currentColor"/>
        </svg>
      ),
      badge: alertCount > 0 ? alertCount : undefined,
    },
  ];

  // Dummy updateData for CapacityView (read-only in hub context, but CapacityView needs it)
  const noopUpdate = () => {};

  return (
    <div className="animate-in">
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(tab_ => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              fontSize: 13, fontWeight: tab === tab_.id ? 700 : 500,
              border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
              color: tab === tab_.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === tab_.id ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
              transition: 'all 0.15s',
              position: 'relative',
            }}>
            <span style={{ opacity: tab === tab_.id ? 1 : 0.6 }}>{tab_.icon}</span>
            {tab_.label}
            {tab_.badge !== undefined && (
              <span style={{
                background: 'var(--danger)', color: '#fff',
                borderRadius: 20, padding: '1px 6px',
                fontSize: 10, fontWeight: 700, lineHeight: 1.4,
              }}>{tab_.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {tab === 'capacity' && <CapacityView data={data} updateData={noopUpdate as any} />}
      {tab === 'alerts'   && <AlertsView data={data} />}
    </div>
  );
}
