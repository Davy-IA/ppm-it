'use client';
import { AppData, MONTHS_2026_2028 } from '@/types';
import { computeAlerts } from '@/lib/alerts';
import { View } from './App';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props { data: AppData; setView: (v: View) => void; }

export default function Dashboard({ data, setView }: Props) {
  const alerts = computeAlerts(data);
  const overcapAlerts = alerts.filter(a => a.type === 'overcapacity');
  const uncoveredAlerts = alerts.filter(a => a.type === 'uncovered');

  // Capacity chart data for next 12 months
  const now = new Date();
  const chartMonths = MONTHS_2026_2028.slice(0, 12);
  const chartData = chartMonths.map(month => {
    const totalCap = data.staff.reduce((s, st) => s + (st.capacity[month] ?? 0), 0);
    const totalAlloc = data.allocations.reduce((s, a) => s + (a.monthly[month] ?? 0), 0);
    const label = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    return { month: label, capacity: totalCap, allocated: totalAlloc, gap: totalCap - totalAlloc };
  });

  // Status distribution
  const statusCounts: Record<string, number> = {};
  for (const p of data.projects) {
    const s = p.status ?? 'Non défini';
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  const statCards = [
    { label: 'Projets actifs', value: data.projects.filter(p => p.status === '3-In progress').length, sub: `${data.projects.length} total`, color: 'var(--accent)' },
    { label: 'Ressources', value: data.staff.length, sub: `${data.staff.filter(s => s.type === 'External').length} externes`, color: 'var(--purple)' },
    { label: 'Alertes surcharge', value: overcapAlerts.length, sub: 'mois·ressource', color: overcapAlerts.length > 0 ? 'var(--danger)' : 'var(--success)' },
    { label: 'Couverture incomplète', value: uncoveredAlerts.length, sub: 'profils non couverts', color: uncoveredAlerts.length > 0 ? 'var(--warning)' : 'var(--success)' },
  ];

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Tableau de bord</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Vue globale du portefeuille projets et capacité IT</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map(c => (
          <div key={c.label} className="card" style={{ borderLeft: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: c.color, fontFamily: 'DM Mono, monospace' }}>{c.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Capacity chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Capacité vs Charge</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Jours/mois — 12 premiers mois</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setView('capacity')}>Détail →</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2}>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                itemStyle={{ color: 'var(--text)' }}
                labelStyle={{ color: 'var(--text-muted)' }}
              />
              <Bar dataKey="capacity" fill="rgba(61,126,255,0.25)" name="Capacité" radius={[2,2,0,0]} />
              <Bar dataKey="allocated" fill="var(--accent)" name="Alloué" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project status breakdown */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Statut portefeuille</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(statusCounts).map(([status, count]) => {
              const colors: Record<string, string> = {
                '1-To arbitrate': 'var(--text-muted)',
                '2-Validated': 'var(--accent)',
                '3-In progress': 'var(--success)',
                '4-Frozen': 'var(--warning)',
                '5-Completed': 'var(--purple)',
                '6-Aborted': 'var(--danger)',
              };
              const color = colors[status] ?? 'var(--text-faint)';
              const pct = Math.round((count / data.projects.length) * 100);
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{status.replace(/^\d-/, '')}</span>
                    <span style={{ color, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick alerts */}
          {alerts.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>⚠ Top alertes</div>
              {alerts.slice(0, 3).map((a, i) => (
                <div key={i} style={{ fontSize: 11, color: a.type === 'overcapacity' ? 'var(--danger)' : 'var(--warning)', marginBottom: 4 }}>
                  {a.type === 'overcapacity'
                    ? `↑ ${a.staffName} surchargé en ${a.month} (+${a.value?.toFixed(0)}j)`
                    : `✗ ${a.projectName} — profil ${a.profile} non couvert en ${a.month}`
                  }
                </div>
              ))}
              {alerts.length > 3 && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, width: '100%' }} onClick={() => setView('alerts')}>
                  Voir {alerts.length - 3} alertes de plus →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent projects */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Projets en cours</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setView('projects')}>Voir tout →</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Projet</th><th>Domaine</th><th>Chef de projet</th><th>Priorité</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.projects.filter(p => p.status === '3-In progress').slice(0, 5).map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td><span className="badge badge-blue">{p.domain}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{p.projectManager || '—'}</td>
                <td>{p.priority ? <span className="badge badge-gray">P{p.priority}</span> : '—'}</td>
                <td><span className="badge badge-green">En cours</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
