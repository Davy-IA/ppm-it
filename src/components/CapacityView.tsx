'use client';
import { useState } from 'react';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { AppData, MONTHS_2026_2028, PROFILES } from '@/types';
import { useSettings } from '@/lib/context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface Props { data: AppData; updateData: (d: AppData) => void; }

type ViewMode = 'staff' | 'project';

export default function CapacityView({ data }: Props) {
  const { t, settings } = useSettings();
  const locale = settings.locale ?? 'fr';
  const [yearFilter, setYearFilter] = useState('2026');
  const [viewMode, setViewMode] = useState<ViewMode>('staff');
  const [profileFilter, setProfileFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [staffFilterCapacity, setStaffFilterCapacity] = useState('');
  const [projectFilterCapacity, setProjectFilterCapacity] = useState('');
  // Staff view filters
  const [staffSearch, setStaffSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  // Project view filters
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('');
  const [projectDomainFilter, setProjectDomainFilter] = useState('');

  const months = MONTHS_2026_2028.filter(m => m.startsWith(yearFilter));
  const monthLabel = (m: string) => formatMonth(m, locale);

  // --- STAFF VIEW: capacity vs allocated per staff ---
  const staffRows = data.staff
    .filter(s => !profileFilter || s.profile === profileFilter)
    .filter(s => !staffSearch || s.name.toLowerCase().includes(staffSearch.toLowerCase()))
    .filter(s => !staffFilterCapacity || s.id === staffFilterCapacity)
    .filter(s => !deptFilter || s.department === deptFilter)
    .filter(s => !typeFilter || s.type === typeFilter)
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
  const projectRows = data.projects
    .filter(p => !projectFilterCapacity || p.id === projectFilterCapacity)
    .filter(p => !projectSearch || p.name.toLowerCase().includes(projectSearch.toLowerCase()))
    .filter(p => !projectStatusFilter || p.status === projectStatusFilter)
    .filter(p => !projectDomainFilter || p.domain === projectDomainFilter)
    .map(p => {
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



  // Chart data — respects active filters
  const chartData = months.map(m => {
    const label = monthLabel(m);
    // Filter staff for chart
    const activeStaff = staffRows; // already filtered
    const activeProjectIds = projectRows.map(p => p.id);

    const totalCap = viewMode === 'staff'
      ? activeStaff.reduce((s, st) => s + (st.capacity[m] ?? 0), 0)
      : data.staff
          .filter(s => !profileFilter || s.profile === profileFilter)
          .reduce((s, st) => s + (st.capacity[m] ?? 0), 0);

    const totalAlloc = viewMode === 'staff'
      ? data.allocations
          .filter(a => activeStaff.some(s => s.id === a.staffId))
          .reduce((s, a) => s + (a.monthly[m] ?? 0), 0)
      : data.allocations
          .filter(a => activeProjectIds.includes(a.projectId) && (!profileFilter || (data.workloads.find(w => w.projectId === a.projectId && w.profile === a.profile)?.profile === profileFilter)))
          .reduce((s, a) => s + (a.monthly[m] ?? 0), 0);

    const totalWork = viewMode === 'staff'
      ? data.workloads
          .filter(w => activeStaff.some(s => s.id) && (!profileFilter || w.profile === profileFilter))
          .reduce((s, w) => s + (w.monthly[m] ?? 0), 0)
      : data.workloads
          .filter(w => activeProjectIds.includes(w.projectId) && (!profileFilter || w.profile === profileFilter))
          .reduce((s, w) => s + (w.monthly[m] ?? 0), 0);

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

  const activeFilters =
    (viewMode === 'staff' ? [staffSearch, deptFilter, typeFilter] : [projectSearch, projectStatusFilter, projectDomainFilter])
    .filter(Boolean).length + (profileFilter ? 1 : 0) + (staffFilterCapacity ? 1 : 0) + (projectFilterCapacity ? 1 : 0);

  return (
    <div className="animate-in">
      <div className="page-sticky-header">
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: showFilters ? 0 : 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* View toggle — only By resource / By project */}
        <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: 3, gap: 3 }}>
          <button className={`btn btn-sm ${viewMode === 'staff' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setViewMode('staff'); setShowFilters(false); }}>{t('by_resource')}</button>
          <button className={`btn btn-sm ${viewMode === 'project' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setViewMode('project'); setShowFilters(false); }}>{t('by_project')}</button>
        </div>
        <select className="input" value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ maxWidth: 100 }}>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
        </select>

        {/* Contextual selects */}
        {viewMode === 'staff' && (
          <select className="input" value={staffFilterCapacity} onChange={e => setStaffFilterCapacity(e.target.value)} style={{ maxWidth: 190 }}>
            <option value="">{t('all_resources')}</option>
            {data.staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {viewMode === 'project' && (
          <select className="input" value={projectFilterCapacity} onChange={e => setProjectFilterCapacity(e.target.value)} style={{ maxWidth: 210 }}>
            <option value="">{t('all_projects')}</option>
            {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select className="input" value={profileFilter} onChange={e => setProfileFilter(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="">{t('all_profiles')}</option>
          {PROFILES.map(p => <option key={p}>{p}</option>)}
        </select>

        {/* Filter button — only for staff and project views */}
        <button onClick={() => setShowFilters(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${activeFilters > 0 ? 'var(--accent)' : 'var(--border)'}`, background: activeFilters > 0 ? 'var(--accent-subtle)' : 'var(--bg2)', color: activeFilters > 0 ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 3h11M3 6.5h7M5 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {t('filters_btn')}
            {activeFilters > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{activeFilters}</span>}
          </button>
        {activeFilters > 0 && (
          <button onClick={() => { setStaffSearch(''); setDeptFilter(''); setTypeFilter(''); setProjectSearch(''); setProjectStatusFilter(''); setProjectDomainFilter(''); setProfileFilter(''); setStaffFilterCapacity(''); setProjectFilterCapacity(''); }}
            style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            ✕ {t('clear_filters')}
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-faint)' }}>
          {viewMode === 'staff' ? `${staffRows.length} / ${data.staff.length} ${t('resources')}` :
           `${projectRows.length} ${t('projects_count')}`}
        </span>
      </div>

      {/* Advanced filter panel */}
      {showFilters && viewMode === 'staff' && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('search')}</label>
            <input className="input" value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder={t('search') as string} style={{ fontSize: 12 }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('field_dept')}</label>
            <select className="toolbar-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="">— {t('all')} —</option>
              {data.staff.map(s => s.department).filter((v, i, a) => v && a.indexOf(v) === i).sort().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('field_contract')}</label>
            <select className="toolbar-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">— {t('all')} —</option>
              <option value="Internal">{t('internal')}</option>
              <option value="External">{t('external_label')}</option>
            </select>
          </div>
        </div>
      )}

      {showFilters && viewMode === 'project' && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('search')}</label>
            <input className="input" value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder={t('search') as string} style={{ fontSize: 12 }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('status')}</label>
            <select className="toolbar-select" value={projectStatusFilter} onChange={e => setProjectStatusFilter(e.target.value)}>
              <option value="">— {t('all')} —</option>
              {['1-To arbitrate','2-Validated','3-In progress','4-Frozen','5-Completed','6-Aborted'].map(s => (
                <option key={s} value={s}>{s.replace(/^\d-/, '')}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('domain')}</label>
            <select className="toolbar-select" value={projectDomainFilter} onChange={e => setProjectDomainFilter(e.target.value)}>
              <option value="">— {t('all')} —</option>
              {['APPLI','INFRA','INNOV','DATA'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      )}

      </div>

      {/* Summary chart */}
      <div className="card card-table" style={{ marginBottom: 16, marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--text-muted)' }}>{t('summary_chart').replace('{year}', yearFilter)}</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={3} barSize={18}>
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="capacity" {...{name: String(t('chart_capacity_avail'))}} fill="rgba(61,126,255,0.25)" radius={[2,2,0,0]} />
            <Bar dataKey="workload" {...{name: String(t('chart_workload_need'))}} radius={[2,2,0,0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.gap < 0 ? 'rgba(239,68,68,0.6)' : 'rgba(124,92,191,0.5)'} />
              ))}
            </Bar>
            <Bar dataKey="allocated" {...{name: String(t('chart_allocated'))}} fill="rgba(16,185,129,0.75)" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 11, color: 'var(--text-faint)' }}>
          <span><span style={{ color: 'rgba(61,126,255,0.6)' }}>■</span> {t('chart_capacity_avail')}</span>
          <span><span style={{ color: 'rgba(124,92,191,0.6)' }}>■</span> {t('chart_workload_need')}</span>
          <span><span style={{ color: 'rgba(16,185,129,0.85)' }}>■</span> {t('chart_allocated')}</span>
          <span><span style={{ color: 'rgba(239,68,68,0.7)' }}>■</span> {t('overload')}</span>
        </div>
      </div>

      {/* STAFF GRID */}
      {viewMode === 'staff' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="utbl-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-left" style={{ minWidth: 200 }}>{t('resource_col')}</th>
                  <th>{t('profile')}</th>
                  {months.map(m => <th key={m} className="cap-cell">{monthLabel(m)}</th>)}
                  <th>{t('total_avail')}</th>
                  <th>{t('total_alloc')}</th>
                  <th>{t('rate')}</th>
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
                        {s.type === 'External' && <span className="badge badge-yellow" style={{ marginLeft: 6, fontSize: 10 }}>{t('col_ext')}</span>}
                      </td>
                      <td><span className="badge badge-blue">{s.profile}</span></td>
                      {months.map(m => {
                        const { cls, label } = cellColor(s.cap[m] ?? 0, s.alloc[m] ?? 0);
                        return (
                          <td key={m} className={cls} title={`${String(t('capacity_cap_alloc')).replace('{cap}', String(s.cap[m]??0)).replace('{alloc}', String(s.alloc[m]??0))}`}>
                            {label}
                          </td>
                        );
                      })}
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 13 }}>{totalCap}j</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 13 }}>{totalAlloc}j</td>
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
            <span style={{ color: 'var(--success)' }}>■ {t('legend_80')}</span>
            <span style={{ color: 'var(--warning)' }}>■ {t('legend_under')}</span>
            <span style={{ color: 'var(--danger)' }}>■ {t('legend_over')}</span>
            <span>{t('format_note')}</span>
          </div>
        </div>
      )}

      {/* PROJECT GRID */}
      {viewMode === 'project' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projectRows.map(p => (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{p.name}</span>
                <span className="badge badge-blue">{p.domain}</span>
                {p.status && <span className="badge badge-gray">{p.status.replace(/^\d-/, '')}</span>}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 80 }}>{t('col_profile')}</th>
                      <th style={{ minWidth: 80 }}>{t('col_line')}</th>
                      {months.map(m => <th key={m} className="cap-cell">{monthLabel(m)}</th>)}
                      <th>{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROFILES.filter(prof => months.some(m => (p.wloads[prof][m] ?? 0) > 0 || (p.allocs[prof][m] ?? 0) > 0)).map(prof => (
                      <>
                        <tr key={`${p.id}-${prof}-w`} style={{ background: 'rgba(61,126,255,0.04)' }}>
                          <td rowSpan={2} style={{ fontWeight: 600 }}><span className="badge badge-blue">{prof}</span></td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('need')}</td>
                          {months.map(m => {
                            const need = p.wloads[prof][m] ?? 0;
                            return <td key={m} className="cap-cell" style={{ color: need > 0 ? 'var(--text)' : 'var(--text-faint)' }}>{need > 0 ? need : '—'}</td>;
                          })}
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600 }}>
                            {months.reduce((s, m) => s + (p.wloads[prof][m] ?? 0), 0)}j
                          </td>
                        </tr>
                        <tr key={`${p.id}-${prof}-a`}>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('allocated')}</td>
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
              {t('no_activity_year', { year: yearFilter })}
            </div>
          )}
        </div>
      )}


    </div>
  );
}