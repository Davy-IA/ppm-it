'use client';
import { useState } from 'react';
import { AppData, MONTHS_2026_2028, PROFILES } from '@/types';
import { useSettings } from '@/lib/context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface Props { data: AppData; updateData: (d: AppData) => void; }

type ViewMode = 'staff' | 'project' | 'profile';

export default function CapacityView({ data }: Props) {
  const { t } = useSettings();
  const [yearFilter, setYearFilter] = useState('2026');
  const [viewMode, setViewMode] = useState<ViewMode>('staff');
  const [profileFilter, setProfileFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const months = MONTHS_2026_2028.filter(m => m.startsWith(yearFilter));
  const monthLabel = (m: string) => new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short' });

  // --- STAFF VIEW: capacity vs allocated per staff ---
  const staffRows = data.staff
    .filter(s => !profileFilter || s.profile === profileFilter)
    .map(s => {
      const rowData: Record<string, number> = {};
      const allocData: Record<string, number> = {};
      months.forEach(m => {
        rowData[m] = s.capacity[m] ?? 0;
        allocData[m] = data.allocations
          .filter(a => a.staffId === s.id)
          .reduce((sum, a) => sum + (a.monthly[m] ?? 0), 0);
      });
      return { ...s, cap: rowData, alloc: allocData };
    });

  // --- PROJECT VIEW: workload vs allocated per project ---
  const projectRows = data.projects.map(p => {
    const wloads: Record<string, Record<string, number>> = {};
    const allocs: Record<string, Record<string, number>> = {};
    PROFILES.forEach(prof => {
      wloads[prof] = {};
      allocs[prof] = {};
      months.forEach(m => {
        wloads[prof][m] = data.workloads
          .filter(w => w.projectId === p.id && w.profile === prof)
          .reduce((s, w) => s + (w.monthly[m] ?? 0), 0);
        allocs[prof][m] = data.allocations
          .filter(a => a.projectId === p.id && a.profile === prof)
          .reduce((s, a) => s + (a.monthly[m] ?? 0), 0);
      });
    });
    const hasActivity = months.some(m =>
      PROFILES.some(prof => (wloads[prof][m] ?? 0) > 0 || (allocs[prof][m] ?? 0) > 0)
    );
    return { ...p, wloads, allocs, hasActivity };
  }).filter(p => p.hasActivity);

  // --- PROFILE VIEW: aggregated capacity vs demand per profile ---
  const profileRows = (profileFilter ? [profileFilter] : PROFILES).map(prof => {
    const totalCap: Record<string, number> = {};
    const totalAlloc: Record<string, number> = {};
    const totalWorkload: Record<string, number> = {};
    months.forEach(m => {
      totalCap[m] = data.staff
        .filter(s => s.profile === prof)
        .reduce((s, st) => s + (st.capacity[m] ?? 0), 0);
      totalAlloc[m] = data.allocations
        .filter(a => {
          const staff = data.staff.find(s => s.id === a.staffId);
          return staff?.profile === prof;
        })
        .reduce((s, a) => s + (a.monthly[m] ?? 0), 0);
      totalWorkload[m] = data.workloads
        .filter(w => w.profile === prof)
        .reduce((s, w) => s + (w.monthly[m] ?? 0), 0);
    });
    return { profile: prof, cap: totalCap, alloc: totalAlloc, workload: totalWorkload };
  }).filter(r => months.some(m => r.cap[m] > 0 || r.workload[m] > 0));

  // Chart data for selected profile or global
  const chartData = months.map(m => {
    const label = monthLabel(m);
    if (viewMode === 'profile' && profileFilter) {
      const row = profileRows.find(r => r.profile === profileFilter);
      return { month: label, capacity: row?.cap[m] ?? 0, workload: row?.workload[m] ?? 0, gap: (row?.cap[m] ?? 0) - (row?.workload[m] ?? 0) };
    }
    const totalCap = data.staff.reduce((s, st) => s + (st.capacity[m] ?? 0), 0);
    const totalAlloc = data.allocations.reduce((s, a) => s + (a.monthly[m] ?? 0), 0);
    const totalWork = data.workloads.reduce((s, w) => s + (w.monthly[m] ?? 0), 0);
    return { month: label, capacity: totalCap, workload: totalWork, allocated: totalAlloc, gap: totalCap - totalWork };
  });

  const cellColor = (cap: number, alloc: number) => {
    if (cap === 0) return { cls: 'cap-cell cap-zero', label: '—' };
    if (alloc > cap) return { cls: 'cap-cell cap-over', label: `${alloc}/${cap}` };
    if (alloc === 0) return { cls: 'cap-cell cap-zero', label: `0/${cap}` };
    const pct = alloc / cap;
    if (pct >= 0.8) return { cls: 'cap-cell cap-ok', label: `${alloc}/${cap}` };
    return { cls: 'cap-cell cap-under', label: `${alloc}/${cap}` };
  };

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Plan de capacité</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Analyse capacité disponible vs charge projet</p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: 3, gap: 3 }}>
          {(['staff', 'project', 'profile'] as ViewMode[]).map(m => (
            <button key={m} className={`btn btn-sm ${viewMode === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode(m)}>
              {m === 'staff' ? t('by_resource') : m === 'project' ? t('by_project') : t('by_profile')}
            </button>
          ))}
        </div>
        <select className="input" value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ maxWidth: 100 }}>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
        </select>
        <select className="input" value={profileFilter} onChange={e => setProfileFilter(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">{t('filter_all_profiles')}</option>
          {PROFILES.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Summary chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--text-muted)' }}>Vue synthétique {yearFilter} — Capacité vs Besoin (jours)</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={3} barSize={18}>
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="capacity" name="Capacité dispo" fill="rgba(61,126,255,0.25)" radius={[2,2,0,0]} />
            <Bar dataKey="workload" name="Besoin charge" radius={[2,2,0,0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.gap < 0 ? 'var(--danger)' : 'var(--success)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 11, color: 'var(--text-faint)' }}>
          <span><span style={{ color: 'rgba(61,126,255,0.6)' }}>■</span> Capacité disponible</span>
          <span><span style={{ color: 'var(--success)' }}>■</span> Charge couverte</span>
          <span><span style={{ color: 'var(--danger)' }}>■</span> Surcharge / Besoin dépassé</span>
        </div>
      </div>

      {/* STAFF GRID */}
      {viewMode === 'staff' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-left" style={{ minWidth: 200 }}>Ressource</th>
                  <th>{t('col_profile')}</th>
                  {months.map(m => <th key={m} className="cap-cell">{monthLabel(m)}</th>)}
                  <th>{t('col_total_avail')}</th>
                  <th>{t('col_total_alloc')}</th>
                  <th>{t('col_rate')}</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map(s => {
                  const totalCap = months.reduce((sum, m) => sum + (s.cap[m] ?? 0), 0);
                  const totalAlloc = months.reduce((sum, m) => sum + (s.alloc[m] ?? 0), 0);
                  const taux = totalCap > 0 ? Math.round((totalAlloc / totalCap) * 100) : 0;
                  return (
                    <tr key={s.id}>
                      <td className="sticky-left" style={{ fontWeight: 500 }}>
                        {s.name}
                        {s.type === 'External' && <span className="badge badge-yellow" style={{ marginLeft: 6, fontSize: 10 }}>Ext.</span>}
                      </td>
                      <td><span className="badge badge-blue">{s.profile}</span></td>
                      {months.map(m => {
                        const { cls, label } = cellColor(s.cap[m] ?? 0, s.alloc[m] ?? 0);
                        return (
                          <td key={m} className={cls} title={`Cap: ${s.cap[m]}j | Alloué: ${s.alloc[m]}j`}>
                            {label}
                          </td>
                        );
                      })}
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{totalCap}j</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{totalAlloc}j</td>
                      <td>
                        <span className={`badge ${taux > 100 ? 'badge-red' : taux >= 70 ? 'badge-green' : taux > 0 ? 'badge-yellow' : 'badge-gray'}`}>
                          {taux}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-faint)', display: 'flex', gap: 16 }}>
            <span style={{ color: 'var(--success)' }}>■ ≥80% utilisé</span>
            <span style={{ color: 'var(--warning)' }}>■ Sous-utilisé</span>
            <span style={{ color: 'var(--danger)' }}>■ Surchargé</span>
            <span>Format: alloué/capacité (jours)</span>
          </div>
        </div>
      )}

      {/* PROJECT GRID */}
      {viewMode === 'project' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projectRows.map(p => (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                <span className="badge badge-blue">{p.domain}</span>
                {p.status && <span className="badge badge-gray">{p.status.replace(/^\d-/, '')}</span>}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 80 }}>Profil</th>
                      <th style={{ minWidth: 80 }}>Ligne</th>
                      {months.map(m => <th key={m} className="cap-cell">{monthLabel(m)}</th>)}
                      <th>{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROFILES.filter(prof => months.some(m => (p.wloads[prof][m] ?? 0) > 0 || (p.allocs[prof][m] ?? 0) > 0)).map(prof => (
                      <>
                        <tr key={`${p.id}-${prof}-w`} style={{ background: 'rgba(61,126,255,0.04)' }}>
                          <td rowSpan={2} style={{ fontWeight: 600 }}><span className="badge badge-blue">{prof}</span></td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('col_need')}</td>
                          {months.map(m => {
                            const need = p.wloads[prof][m] ?? 0;
                            return <td key={m} className="cap-cell" style={{ color: need > 0 ? 'var(--text)' : 'var(--text-faint)' }}>{need > 0 ? need : '—'}</td>;
                          })}
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600 }}>
                            {months.reduce((s, m) => s + (p.wloads[prof][m] ?? 0), 0)}j
                          </td>
                        </tr>
                        <tr key={`${p.id}-${prof}-a`}>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('col_allocated')}</td>
                          {months.map(m => {
                            const need = p.wloads[prof][m] ?? 0;
                            const alloc = p.allocs[prof][m] ?? 0;
                            const cls = need === 0 ? 'cap-cell cap-zero' : alloc >= need ? 'cap-cell cap-ok' : alloc > 0 ? 'cap-cell cap-under' : 'cap-cell cap-over';
                            return <td key={m} className={cls}>{alloc > 0 ? alloc : '—'}</td>;
                          })}
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--success)' }}>
                            {months.reduce((s, m) => s + (p.allocs[prof][m] ?? 0), 0)}j
                          </td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {projectRows.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 48 }}>
              Aucun projet avec des données de charge pour {yearFilter}
            </div>
          )}
        </div>
      )}

      {/* PROFILE GRID */}
      {viewMode === 'profile' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 100 }}>Profil</th>
                  <th style={{ minWidth: 100 }}>Métrique</th>
                  {months.map(m => <th key={m} className="cap-cell">{monthLabel(m)}</th>)}
                  <th>{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {profileRows.map(r => (
                  <>
                    <tr key={`${r.profile}-cap`}>
                      <td rowSpan={3} style={{ fontWeight: 700 }}><span className="badge badge-purple">{r.profile}</span></td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('col_capacity')}</td>
                      {months.map(m => (
                        <td key={m} className="cap-cell" style={{ color: 'var(--text)' }}>{r.cap[m] > 0 ? r.cap[m] : '—'}</td>
                      ))}
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600 }}>
                        {months.reduce((s, m) => s + r.cap[m], 0)}j
                      </td>
                    </tr>
                    <tr key={`${r.profile}-wl`}>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('col_need')}</td>
                      {months.map(m => {
                        const need = r.workload[m] ?? 0;
                        const cap = r.cap[m] ?? 0;
                        const cls = need === 0 ? 'cap-cell cap-zero' : need > cap ? 'cap-cell cap-over' : 'cap-cell';
                        return <td key={m} className={cls}>{need > 0 ? need : '—'}</td>;
                      })}
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
                        {months.reduce((s, m) => s + r.workload[m], 0)}j
                      </td>
                    </tr>
                    <tr key={`${r.profile}-gap`} style={{ borderBottom: '2px solid var(--border)' }}>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('col_gap')}</td>
                      {months.map(m => {
                        const gap = (r.cap[m] ?? 0) - (r.workload[m] ?? 0);
                        const cls = gap < 0 ? 'cap-cell cap-over' : gap > 5 ? 'cap-cell cap-zero' : 'cap-cell cap-ok';
                        return <td key={m} className={cls}>{gap !== 0 ? (gap > 0 ? `+${gap}` : gap) : '—'}</td>;
                      })}
                      <td>
                        {(() => {
                          const gap = months.reduce((s, m) => s + (r.cap[m] ?? 0) - (r.workload[m] ?? 0), 0);
                          return <span className={`badge ${gap < 0 ? 'badge-red' : 'badge-green'}`}>{gap > 0 ? `+${gap}` : gap}j</span>;
                        })()}
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
