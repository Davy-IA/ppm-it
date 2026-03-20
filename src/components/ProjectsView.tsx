'use client';
import { useState } from 'react';
import { AppData, Project, DOMAINS, REQUEST_TYPES, STATUSES, DEPARTMENTS, COUNTRIES, SPONSORS } from '@/types';
import { v4 as uuid } from 'uuid';
import { useSettings } from '@/lib/context';

interface Props { data: AppData; updateData: (d: AppData) => void; }

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



export default function ProjectsView({ data, updateData }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState<Record<string, string>>({});

  const setAdv = (key: string, val: string) =>
    setAdvFilters(prev => val ? { ...prev, [key]: val } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));

  const activeFilterCount = Object.keys(advFilters).length + (statusFilter ? 1 : 0) + (domainFilter ? 1 : 0);
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
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string } | null>(null);

  const updateField = (id: string, field: string, value: any) => {
    const projects = data.projects.map(p => p.id === id ? { ...p, [field]: value || null } : p);
    updateData({ ...data, projects });
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

  const save = () => {
    if (!editing) return;
    let projects;
    if (isNew) {
      projects = [...data.projects, { ...editing, id: uuid() }];
    } else {
      projects = data.projects.map(p => p.id === editing.id ? editing : p);
    }
    updateData({ ...data, projects });
    setEditing(null);
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
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: `1.5px solid ${activeFilterCount > 0 ? 'var(--accent)' : 'var(--border)'}`, background: activeFilterCount > 0 ? 'var(--accent-subtle)' : 'var(--bg2)', color: activeFilterCount > 0 ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
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
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: viewMode === 'list' ? 'var(--accent-gradient)' : 'var(--bg2)', color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="2" rx="1" fill="currentColor"/><rect x="1" y="5" width="11" height="2" rx="1" fill="currentColor"/><rect x="1" y="9" width="11" height="2" rx="1" fill="currentColor"/></svg>
              {t('view_list')}
            </button>
            <button onClick={() => setViewMode('gantt')} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: viewMode === 'gantt' ? 'var(--accent-gradient)' : 'var(--bg2)', color: viewMode === 'gantt' ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
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
      {viewMode === 'gantt' && <PortfolioGantt data={data} filtered={filtered} t={t} />}

      {/* Table */}
      {viewMode === 'list' && <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('project_name')}</th><th>{t('domain')}</th><th>{t('type')}</th><th>{t('lead_dept')}</th>
                <th>{t('sponsor')}</th><th>{t('project_manager')}</th><th>{t('priority')}</th>
                <th>{t('complexity')}</th><th>{t('status')}</th><th>{t('start_date')}</th><th>{t('go_live')}</th><th>{t('hypercare_date')}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="cell-edit" style={{ fontWeight: 500, maxWidth: 260 }} onClick={() => setInlineEdit({ id: p.id, field: 'name' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'name'
                      ? <input className="cell-input" autoFocus defaultValue={p.name}
                          onBlur={e => { updateField(p.id, 'name', e.target.value); setInlineEdit(null); }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { if (e.key === 'Enter') updateField(p.id, 'name', (e.target as HTMLInputElement).value); setInlineEdit(null); } }}
                          onClick={e => e.stopPropagation()} style={{ minWidth: 180 }} />
                      : <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 240 }}>{p.name}</span>
                    }
                  </td>
                  <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'domain' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'domain'
                      ? <select className="cell-select" autoFocus defaultValue={p.domain}
                          onChange={e => { updateField(p.id, 'domain', e.target.value); setInlineEdit(null); }}
                          onBlur={() => setInlineEdit(null)}
                          onClick={e => e.stopPropagation()}>
                          {spaceDomains.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      : <span className="badge badge-blue">{p.domain}</span>
                    }
                  </td>
                  <td className="cell-edit" style={{ color: 'var(--text-muted)', fontSize: 12 }} onClick={() => setInlineEdit({ id: p.id, field: 'requestType' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'requestType'
                      ? <select className="cell-select" autoFocus defaultValue={p.requestType}
                          onChange={e => { updateField(p.id, 'requestType', e.target.value); setInlineEdit(null); }}
                          onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>
                          {spaceRequestTypes.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      : p.requestType}
                  </td>
                  <td className="cell-edit" style={{ color: 'var(--text-muted)' }} onClick={() => setInlineEdit({ id: p.id, field: 'leadDept' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'leadDept'
                      ? <select className="cell-select" autoFocus defaultValue={p.leadDept}
                          onChange={e => { updateField(p.id, 'leadDept', e.target.value); setInlineEdit(null); }}
                          onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>
                          {spaceDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      : p.leadDept}
                  </td>
                  <td className="cell-edit" style={{ color: 'var(--text-muted)', fontSize: 12 }} onClick={() => setInlineEdit({ id: p.id, field: 'sponsor' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'sponsor'
                      ? <select className="cell-select" autoFocus defaultValue={p.sponsor ?? ''}
                          onChange={e => { updateField(p.id, 'sponsor', e.target.value); setInlineEdit(null); }}
                          onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>
                          <option value="">—</option>
                          {spaceSponsors.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      : p.sponsor || <span style={{color:'var(--text-faint)'}}>—</span>}
                  </td>
                  <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'projectManager' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'projectManager'
                      ? <input className="cell-input" autoFocus defaultValue={p.projectManager ?? ''}
                          list={`pm-list-${p.id}`}
                          onBlur={e => { updateField(p.id, 'projectManager', e.target.value); setInlineEdit(null); }}
                          onKeyDown={e => { if (e.key === 'Enter') { updateField(p.id, 'projectManager', (e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }}
                          onClick={e => e.stopPropagation()} style={{ minWidth: 140 }} />
                      : p.projectManager || <span style={{color:'var(--text-faint)'}}>—</span>}
                    <datalist id={`pm-list-${p.id}`}>
                      {data.staff.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </td>
                  <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'priority' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'priority'
                      ? <select className="cell-select" autoFocus defaultValue={p.priority ?? ''}
                          onChange={e => { updateField(p.id, 'priority', e.target.value ? Number(e.target.value) : null); setInlineEdit(null); }}
                          onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()} style={{ width: 60 }}>
                          <option value="">—</option>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>P{n}</option>)}
                        </select>
                      : p.priority ? <span className="badge badge-gray">P{p.priority}</span> : <span style={{color:'var(--text-faint)'}}>—</span>}
                  </td>
                  <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'complexity' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'complexity'
                      ? <select className="cell-select" autoFocus defaultValue={p.complexity ?? ''}
                          onChange={e => { updateField(p.id, 'complexity', e.target.value ? Number(e.target.value) : null); setInlineEdit(null); }}
                          onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()} style={{ width: 60 }}>
                          <option value="">—</option>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>C{n}</option>)}
                        </select>
                      : p.complexity ? <span className="badge badge-gray">C{p.complexity}</span> : <span style={{color:'var(--text-faint)'}}>—</span>}
                  </td>
                  <td className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'status' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'status'
                      ? <select className="cell-select" autoFocus defaultValue={p.status ?? ''}
                          onChange={e => { updateField(p.id, 'status', e.target.value); setInlineEdit(null); }}
                          onBlur={() => setInlineEdit(null)}
                          onClick={e => e.stopPropagation()}>
                          <option value="">—</option>
                          {spaceStatuses.map(s => <option key={s} value={s}>{s.replace(/^\d-/, '')}</option>)}
                        </select>
                      : p.status ? <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-gray'}`}>{p.status.replace(/^\d-/, '')}</span> : <span style={{color:'var(--text-faint)'}}>—</span>
                    }
                  </td>
                  <td className="cell-edit" style={{ fontSize: 12 }} onClick={() => setInlineEdit({ id: p.id, field: 'startDate' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'startDate'
                      ? <input type="date" className="cell-input" autoFocus defaultValue={p.startDate ?? ''}
                          onBlur={e => { updateField(p.id, 'startDate', e.target.value); setInlineEdit(null); }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEdit(null); }}
                          onClick={e => e.stopPropagation()} style={{ minWidth: 130 }} />
                      : <span style={{color:'var(--text-muted)'}}>{p.startDate ? p.startDate.slice(0, 7) : '—'}</span>
                    }
                  </td>
                  <td className="cell-edit" style={{ fontSize: 12 }} onClick={() => setInlineEdit({ id: p.id, field: 'goLive' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'goLive'
                      ? <input type="date" className="cell-input" autoFocus defaultValue={p.goLive ?? ''}
                          onBlur={e => { updateField(p.id, 'goLive', e.target.value); setInlineEdit(null); }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEdit(null); }}
                          onClick={e => e.stopPropagation()} style={{ minWidth: 130 }} />
                      : <span style={{color:'var(--text-muted)'}}>{p.goLive ? p.goLive.slice(0, 7) : '—'}</span>
                    }
                  </td>
                  <td className="cell-edit" style={{ fontSize: 12 }} onClick={() => setInlineEdit({ id: p.id, field: 'hypercare' })}>
                    {inlineEdit?.id === p.id && inlineEdit.field === 'hypercare'
                      ? <input type="date" className="cell-input" autoFocus defaultValue={(p as any).hypercare ?? ''}
                          onBlur={e => { updateField(p.id, 'hypercare', e.target.value); setInlineEdit(null); }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEdit(null); }}
                          onClick={e => e.stopPropagation()} style={{ minWidth: 130 }} />
                      : <span style={{color:'var(--text-muted)'}}>{(p as any).hypercare ? (p as any).hypercare.slice(0, 7) : '—'}</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditing({ ...p }); setIsNew(false); }}>{t('edit_btn')}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)' }}>{t('no_projects')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? t('new_project_title') : t('edit_project_title')}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕</button>
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
              <button className="btn btn-primary" onClick={save} disabled={!editing.name}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Portfolio Gantt View ────────────────────────────────────────────────────
// ── Portfolio Gantt ──────────────────────────────────────────────────────────
function PortfolioGantt({ data, filtered, t }: { data: AppData; filtered: Project[]; t: Function }) {
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd   = `${now.getFullYear()}-12-31`;
  const DAY = 2.8;
  const LEFT_W = 220;
  const today = now.toISOString().slice(0, 10);

  function daysBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
  }
  const totalDays = daysBetween(yearStart, yearEnd) + 1;
  const chartW = totalDays * DAY;
  const todayX = Math.max(0, daysBetween(yearStart, today)) * DAY;
  const ROW_H = 38;

  const months: { label: string; left: number; width: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const mDate = new Date(now.getFullYear(), m, 1);
    const mEnd  = new Date(now.getFullYear(), m + 1, 0);
    const left  = daysBetween(yearStart, mDate.toISOString().slice(0, 10)) * DAY;
    const right = daysBetween(yearStart, mEnd.toISOString().slice(0, 10)) * DAY;
    months.push({ label: mDate.toLocaleDateString('fr-FR', { month: 'short' }), left, width: right - left });
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
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: LEFT_W + chartW + 40, position: 'relative' }}>

          {/* Month header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
            <div style={{ width: LEFT_W, flexShrink: 0, padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
              {t('project_name')}
            </div>
            <div style={{ flex: 1, position: 'relative', height: 32 }}>
              {months.map((m, i) => (
                <div key={i} style={{ position: 'absolute', left: m.left, width: m.width, top: 0, bottom: 0, borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{m.label}</span>
                </div>
              ))}
              {todayX >= 0 && todayX <= chartW && (
                <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, background: 'var(--accent)', opacity: 0.5 }} />
              )}
            </div>
          </div>

          {/* Project rows */}
          {filtered.map((p, idx) => {
            const barStart = p.startDate ? Math.max(0, daysBetween(yearStart, p.startDate)) : null;
            const barGl    = p.goLive    ? Math.min(totalDays, daysBetween(yearStart, p.goLive)) : null;
            const hc       = (p as any).hypercare as string | null;
            const barHc    = hc ? Math.min(totalDays, daysBetween(yearStart, hc)) : null;
            const hasBar   = barStart !== null && barGl !== null;
            const glX      = barGl !== null ? barGl * DAY : null;
            const hcX      = barHc !== null ? barHc * DAY : null;
            const color    = statusColor[p.status ?? ''] ?? 'var(--accent)';

            return (
              <div key={p.id} style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg3)', minHeight: ROW_H }}>
                <div style={{ width: LEFT_W, flexShrink: 0, padding: '0 14px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: LEFT_W - 28 }} title={p.name}>{p.name}</span>
                </div>
                <div style={{ flex: 1, position: 'relative', height: ROW_H }}>
                  {/* Grid lines */}
                  {months.map((m, i) => (
                    <div key={i} style={{ position: 'absolute', left: m.left, top: 0, bottom: 0, width: 1, background: 'var(--border)', opacity: 0.4 }} />
                  ))}
                  {/* Today */}
                  {todayX >= 0 && todayX <= chartW && (
                    <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, background: 'var(--accent)', opacity: 0.35, zIndex: 4 }} />
                  )}
                  {/* Main bar start → goLive */}
                  {hasBar && barStart! * DAY <= chartW && barGl! * DAY >= 0 && (
                    <div style={{ position: 'absolute', left: Math.max(0, barStart!) * DAY, width: Math.max(4, Math.min(chartW, barGl! * DAY) - Math.max(0, barStart!) * DAY), top: 9, height: 20, background: color, borderRadius: hcX ? '4px 0 0 4px' : '4px', zIndex: 3, opacity: 0.85 }} title={`${p.name}: ${p.startDate} → ${p.goLive}`} />
                  )}
                  {/* Hypercare bar goLive → hypercare */}
                  {hasBar && glX !== null && hcX !== null && glX <= chartW && hcX >= 0 && (
                    <div style={{ position: 'absolute', left: Math.max(0, glX), width: Math.max(4, Math.min(chartW, hcX) - Math.max(0, glX)), top: 9, height: 20, background: color, opacity: 0.22, borderRadius: '0 4px 4px 0', zIndex: 3, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.35) 3px, rgba(255,255,255,0.35) 6px)' }} title={`Hypercare: ${p.goLive} → ${hc}`} />
                  )}
                  {/* ◆ Go-live diamond */}
                  {glX !== null && glX >= -4 && glX <= chartW + 4 && (
                    <div style={{ position: 'absolute', left: glX - 7, top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: 12, height: 12, background: color, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', zIndex: 5 }} title={`Go-Live: ${p.goLive}`} />
                  )}
                  {/* Manual milestones */}
                  {(data.milestones ?? []).filter(m => m.projectId === p.id && !m.isAutoGoLive).map(m => {
                    const mx = daysBetween(yearStart, m.date) * DAY;
                    if (mx < -10 || mx > chartW + 10) return null;
                    return (
                      <div key={m.id} style={{ position: 'absolute', left: mx - 5, top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: 9, height: 9, background: 'var(--accent2)', border: '1.5px solid white', zIndex: 5 }} title={`${m.name}: ${m.date}`} />
                    );
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
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 20, flexWrap: 'wrap', background: 'var(--bg3)', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ width: 24, height: 8, borderRadius: 2, background: 'var(--accent)', opacity: 0.85 }} />
          <span>{t('legend_project_bar')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ width: 24, height: 8, borderRadius: 2, background: 'var(--accent)', opacity: 0.22, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 6px)' }} />
          <span>{t('legend_hypercare')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ width: 10, height: 10, transform: 'rotate(45deg)', background: 'var(--accent)', border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 }} />
          <span>{t('legend_golive')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ width: 2, height: 14, background: 'var(--accent)', opacity: 0.5 }} />
          <span>{t('today')}</span>
        </div>
      </div>
    </div>
  );
}
