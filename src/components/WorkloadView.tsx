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

  const months = MONTHS_2026_2028.filter(m => m.startsWith(yearFilter));

  const filteredProjects = data.projects.filter(p =>
    !projectFilter || p.id === projectFilter
  );
  const projectIds = filteredProjects.map(p => p.id);

  const filteredWorkloads = data.workloads.filter(w =>
    projectIds.includes(w.projectId)
  );
  const filteredAllocs = data.allocations.filter(a =>
    projectIds.includes(a.projectId)
  );

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

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('workload_title')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {t('workload_subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
            }}>+ Affecter ressource</button>
          )}
        </div>
      </div>

      {/* Filters + tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="input" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={{ maxWidth: 300 }}>
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
      </div>

      {/* WORKLOAD TABLE */}
      {tab === 'workload' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
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
                  // Coverage per month
                  const totalRow = months.reduce((s, m) => s + (w.monthly[m] ?? 0), 0);
                  return (
                    <tr key={w.id}>
                      <td className="sticky-left" style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.projectName}</td>
                      <td><span className="badge badge-blue">{w.profile}</span></td>
                      {months.map(m => {
                        const need = w.monthly[m] ?? 0;
                        const covered = data.allocations
                          .filter(a => a.projectId === w.projectId && a.profile === w.profile)
                          .reduce((s, a) => s + (a.monthly[m] ?? 0), 0);
                        const cls = need === 0 ? 'cap-cell cap-zero' : covered >= need ? 'cap-cell cap-ok' : covered > 0 ? 'cap-cell cap-under' : 'cap-cell cap-over';
                        return (
                          <td key={m} className={cls} title={`Besoin: ${need}j | Couvert: ${covered}j`}>
                            {need > 0 ? need : '—'}
                          </td>
                        );
                      })}
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{totalRow > 0 ? `${totalRow}j` : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditingWorkload({ ...w }); setIsNew(false); }}>{t('edit_btn')}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteWorkload(w.id)}>✕</button>
                        </div>
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
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
                        const cls = alloc === 0 ? 'cap-cell cap-zero' : alloc > cap ? 'cap-cell cap-over' : 'cap-cell cap-ok';
                        return (
                          <td key={m} className={cls}>
                            {alloc > 0 ? alloc : '—'}
                          </td>
                        );
                      })}
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{totalRow > 0 ? `${totalRow}j` : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditingAlloc({ ...a }); setIsNew(false); }}>{t('edit_btn')}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteAlloc(a.id)}>✕</button>
                        </div>
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
                    {PROFILES.map(p => <option key={p}>{p}</option>)}
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
                    {PROFILES.map(p => <option key={p}>{p}</option>)}
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
