'use client';
import { useState } from 'react';
import { AppData, Project, DOMAINS, REQUEST_TYPES, STATUSES, DEPARTMENTS, COUNTRIES, SPONSORS } from '@/types';
import { v4 as uuid } from 'uuid';
import { useSettings } from '@/lib/context';
import ConfirmDialog from './ConfirmDialog';

interface Props { data: AppData; updateData: (d: AppData) => void; setView?: (v: string) => void; onNavigateToPlanning?: (projectId: string) => void; }

const STATUS_BADGE: Record<string, string> = {
  '1-To arbitrate': 'badge-gray', '2-Validated': 'badge-blue',
  '3-In progress': 'badge-green', '4-Frozen': 'badge-yellow',
  '5-Completed': 'badge-purple', '6-Aborted': 'badge-red',
};

const EMPTY_PROJECT: Omit<Project, 'id'> = {
  name: '', domain: 'APPLI', requestType: 'IT Project', leadDept: 'IT',
  leadCountry: 'FR', sponsor: '', projectManager: '', priority: null,
  complexity: null, roi: null, status: '2-Validated', startDate: null, goLive: null, hypercare: null,
};



export default function ProjectsView({ data, updateData, setView, onNavigateToPlanning }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState<Record<string, string>>({});

  const setAdv = (key: string, val: string) =>
    setAdvFilters(prev => val ? { ...prev, [key]: val } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));

  const activeFilterCount = Object.keys(advFilters).length + (statusFilter ? 1 : 0) + (domainFilter ? 1 : 0);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const { t, settings } = useSettings();

  // Use space-level overrides if defined, else fall back to global settings, then hardcoded defaults
  const sc = (data as any).spaceConfig ?? {};
  const spaceDomains: string[]      = sc.domains       ?? settings.domains       ?? DOMAINS;
  const spaceRequestTypes: string[] = sc.requestTypes  ?? settings.requestTypes  ?? REQUEST_TYPES;
  const spaceStatuses: string[]     = sc.statuses      ?? settings.statuses      ?? STATUSES;
  const spaceDepartments: string[]  = sc.departments   ?? settings.departments   ?? DEPARTMENTS;
  const spaceCountries: string[]    = sc.countries     ?? settings.countries     ?? COUNTRIES;
  const spaceSponsors: string[]     = sc.sponsors      ?? settings.sponsors      ?? SPONSORS;

  const [editing, setEditing] = useState<Project | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [ganttTimeScale, setGanttTimeScale] = useState<'week' | 'month' | 'semester' | 'year'>('month');
  const [showGanttScaleMenu, setShowGanttScaleMenu] = useState(false);
  const [ganttScale, setGanttScale] = useState<'week' | 'month' | 'semester' | 'year'>('month');
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string } | null>(null);

  const updateField = (id: string, field: string, value: any) => {
    const projects = data.projects.map(p => p.id === id ? { ...p, [field]: value || null } : p);
    // If renaming, propagate to workloads and allocations
    if (field === 'name' && value) {
      const workloads = data.workloads.map(w => w.projectId === id ? { ...w, projectName: value } : w);
      const allocations = data.allocations.map(a => a.projectId === id ? { ...a, projectName: value } : a);
      updateData({ ...data, projects, workloads, allocations });
    } else {
      updateData({ ...data, projects });
    }
  };

  const filtered = data.projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.projectManager ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchDomain = !domainFilter || p.domain === domainFilter;
    const matchAdv = Object.entries(advFilters).every(([key, val]) => {
      const pVal = String((p as any)[key] ?? '').toLowerCase();
      return pVal.includes(val.toLowerCase());
    });
    return matchSearch && matchStatus && matchDomain && matchAdv;
  });

  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  const save = (andPlan = false) => {
    if (!editing) return;
    let projects;
    let newId = editing.id;
    if (isNew) {
      newId = uuid();
      projects = [...data.projects, { ...editing, id: newId }];
    } else {
      projects = data.projects.map(p => p.id === editing.id ? editing : p);
    }
    // Propagate name change to workloads and allocations (denormalized projectName)
    const workloads = data.workloads.map(w =>
      w.projectId === editing.id ? { ...w, projectName: editing.name } : w
    );
    const allocations = data.allocations.map(a =>
      a.projectId === editing.id ? { ...a, projectName: editing.name } : a
    );
    updateData({ ...data, projects, workloads, allocations });
    setEditing(null);
    if (andPlan && onNavigateToPlanning) {
      onNavigateToPlanning(newId);
    }
  };

  const remove = (id: string) => {
    if (!confirm(t('delete_confirm'))) return;
    const projects = data.projects.filter(p => p.id !== id);
    const workloads = data.workloads.filter(w => w.projectId !== id);
    const allocations = data.allocations.filter(a => a.projectId !== id);
    updateData({ ...data, projects, workloads, allocations });
  };

  const pmOptions = data.staff.map(s => s.name);

  return (
    <div className="animate-in">
      <div className="page-sticky-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="input" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 155 }}>
            <option value="">{t('all_statuses')}</option>
            {spaceStatuses.map(s => <option key={s} value={s}>{s.replace(/^\d-/, '')}</option>)}
          </select>
          <select className="input" value={domainFilter} onChange={e => setDomainFilter(e.target.value)} style={{ maxWidth: 120 }}>
            <option value="">{t('all_domains')}</option>
            {spaceDomains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => setShowFilters(f => !f)}
            className={`toolbar-btn${activeFilterCount > 0 ? ' active' : ''}`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 3h11M3 6.5h7M5 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {t('filters_btn')}
            {activeFilterCount > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={() => { setAdvFilters({}); setStatusFilter(''); setDomainFilter(''); }}
              style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              ✕ {t('clear_filters')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          {/* Gantt scale selector — only in gantt mode */}
          {viewMode === 'gantt' && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowGanttScaleMenu(m => !m)}
                className="toolbar-btn">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M1 3h10M1 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                {ganttScale === 'week' ? String(t('scale_week')) : ganttScale === 'month' ? String(t('scale_month')) : ganttScale === 'semester' ? String(t('scale_semester')) : String(t('scale_year'))}
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              </button>
              {showGanttScaleMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowGanttScaleMenu(false)} />
                  <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(124,92,191,0.15)', zIndex: 50, overflow: 'hidden', minWidth: 140 }}>
                    {(['week', 'month', 'semester', 'year'] as const).map(scale => (
                      <button key={scale} onClick={() => { setGanttScale(scale); setShowGanttScaleMenu(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: ganttScale === scale ? 'var(--accent-subtle)' : 'none', color: ganttScale === scale ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: ganttScale === scale ? 700 : 400, fontFamily: 'inherit', textAlign: 'left' as const }}>
                        {ganttScale === scale && <span style={{ color: 'var(--accent)', fontSize: 10 }}>✓</span>}
                        {scale === 'week' ? String(t('scale_week')) : scale === 'month' ? String(t('scale_month')) : scale === 'semester' ? String(t('scale_semester')) : String(t('scale_year'))}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setViewMode('list')} className={`toolbar-btn${viewMode === 'list' ? ' primary' : ''}`}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="2" rx="1" fill="currentColor"/><rect x="1" y="5" width="11" height="2" rx="1" fill="currentColor"/><rect x="1" y="9" width="11" height="2" rx="1" fill="currentColor"/></svg>
              {t('view_list')}
            </button>
            <button onClick={() => setViewMode('gantt')} className={`toolbar-btn${viewMode === 'gantt' ? ' primary' : ''}`}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="5" height="3" rx="1" fill="currentColor" opacity="0.5"/><rect x="1" y="5" width="8" height="3" rx="1" fill="currentColor"/><rect x="1" y="9" width="6" height="3" rx="1" fill="currentColor" opacity="0.7"/></svg>
              {t('view_gantt')}
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing({ id: '', ...EMPTY_PROJECT }); setIsNew(true); }}>
            {t('new_project')}
          </button>
        </div>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { key: 'requestType', label: t('type'), opts: spaceRequestTypes },
            { key: 'leadDept', label: t('lead_dept'), opts: spaceDepartments },
            { key: 'leadCountry', label: t('country'), opts: spaceCountries },
            { key: 'sponsor', label: t('field_sponsor'), opts: spaceSponsors },
            { key: 'projectManager', label: t('project_manager'), opts: data.projects.map(p => p.projectManager).filter((v, i, a) => v && a.indexOf(v) === i) as string[] },
            { key: 'priority', label: t('priority'), opts: ['1','2','3','4','5'] },
            { key: 'complexity', label: t('complexity'), opts: ['1','2','3','4','5'] },
          ].map(({ key, label, opts }) => (
            <div key={key}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{label}</label>
              <select className="input" value={advFilters[key] ?? ''} onChange={e => setAdv(key, e.target.value)} style={{ fontSize: 12 }}>
                <option value="">— {t('all')} —</option>
                {opts.map(o => <option key={o} value={o}>{key === 'priority' ? `P${o}` : key === 'complexity' ? `C${o}` : o}</option>)}
              </select>
            </div>
          ))}
          {/* Free text filters */}
          {[
            { key: 'name', label: t('project_name') },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{label}</label>
              <input className="input" value={advFilters[key] ?? ''} onChange={e => setAdv(key, e.target.value)} placeholder={`Filter...`} style={{ fontSize: 12 }} />
            </div>
          ))}
        </div>
      )}

      {/* Gantt Portfolio View */}
      {viewMode === 'gantt' && <PortfolioGantt data={data} filtered={filtered} t={t} timeScale={ganttScale} />}

      {/* Table — same structure as Workload (proven working) */}
      {viewMode === 'list' && (
        <div className="card card-table" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
          <div className="utbl-wrap" style={{ maxHeight: 'calc(100vh - 190px)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-left" style={{ minWidth: 240 }}>{t('project_name')}</th>
                  <th>{t('domain')}</th>
                  <th>{t('type')}</th>
                  <th>{t('lead_dept')}</th>
                  <th>{t('sponsor')}</th>
                  <th>{t('project_manager')}</th>
                  <th>{t('priority')}</th>
                  <th>{t('complexity')}</th>
                  <th>{t('status')}</th>
                  <th>{t('start_date')}</th>
                  <th>{t('go_live')}</th>
                  <th>{t('hypercare_date')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={13} style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)' }}>{t('no_projects')}</td></tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="sticky-left cell-edit" style={{ fontWeight: 600 }} onClick={() => setInlineEdit({ id: p.id, field: 'name' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'name'
                        ? <input className="cell-input" autoFocus defaultValue={p.name}
                            onBlur={e => { updateField(p.id, 'name', e.target.value); setInlineEdit(null); }}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { if (e.key === 'Enter') updateField(p.id, 'name', (e.target as HTMLInputElement).value); setInlineEdit(null); } }}
                            onClick={e => e.stopPropagation()} style={{ minWidth: 180 }} />
                        : <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap', maxWidth: 220 }}>{p.name}</span>
                      }
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'domain' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'domain'
                        ? <select className="cell-select" autoFocus defaultValue={p.domain} onChange={e => { updateField(p.id, 'domain', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>{spaceDomains.map(d => <option key={d} value={d}>{d}</option>)}</select>
                        : p.domain || <span style={{color:'var(--text-faint)'}}>—</span>}
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'requestType' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'requestType'
                        ? <select className="cell-select" autoFocus defaultValue={p.requestType} onChange={e => { updateField(p.id, 'requestType', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>{spaceRequestTypes.map(r => <option key={r} value={r}>{r}</option>)}</select>
                        : p.requestType || <span style={{color:'var(--text-faint)'}}>—</span>}
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'leadDept' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'leadDept'
                        ? <select className="cell-select" autoFocus defaultValue={p.leadDept} onChange={e => { updateField(p.id, 'leadDept', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>{spaceDepartments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                        : p.leadDept || <span style={{color:'var(--text-faint)'}}>—</span>}
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'sponsor' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'sponsor'
                        ? <select className="cell-select" autoFocus defaultValue={p.sponsor ?? ''} onChange={e => { updateField(p.id, 'sponsor', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}><option value="">—</option>{spaceSponsors.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        : p.sponsor || <span style={{color:'var(--text-faint)'}}>—</span>}
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'projectManager' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'projectManager'
                        ? <><input className="cell-input" autoFocus defaultValue={p.projectManager ?? ''} list={`pm-${p.id}`}
                            onBlur={e => { updateField(p.id, 'projectManager', e.target.value); setInlineEdit(null); }}
                            onKeyDown={e => { if (e.key === 'Enter') { updateField(p.id, 'projectManager', (e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }}
                            onClick={e => e.stopPropagation()} style={{ minWidth: 130 }} />
                          <datalist id={`pm-${p.id}`}>{data.staff.map(s => <option key={s.id} value={s.name} />)}</datalist></>
                        : p.projectManager || <span style={{color:'var(--text-faint)'}}>—</span>}
                    </td>
                    <td className="cell-edit" style={{ textAlign: 'center' }} onClick={() => setInlineEdit({ id: p.id, field: 'priority' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'priority'
                        ? <select className="cell-select" autoFocus defaultValue={p.priority ?? ''} onChange={e => { updateField(p.id, 'priority', e.target.value ? Number(e.target.value) : null); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()} style={{ width: 55 }}><option value="">—</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>P{n}</option>)}</select>
                        : p.priority ? `P${p.priority}` : <span style={{color:'var(--text-faint)'}}>—</span>}
                    </td>
                    <td className="cell-edit" style={{ textAlign: 'center' }} onClick={() => setInlineEdit({ id: p.id, field: 'complexity' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'complexity'
                        ? <select className="cell-select" autoFocus defaultValue={p.complexity ?? ''} onChange={e => { updateField(p.id, 'complexity', e.target.value ? Number(e.target.value) : null); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()} style={{ width: 55 }}><option value="">—</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>C{n}</option>)}</select>
                        : p.complexity ? `C${p.complexity}` : <span style={{color:'var(--text-faint)'}}>—</span>}
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'status' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'status'
                        ? <select className="cell-select" autoFocus defaultValue={p.status ?? ''} onChange={e => { updateField(p.id, 'status', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}><option value="">—</option>{spaceStatuses.map(s => <option key={s} value={s}>{s.replace(/^\d-/, '')}</option>)}</select>
                        : p.status ? <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-gray'}`}>{p.status.replace(/^\d-/, '')}</span> : <span style={{color:'var(--text-faint)'}}>—</span>}
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'startDate' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'startDate'
                        ? <input type="date" className="cell-input" autoFocus defaultValue={p.startDate ?? ''} onBlur={e => { updateField(p.id, 'startDate', e.target.value); setInlineEdit(null); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEdit(null); }} onClick={e => e.stopPropagation()} style={{ minWidth: 120 }} />
                        : <span style={{color:'var(--text-muted)'}}>{p.startDate ? p.startDate.slice(0, 7) : '—'}</span>}
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'goLive' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'goLive'
                        ? <input type="date" className="cell-input" autoFocus defaultValue={p.goLive ?? ''} onBlur={e => { updateField(p.id, 'goLive', e.target.value); setInlineEdit(null); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEdit(null); }} onClick={e => e.stopPropagation()} style={{ minWidth: 120 }} />
                        : <span style={{color:'var(--text-muted)'}}>{p.goLive ? p.goLive.slice(0, 7) : '—'}</span>}
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'hypercare' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'hypercare'
                        ? <input type="date" className="cell-input" autoFocus defaultValue={(p as any).hypercare ?? ''} onBlur={e => { updateField(p.id, 'hypercare', e.target.value); setInlineEdit(null); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEdit(null); }} onClick={e => e.stopPropagation()} style={{ minWidth: 120 }} />
                        : <span style={{color:'var(--text-muted)'}}>{(p as any).hypercare ? (p as any).hypercare.slice(0, 7) : '—'}</span>}
                    </td>
                    <td>
                      <button className="btn btn-icon" style={{ width:26, height:26, color:'var(--text-faint)' }} onClick={() => setConfirmAction(() => remove(p.id))} title="Supprimer"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

            {/* Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? t('new_project_title') : t('edit_project_title')}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </div>
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_project_name')}</label>
                <input className="input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_domain')}</label>
                <select className="input" value={editing.domain} onChange={e => setEditing({ ...editing, domain: e.target.value })}>
                  {spaceDomains.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_request_type')}</label>
                <select className="input" value={editing.requestType} onChange={e => setEditing({ ...editing, requestType: e.target.value })}>
                  {spaceRequestTypes.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_lead_dept')}</label>
                <select className="input" value={editing.leadDept} onChange={e => setEditing({ ...editing, leadDept: e.target.value })}>
                  {spaceDepartments.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_country')}</label>
                <select className="input" value={editing.leadCountry} onChange={e => setEditing({ ...editing, leadCountry: e.target.value })}>
                  {spaceCountries.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_sponsor')}</label>
                <select className="input" value={editing.sponsor ?? ''} onChange={e => setEditing({ ...editing, sponsor: e.target.value })}>
                  <option value="">—</option>
                  {spaceSponsors.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_pm')}</label>
                <select className="input" value={editing.projectManager ?? ''} onChange={e => setEditing({ ...editing, projectManager: e.target.value })}>
                  <option value="">—</option>
                  {pmOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_priority')}</label>
                <select className="input" value={editing.priority ?? ''} onChange={e => setEditing({ ...editing, priority: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {[1,2,3,4].map(n => <option key={n} value={n}>P{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_complexity')}</label>
                <select className="input" value={editing.complexity ?? ''} onChange={e => setEditing({ ...editing, complexity: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {[1,2,3,4].map(n => <option key={n} value={n}>C{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_status')}</label>
                <select className="input" value={editing.status ?? ''} onChange={e => setEditing({ ...editing, status: e.target.value || null })}>
                  <option value="">—</option>
                  {spaceStatuses.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_start_date')}</label>
                <input type="date" className="input" value={editing.startDate ?? ''} onChange={e => setEditing({ ...editing, startDate: e.target.value || null })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('go_live')}</label>
                <input type="date" className="input" value={editing.goLive ?? ''} onChange={e => setEditing({ ...editing, goLive: e.target.value || null })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('hypercare_date')}</label>
                <input type="date" className="input" value={(editing as any).hypercare ?? ''} onChange={e => setEditing({ ...editing, hypercare: (e.target.value || null) } as any)} />
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>{t('hypercare_hint')}</div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
              {isNew && (
                <button className="btn btn-ghost" onClick={() => save(true)} disabled={!editing.name}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="3" width="7" height="2.5" rx="1" fill="currentColor" opacity="0.6"/><rect x="1" y="7" width="9" height="2.5" rx="1" fill="currentColor"/><path d="M10 1l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  {t('save_and_plan')}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => save(false)} disabled={!editing.name}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}
      {confirmAction && <ConfirmDialog onConfirm={() => { confirmAction(); setConfirmAction(null); }} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}

// ─── Portfolio Gantt View ────────────────────────────────────────────────────
// ── Portfolio Gantt ──────────────────────────────────────────────────────────
function PortfolioGantt({ data, filtered, t, timeScale }: { data: AppData; filtered: Project[]; t: Function; timeScale: 'week' | 'month' | 'semester' | 'year' }) {
  const { settings } = useSettings(); const locale = settings.locale ?? 'fr';
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const LEFT_W = 220;

  // Compute display range from filtered projects
  const projectDates = filtered.flatMap(p => [p.startDate, p.goLive, (p as any).hypercare].filter(Boolean) as string[]);
  const minProjDate = projectDates.length ? projectDates.reduce((a,b) => a<b?a:b) : `${now.getFullYear()}-01-01`;
  const maxProjDate = projectDates.length ? projectDates.reduce((a,b) => a>b?a:b) : `${now.getFullYear()}-12-31`;

  function daysBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }

  const DAY_PX = timeScale === 'week' ? 22 : timeScale === 'month' ? 8 : timeScale === 'semester' ? 2.7 : 0.9;

  // Anchor on earliest project date, fixed window per scale
  const anchorD    = new Date(minProjDate);
  const anchorYear = anchorD.getFullYear();
  const anchorMon  = anchorD.getMonth();

  function addDaysPG(d: string, n: number) {
    const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0,10);
  }
  let displayMin: string;
  let displayMax: string;
  if (timeScale === 'week') {
    const d = new Date(minProjDate);
    const dow = d.getDay(); d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    displayMin = d.toISOString().slice(0,10);
    // Cover full project range in weeks
    const endW = new Date(maxProjDate); endW.setDate(endW.getDate() + 14);
    displayMax = endW.toISOString().slice(0,10);
  } else if (timeScale === 'month') {
    // Show from earliest project start to latest end + 1 month padding
    displayMin = `${anchorYear}-${String(anchorMon + 1).padStart(2,'0')}-01`;
    const endD = new Date(maxProjDate); endD.setMonth(endD.getMonth() + 1);
    displayMax = endD.toISOString().slice(0,10);
  } else if (timeScale === 'semester') {
    const semStart = anchorMon < 6 ? 0 : 6;
    displayMin = `${anchorYear}-${String(semStart + 1).padStart(2,'0')}-01`;
    displayMax = `${new Date(maxProjDate).getFullYear()}-12-31`;
  } else {
    displayMin = `${anchorYear}-01-01`;
    displayMax = `${anchorYear + 2}-12-31`;
  }

  const totalDays = Math.max(daysBetween(displayMin, displayMax) + 1, 7);
  const chartW = totalDays * DAY_PX;
  const todayX = daysBetween(displayMin, today) * DAY_PX;
  const ROW_H = 40;

  const localeStr = ({ fr: 'fr-FR', en: 'en-US', pt: 'pt-BR', zh: 'zh-CN' } as Record<string,string>)[locale] ?? 'fr-FR';

  // Build columns — identical logic to GanttView
  const columns: { label: string; left: number; width: number }[] = [];
  if (timeScale === 'week') {
    let cur = new Date(displayMin);
    const dow = cur.getDay();
    cur.setDate(cur.getDate() - (dow === 0 ? 6 : dow - 1));
    while (daysBetween(displayMin, cur.toISOString().slice(0,10)) < totalDays) {
      const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
      const left = Math.max(0, daysBetween(displayMin, cur.toISOString().slice(0,10))) * DAY_PX;
      const right = Math.min(totalDays, daysBetween(displayMin, wEnd.toISOString().slice(0,10)) + 1) * DAY_PX;
      columns.push({ label: cur.toLocaleDateString(localeStr, { day: 'numeric', month: 'short' }), left, width: right - left });
      cur.setDate(cur.getDate() + 7);
    }
  } else if (timeScale === 'semester') {
    let cur = new Date(displayMin); cur.setMonth(cur.getMonth() < 6 ? 0 : 6, 1);
    while (daysBetween(displayMin, cur.toISOString().slice(0,10)) < totalDays) {
      const isS1 = cur.getMonth() === 0;
      const sEnd = new Date(cur.getFullYear(), isS1 ? 5 : 11, isS1 ? 30 : 31);
      const left = Math.max(0, daysBetween(displayMin, cur.toISOString().slice(0,10))) * DAY_PX;
      const right = Math.min(totalDays, daysBetween(displayMin, sEnd.toISOString().slice(0,10)) + 1) * DAY_PX;
      columns.push({ label: `S${isS1 ? 1 : 2} ${cur.getFullYear()}`, left, width: right - left });
      cur.setMonth(cur.getMonth() + 6);
    }
  } else if (timeScale === 'year') {
    let cur = new Date(displayMin); cur.setMonth(0, 1);
    while (daysBetween(displayMin, cur.toISOString().slice(0,10)) < totalDays) {
      const yEnd = new Date(cur.getFullYear(), 11, 31);
      const left = Math.max(0, daysBetween(displayMin, cur.toISOString().slice(0,10))) * DAY_PX;
      const right = Math.min(totalDays, daysBetween(displayMin, yEnd.toISOString().slice(0,10)) + 1) * DAY_PX;
      columns.push({ label: String(cur.getFullYear()), left, width: right - left });
      cur.setFullYear(cur.getFullYear() + 1);
    }
  } else {
    let cur = new Date(displayMin); cur.setDate(1);
    while (daysBetween(displayMin, cur.toISOString().slice(0,10)) < totalDays) {
      const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const left = Math.max(0, daysBetween(displayMin, cur.toISOString().slice(0,10))) * DAY_PX;
      const right = Math.min(totalDays, daysBetween(displayMin, mEnd.toISOString().slice(0,10)) + 1) * DAY_PX;
      columns.push({ label: cur.toLocaleDateString(localeStr, { month: 'short', year: '2-digit' }), left, width: right - left });
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  const statusColor: Record<string, string> = {
    '3-In progress': 'var(--success)',
    '2-Validated': 'var(--accent)',
    '1-To arbitrate': 'var(--text-faint)',
    '4-Frozen': 'var(--warning)',
    '5-Completed': 'var(--purple)',
    '6-Aborted': 'var(--danger)',
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ padding: 0, overflow: 'visible' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: LEFT_W + chartW }}>
            {/* Header row — sticky */}
            <div style={{ display: 'flex', background: '#3D3A4E', borderBottom: 'none', position: 'sticky', top: 0, zIndex: 6 }}>
              <div style={{ width: LEFT_W, minWidth: LEFT_W, flexShrink: 0, height: 36, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' as const, letterSpacing: '0.07em', position: 'sticky', left: 0, zIndex: 25, background: '#3D3A4E', borderRight: '1px solid rgba(255,255,255,0.10)' }}>
                {t('project_name')}
              </div>
              <div style={{ width: chartW, flexShrink: 0, position: 'relative', height: 40 }}>
                {columns.map((col, i) => (
                  <div key={i} style={{ position: 'absolute', left: col.left, width: col.width, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'capitalize' as const, overflow: 'hidden' }}>
                    {col.label}
                  </div>
                ))}
                {todayX >= 0 && todayX <= chartW && (
                  <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, background: 'var(--accent)', opacity: 0.5 }} />
                )}
              </div>
            </div>

            {/* Project rows */}
            {filtered.map((p, idx) => {
              const barStart = p.startDate ? daysBetween(displayMin, p.startDate) : null;
              const barGl    = p.goLive    ? daysBetween(displayMin, p.goLive)    : null;
              const hc       = (p as any).hypercare as string | null;
              const barHc    = hc          ? daysBetween(displayMin, hc)          : null;
              const hasBar   = barStart !== null && barGl !== null;
              const glX      = barGl !== null ? barGl * DAY_PX : null;
              const hcX      = barHc !== null ? barHc * DAY_PX : null;
              const color    = statusColor[p.status ?? ''] ?? 'var(--accent)';

              return (
                <div key={p.id} style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)', minHeight: ROW_H }}>
                  <div style={{ width: LEFT_W, minWidth: LEFT_W, flexShrink: 0, padding: '0 14px', display: 'flex', alignItems: 'center', position: 'sticky', left: 0, zIndex: 20, background: idx % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)', borderRight: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: LEFT_W - 28 }} title={p.name}>{p.name}</span>
                  </div>
                  <div style={{ width: chartW, flexShrink: 0, position: 'relative', height: ROW_H }}>
                    {/* Grid lines */}
                    {columns.map((col, i) => (
                      <div key={i} style={{ position: 'absolute', left: col.left, top: 0, bottom: 0, width: 1, background: 'var(--border)', opacity: 0.5 }} />
                    ))}
                    {/* Today line */}
                    {todayX >= 0 && todayX <= chartW && (
                      <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, background: 'var(--accent)', opacity: 0.35, zIndex: 4 }} />
                    )}
                    {/* Main bar */}
                    {hasBar && barStart! * DAY_PX <= chartW && barGl! * DAY_PX >= 0 && (
                      <div style={{ position: 'absolute', left: Math.max(0, barStart!) * DAY_PX, width: Math.max(4, Math.min(chartW, barGl! * DAY_PX) - Math.max(0, barStart!) * DAY_PX), top: 9, height: 20, background: color, borderRadius: hcX ? '4px 0 0 4px' : '4px', zIndex: 3, opacity: 0.85 }} title={`${p.name}: ${p.startDate} → ${p.goLive}`} />
                    )}
                    {/* Hypercare bar */}
                    {hasBar && glX !== null && hcX !== null && glX <= chartW && hcX >= 0 && (
                      <div style={{ position: 'absolute', left: Math.max(0, glX), width: Math.max(4, Math.min(chartW, hcX) - Math.max(0, glX)), top: 9, height: 20, background: color, opacity: 0.22, borderRadius: '0 4px 4px 0', zIndex: 3, backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,.35) 3px,rgba(255,255,255,.35) 6px)' }} />
                    )}
                    {/* ◆ Go-live */}
                    {glX !== null && glX >= -4 && glX <= chartW + 4 && (
                      <div style={{ position: 'absolute', left: glX - 7, top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: 12, height: 12, background: color, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,.25)', zIndex: 5 }} title={`Go-Live: ${p.goLive}`} />
                    )}
                    {/* Manual milestones */}
                    {(data.milestones ?? []).filter(m => m.projectId === p.id && !m.isAutoGoLive).map(m => {
                      const mx = daysBetween(displayMin, m.date) * DAY_PX;
                      if (mx < -10 || mx > chartW + 10) return null;
                      return <div key={m.id} style={{ position: 'absolute', left: mx - 5, top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: 9, height: 9, background: 'var(--accent2)', border: '1.5px solid white', zIndex: 5 }} title={`${m.name}: ${m.date}`} />;
                    })}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>{t('no_project')}</div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 20, flexWrap: 'wrap', background: 'var(--bg3)', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}><div style={{ width: 24, height: 8, borderRadius: 2, background: 'var(--accent)', opacity: 0.85 }} /><span>{t('legend_project_bar')}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}><div style={{ width: 24, height: 8, borderRadius: 2, background: 'var(--accent)', opacity: 0.22, backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,.5) 3px,rgba(255,255,255,.5) 6px)' }} /><span>{t('legend_hypercare')}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}><div style={{ width: 10, height: 10, transform: 'rotate(45deg)', background: 'var(--accent)', border: '1.5px solid white', flexShrink: 0 }} /><span>{t('legend_golive')}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}><div style={{ width: 2, height: 14, background: 'var(--accent)', opacity: 0.5 }} /><span>{t('today')}</span></div>
        </div>
      </div>
    </div>
  );
}
