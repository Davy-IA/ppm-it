'use client';
import { AppData, MONTHS_2026_2028 } from '@/types';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { computeAlerts } from '@/lib/alerts';
import { View } from './App';
import { useSettings } from '@/lib/context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props { data: AppData; setView: (v: View) => void; onSubNav?: (tab: string) => void; }

const STATUS_BADGE: Record<string, string> = {
  '1-To arbitrate': 'badge-gray', '2-Validated': 'badge-blue',
  '3-In progress': 'badge-green', '4-Frozen': 'badge-yellow',
  '5-Completed': 'badge-purple', '6-Aborted': 'badge-red',
};

export default function Dashboard({ data, setView, onSubNav }: Props) {
  const { t, settings } = useSettings();
  const locale = settings.locale ?? 'fr';
  const alerts = computeAlerts(data);
  const overcap = alerts.filter(a => a.type === 'overcapacity');
  const uncovered = alerts.filter(a => a.type === 'uncovered');

  const chartMonths = MONTHS_2026_2028.slice(0, 12);
  const chartData = chartMonths.map(month => {
    const totalCap = data.staff.reduce((s, st) => s + (st.capacity[month] ?? 0), 0);
    const totalAlloc = data.allocations.reduce((s, a) => s + (a.monthly[month] ?? 0), 0);
    const label = formatMonth(month, locale, { month: 'short', year: '2-digit' });
    return { month: label, capacity: totalCap, allocated: totalAlloc };
  });

  const STATUS_KEYS: Record<string, string> = {
    '1-To arbitrate': 'status_to_arbitrate', '2-Validated': 'status_validated',
    '3-In progress': 'status_in_progress', '4-Frozen': 'status_frozen',
    '5-Completed': 'status_completed', '6-Aborted': 'status_aborted',
  };
  const statusCounts: Record<string, number> = {};
  for (const p of data.projects) {
    const s = p.status ?? 'status_undefined';
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }
  const statusColors: Record<string, string> = {
    '1-To arbitrate': 'var(--text-faint)', '2-Validated': 'var(--accent)',
    '3-In progress': 'var(--success)', '4-Frozen': 'var(--warning)',
    '5-Completed': 'var(--purple)', '6-Aborted': 'var(--danger)',
  };

  const statCards = [
    { label: t('active_projects'), value: data.projects.filter(p => p.status === '3-In progress').length, sub: `${data.projects.length} ${t('stat_total')}`, color: 'var(--accent)' },
    { label: t('resources'), value: data.staff.length, sub: `${data.staff.filter(s => s.type === 'External').length} ${t('stat_external')}`, color: 'var(--purple)' },
    { label: t('overload_alerts'), value: overcap.length, sub: t('stat_month_resource'), color: overcap.length > 0 ? 'var(--danger)' : 'var(--success)' },
    { label: t('coverage_incomplete'), value: uncovered.length, sub: t('stat_uncovered_profiles'), color: uncovered.length > 0 ? 'var(--warning)' : 'var(--success)' },
  ];

  return (
    <div className="animate-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map(c => (
          <div key={c.label} className="card" style={{ borderLeft: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: c.color, fontFamily: 'JetBrains Mono, monospace' }}>{c.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t('capacity_vs_load')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t('first_12_months')}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onSubNav?.('capacity')}>{t('detail')}</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2}>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} itemStyle={{ color: 'var(--text)' }} labelStyle={{ color: 'var(--text-muted)' }} />
              <Bar dataKey="capacity" fill="rgba(124,92,191,0.2)" name={t('available_cap')} radius={[2,2,0,0]} />
              <Bar dataKey="allocated" fill="var(--accent)" name={t('allocated')} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>{t('portfolio_status')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(statusCounts).map(([status, count]) => {
              const color = statusColors[status] ?? 'var(--text-faint)';
              const pct = Math.round((count / data.projects.length) * 100);
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{t(STATUS_KEYS[status] ?? status) || status.replace(/^\d-/, '')}</span>
                    <span style={{ color, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {alerts.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>{t('top_alerts')}</div>
              {alerts.slice(0, 3).map((a, i) => (
                <div key={i} style={{ fontSize: 11, color: a.type === 'overcapacity' ? 'var(--danger)' : 'var(--warning)', marginBottom: 4 }}>
                  {a.type === 'overcapacity'
                    ? `↑ ${a.staffName} ${t('overload_alert').replace('{name}','').trim()} ${a.month} (+${a.value?.toFixed(0)}${t('days')})`
                    : `✗ ${a.projectName} — ${t('profile')} ${a.profile} ${a.month}`}
                </div>
              ))}
              {alerts.length > 3 && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, width: '100%' }} onClick={() => onSubNav?.('alerts')}>
                  {t('see_more_alerts').replace('{n}', String(alerts.length - 3))}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{t('ongoing_title')}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setView('projects')}>{t('see_all')}</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('project_name')}</th>
              <th>{t('domain')}</th>
              <th>{t('project_manager')}</th>
              <th>{t('priority')}</th>
              <th>{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {data.projects.filter(p => p.status === '3-In progress').slice(0, 5).map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td><span className="badge badge-blue">{p.domain}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{p.projectManager || '—'}</td>
                <td>{p.priority ? <span className="badge badge-gray">P{p.priority}</span> : '—'}</td>
                <td><span className={`badge ${STATUS_BADGE[p.status ?? ''] ?? 'badge-gray'}`}>{p.status?.replace(/^\d-/, '') ?? '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
