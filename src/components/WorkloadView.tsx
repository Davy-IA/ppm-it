'use client';
import { useState } from 'react';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { AppData, WorkloadEntry, AllocationEntry, MONTHS_2026_2028, PROFILES } from '@/types';
import { v4 as uuid } from 'uuid';
import { useSettings } from '@/lib/context';

interface Props { data: AppData; updateData: (d: AppData) => void; }

export default function WorkloadView({ data, updateData }: Props) {
  const { t, settings } = useSettings();
  const locale = settings.locale ?? 'fr';
  const [projectFilter, setProjectFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('2026');
  const [tab, setTab] = useState<'workload' | 'allocation'>('workload');
  const [editingWorkload, setEditingWorkload] = useState<WorkloadEntry | null>(null);
  const [editingAlloc, setEditingAlloc] = useState<AllocationEntry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [profileFilter, setProfileFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');


  const sc = (data as any).spaceConfig ?? {};
  const spaceProfiles: string[]    = sc.profiles    ?? settings.profiles    ?? PROFILES;
  const spaceDepartments: string[] = sc.departments ?? settings.departments ?? [];
  const months = MONTHS_2026_2028.filter(m => m.startsWith(yearFilter));

  const filteredProjects = data.projects.filter(p =>
    !projectFilter || p.id === projectFilter
  );
  const projectIds = filteredProjects.map(p => p.id);

  const filteredWorkloads = data.workloads.filter(w =>
    projectIds.includes(w.projectId) &&
    (!profileFilter || w.profile === profileFilter)
  );
  const filteredAllocs = data.allocations.filter(a =>
    projectIds.includes(a.projectId) &&
    (!profileFilter || a.profile === profileFilter) &&
    (!staffFilter || a.staffId === staffFilter) &&
    (!deptFilter || (data.staff.find(s => s.id === a.staffId)?.department ?? '') === deptFilter)
  );

  const updateWorkloadMonth = (id: string, month: string, value: string) => {
    const v = parseFloat(value);
    const workloads = data.workloads.map(w => w.id === id
      ? { ...w, monthly: { ...w.monthly, [month]: isNaN(v) ? 0 : v } }
      : w
    );
    updateData({ ...data, workloads });
  };

  const updateAllocMonth = (id: string, month: string, value: string) => {
    const v = parseFloat(value);
    const allocations = data.allocations.map(a => a.id === id
      ? { ...a, monthly: { ...a.monthly, [month]: isNaN(v) ? 0 : v } }
      : a
    );
    updateData({ ...data, allocations });
  };

  // --- Workload CRUD ---
  const saveWorkload = () => {
    if (!editingWorkload) return;
    const workloads = isNew
      ? [...data.workloads, { ...editingWorkload, id: uuid() }]
      : data.workloads.map(w => w.id === editingWorkload.id ? editingWorkload : w);
    updateData({ ...data, workloads });
    setEditingWorkload(null);
  };

  const deleteWorkload = (id: string) => {
    if (!confirm(t('delete_workload_confirm'))) return;
    updateData({ ...data, workloads: data.workloads.filter(w => w.id !== id) });
  };

  // --- Allocation CRUD ---
  const saveAlloc = () => {
    if (!editingAlloc) return;
    const allocations = isNew
      ? [...data.allocations, { ...editingAlloc, id: uuid() }]
      : data.allocations.map(a => a.id === editingAlloc.id ? editingAlloc : a);
    updateData({ ...data, allocations });
    setEditingAlloc(null);
  };

  const deleteAlloc = (id: string) => {
    if (!confirm(t('delete_alloc_confirm'))) return;
    updateData({ ...data, allocations: data.allocations.filter(a => a.id !== id) });
  };

  const updateMonthlyW = (month: string, val: string) => {
    if (!editingWorkload) return;
    const v = parseFloat(val);
    setEditingWorkload({ ...editingWorkload, monthly: { ...editingWorkload.monthly, [month]: isNaN(v) ? 0 : v } });
  };

  const updateMonthlyA = (month: string, val: string) => {
    if (!editingAlloc) return;
    const v = parseFloat(val);
    setEditingAlloc({ ...editingAlloc, monthly: { ...editingAlloc.monthly, [month]: isNaN(v) ? 0 : v } });
  };

  const monthLabel = (m: string) => formatMonth(m, locale);
  const activeFilters = [projectFilter, profileFilter, staffFilter, deptFilter].filter(Boolean).length;

  return (
    <div className="animate-in">
      <div className="page-sticky-header">
      {/* Filters + tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: showFilters ? 0 : 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={{ maxWidth: 280 }}>
          <option value="">{t('all_projects')}</option>
          {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ maxWidth: 100 }}>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
        </select>
        <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: 3, gap: 3 }}>
          <button className={`btn btn-sm ${tab === 'workload' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('workload')}>{t('planned_load')}</button>
          <button className={`btn btn-sm ${tab === 'allocation' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('allocation')}>{t('assignments')}</button>
        </div>
        {/* Advanced filters button */}
        <button onClick={() => setShowFilters(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${activeFilters > 0 ? 'var(--accent)' : 'var(--border)'}`, background: activeFilters > 0 ? 'var(--accent-subtle)' : 'var(--bg2)', color: activeFilters > 0 ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 3h11M3 6.5h7M5 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {t('filters_btn')}
          {activeFilters > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{activeFilters}</span>}
        </button>
        {activeFilters > 0 && (
          <button onClick={() => { setProjectFilter(''); setProfileFilter(''); setStaffFilter(''); setDeptFilter(''); }}
            style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            ✕ {t('clear_filters')}
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {tab === 'workload' && (
            <button className="btn btn-primary" onClick={() => {
              const proj = data.projects[0];
              setEditingWorkload({ id: '', projectId: proj?.id ?? '', projectName: proj?.name ?? '', profile: 'FUNC', monthly: {} });
              setIsNew(true);
            }}>{t('add_workload')}</button>
          )}
          {tab === 'allocation' && (
            <button className="btn btn-primary" onClick={() => {
              const proj = data.projects[0];
              const staff = data.staff[0];
              setEditingAlloc({ id: '', projectId: proj?.id ?? '', projectName: proj?.name ?? '', profile: 'FUNC', staffId: staff?.id ?? '', staffName: staff?.name ?? '', monthly: {} });
              setIsNew(true);
            }}>{t('add_allocation_btn')}</button>
          )}
        </div>
      </div>

      {/* Advanced filter panel */}
      {showFilters && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('profile')}</label>
            <select className="input" value={profileFilter} onChange={e => setProfileFilter(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">— {t('all')} —</option>
              {spaceProfiles.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {tab === 'allocation' && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('resource')}</label>
              <select className="input" value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={{ fontSize: 12 }}>
                <option value="">— {t('all')} —</option>
                {data.staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {tab === 'allocation' && (
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('field_dept')}</label>
              <select className="input" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ fontSize: 12 }}>
                <option value="">— {t('all')} —</option>
                {data.staff.map(s => s.department).filter((v, i, a) => v && a.indexOf(v) === i).sort().map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('project_name')}</label>
            <select className="input" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">— {t('all')} —</option>
              {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{t('year')}</label>
            <select className="input" value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ fontSize: 12 }}>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>
        </div>
      )}

      </div>

      {/* WORKLOAD TABLE */}
      {tab === 'workload' && (
        <div className="card" style={{ padding: 0, overflow: 'visible', marginTop: 16 }}>
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 170px)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-left" style={{ minWidth: 220 }}>{t('project_name')}</th>
                  <th>{t('profile')}</th>
                  {months.map(m => <th key={m} className="cap-cell">{monthLabel(m)}</th>)}
                  <th>{t('total')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkloads.length === 0 && (
                  <tr><td colSpan={months.length + 4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)' }}>{t('no_workload')}</td></tr>
                )}
                {filteredWorkloads.map(w => {
                  const totalRow = months.reduce((s, m) => s + (w.monthly[m] ?? 0), 0);
                  const proj = data.projects.find(p => p.id === w.projectId);
                  const projStart = proj?.startDate ?? null;
                  const projEnd = (proj as any)?.hypercare ?? proj?.goLive ?? null;
                  const hasDateRange = projStart && projEnd;
                  return (
                    <tr key={w.id}>
                      <td className="sticky-left" style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.projectName}</td>
                      <td><span className="badge badge-blue">{w.profile}</span></td>
                      {months.map(m => {
                        const need = w.monthly[m] ?? 0;
                        const covered = data.allocations
                          .filter(a => a.projectId === w.projectId && a.profile === w.profile)
                          .reduce((s, a) => s + (a.monthly[m] ?? 0), 0);
                        // Month in range?
                        const mStart = m + '-01';
                        const mEnd = m + '-31';
                        // If no dates → all blocked. If dates → only in-range is editable
                        const inRange = hasDateRange
                          ? mEnd >= projStart! && mStart <= projEnd!
                          : false;
                        const outOfRange = !inRange; // always out if no dates
                        const cls = outOfRange
                          ? 'cap-cell cap-zero'
                          : need === 0
                            ? 'cap-cell cap-in-range'
                            : covered >= need ? 'cap-cell cap-ok' : covered > 0 ? 'cap-cell cap-under' : 'cap-cell cap-over';
                        return (
                          <td key={m} className={cls + (outOfRange ? '' : ' cell-edit')}
                            title={outOfRange ? t('out_of_project_range') as string : `${t('workload_need')}: ${need}j | ${t('workload_covered')}: ${covered}j`}
                            onClick={outOfRange ? undefined : () => setInlineEdit({ id: w.id, field: 'w_' + m })}>
                            {!outOfRange && inlineEdit?.id === w.id && inlineEdit.field === 'w_' + m
                              ? <input type="number" min={0} step={0.5} className="cell-input" autoFocus defaultValue={need || ''}
                                  style={{ minWidth: 44, width: 50, textAlign: 'center' }}
                                  onBlur={e => { updateWorkloadMonth(w.id, m, e.target.value); setInlineEdit(null); }}
                                  onKeyDown={e => { if (e.key === 'Enter') { updateWorkloadMonth(w.id, m, (e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }}
                                  onClick={e => e.stopPropagation()} />
                              : <>
                                <span style={{ fontWeight: 700 }}>{need > 0 ? need : outOfRange ? '' : '—'}</span>
                                {need > 0 && covered > 0 && (
                                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1, fontWeight: 400 }}>
                                    {covered}{t('days_covered')}
                                  </div>
                                )}
                              </>
                            }
                          </td>
                        );
                      })}
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{totalRow > 0 ? `${totalRow}j` : '—'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteWorkload(w.id)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-faint)', display: 'flex', gap: 16 }}>
            <span style={{ color: 'var(--success)' }}>{`■ ${t('covered')}`}</span>
            <span style={{ color: 'var(--warning)' }}>{`■ ${t('partial')}`}</span>
            <span style={{ color: 'var(--danger)' }}>{`■ ${t('uncovered')}`}</span>
          </div>
        </div>
      )}

      {/* ALLOCATION TABLE */}
      {tab === 'allocation' && (
        <div className="card" style={{ padding: 0, overflow: 'visible', marginTop: 16 }}>
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 170px)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-left" style={{ minWidth: 220 }}>{t('project_name')}</th>
                  <th>{t('profile')}</th>
                  <th style={{ minWidth: 160 }}>{t('resource_col')}</th>
                  {months.map(m => <th key={m} className="cap-cell">{monthLabel(m)}</th>)}
                  <th>{t('total')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocs.length === 0 && (
                  <tr><td colSpan={months.length + 5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)' }}>{t('no_allocation')}</td></tr>
                )}
                {filteredAllocs.map(a => {
                  const staff = data.staff.find(s => s.id === a.staffId);
                  const totalRow = months.reduce((s, m) => s + (a.monthly[m] ?? 0), 0);
                  const proj = data.projects.find(p => p.id === a.projectId);
                  const projStart = proj?.startDate ?? null;
                  const projEnd = (proj as any)?.hypercare ?? proj?.goLive ?? null;
                  const hasDateRange = projStart && projEnd;
                  return (
                    <tr key={a.id}>
                      <td className="sticky-left" style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.projectName}</td>
                      <td><span className="badge badge-blue">{a.profile}</span></td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{a.staffName}</span>
                        {staff?.type === 'External' && <span className="badge badge-yellow" style={{ marginLeft: 6, fontSize: 10 }}>{t('col_ext')}</span>}
                      </td>
                      {months.map(m => {
                        const alloc = a.monthly[m] ?? 0;
                        const cap = staff?.capacity[m] ?? 0;
                        const mStart = m + '-01';
                        const mEnd = m + '-31';
                        const inRange = hasDateRange
                          ? mEnd >= projStart! && mStart <= projEnd!
                          : false;
                        const outOfRange = !inRange;
                        const cls = outOfRange
                          ? 'cap-cell cap-zero'
                          : alloc === 0
                            ? 'cap-cell cap-in-range'
                            : alloc > cap ? 'cap-cell cap-over' : 'cap-cell cap-ok';
                        return (
                          <td key={m} className={cls + (outOfRange ? '' : ' cell-edit')}
                            title={outOfRange ? t('out_of_project_range') as string : undefined}
                            onClick={outOfRange ? undefined : () => setInlineEdit({ id: a.id, field: 'a_' + m })}>
                            {!outOfRange && inlineEdit?.id === a.id && inlineEdit.field === 'a_' + m
                              ? <input type="number" min={0} step={0.5} className="cell-input" autoFocus defaultValue={alloc || ''}
                                  style={{ minWidth: 44, width: 50, textAlign: 'center' }}
                                  onBlur={e => { updateAllocMonth(a.id, m, e.target.value); setInlineEdit(null); }}
                                  onKeyDown={e => { if (e.key === 'Enter') { updateAllocMonth(a.id, m, (e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }}
                                  onClick={e => e.stopPropagation()} />
                              : <>
                                <span style={{ fontWeight: 700 }}>{alloc > 0 ? alloc : outOfRange ? '' : '—'}</span>
                                {!outOfRange && cap > 0 && (
                                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1, fontWeight: 400 }}>
                                    {cap}{t('days_available')}
                                  </div>
                                )}
                              </>
                            }
                          </td>
                        );
                      })}
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{totalRow > 0 ? `${totalRow}j` : '—'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteAlloc(a.id)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WORKLOAD MODAL */}
      {editingWorkload && (
        <div className="modal-overlay" onClick={() => setEditingWorkload(null)}>
          <div className="modal" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? t('new_workload') : t('edit_workload')}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingWorkload(null)}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_project_required')}</label>
                  <select className="input" value={editingWorkload.projectId} onChange={e => {
                    const p = data.projects.find(x => x.id === e.target.value);
                    setEditingWorkload({ ...editingWorkload, projectId: e.target.value, projectName: p?.name ?? '' });
                  }}>
                    {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_profile_required')}</label>
                  <select className="input" value={editingWorkload.profile} onChange={e => setEditingWorkload({ ...editingWorkload, profile: e.target.value })}>
                    {spaceProfiles.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {['2026', '2027', '2028'].map(year => (
                <div key={year} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>Charge {year} (jours)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
                    {MONTHS_2026_2028.filter(m => m.startsWith(year)).map(m => (
                      <div key={m} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{monthLabel(m)}</div>
                        <input type="number" min={0} step={1} className="input"
                          value={editingWorkload.monthly[m] ?? ''}
                          onChange={e => updateMonthlyW(m, e.target.value)}
                          style={{ textAlign: 'center', padding: '4px', fontFamily: 'DM Mono, monospace', fontSize: 13 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditingWorkload(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={saveWorkload}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATION MODAL */}
      {editingAlloc && (
        <div className="modal-overlay" onClick={() => setEditingAlloc(null)}>
          <div className="modal" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? t('new_assignment') : t('edit_assignment')}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingAlloc(null)}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_project_required')}</label>
                  <select className="input" value={editingAlloc.projectId} onChange={e => {
                    const p = data.projects.find(x => x.id === e.target.value);
                    setEditingAlloc({ ...editingAlloc, projectId: e.target.value, projectName: p?.name ?? '' });
                  }}>
                    {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_profile_required')}</label>
                  <select className="input" value={editingAlloc.profile} onChange={e => setEditingAlloc({ ...editingAlloc, profile: e.target.value })}>
                    {spaceProfiles.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_resource_required')}</label>
                  <select className="input" value={editingAlloc.staffId} onChange={e => {
                    const s = data.staff.find(x => x.id === e.target.value);
                    setEditingAlloc({ ...editingAlloc, staffId: e.target.value, staffName: s?.name ?? '' });
                  }}>
                    {data.staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.profile})</option>)}
                  </select>
                </div>
              </div>
              {/* Show staff capacity hint */}
              {editingAlloc.staffId && (
                <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('capacity_of_staff').replace('{name}', editingAlloc.staffName)}
                </div>
              )}
              {['2026', '2027', '2028'].map(year => (
                <div key={year} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>Affectation {year} (jours)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
                    {MONTHS_2026_2028.filter(m => m.startsWith(year)).map(m => {
                      const staff = data.staff.find(s => s.id === editingAlloc.staffId);
                      const cap = staff?.capacity[m] ?? 0;
                      const val = editingAlloc.monthly[m] ?? 0;
                      const isOver = val > cap && cap > 0;
                      return (
                        <div key={m} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>{monthLabel(m)}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 3 }}>/{cap}j</div>
                          <input type="number" min={0} max={cap || 31} step={1} className="input"
                            value={editingAlloc.monthly[m] ?? ''}
                            onChange={e => updateMonthlyA(m, e.target.value)}
                            style={{
                              textAlign: 'center', padding: '4px',
                              fontFamily: 'DM Mono, monospace', fontSize: 13,
                              borderColor: isOver ? 'var(--danger)' : undefined,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditingAlloc(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={saveAlloc}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
