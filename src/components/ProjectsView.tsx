'use client';
import { useState } from 'react';
import { AppData, Project, DOMAINS, REQUEST_TYPES, STATUSES, DEPARTMENTS, COUNTRIES, SPONSORS } from '@/types';
import { v4 as uuid } from 'uuid';
import { useSettings } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import ConfirmDialog from './ConfirmDialog';

interface Props { data: AppData; updateData: (d: AppData) => void; setView?: (v: string) => void; onNavigateToPlanning?: (projectId: string, openNew?: boolean) => void; }

// E8: Column definitions
interface ColDef { id: string; labelKey: string; minWidth?: number; textAlign?: string; isCustom?: boolean; cfId?: string; }
const BASE_COLS: ColDef[] = [
  { id: 'domain',         labelKey: 'domain',          minWidth: 90 },
  { id: 'requestType',    labelKey: 'type',             minWidth: 140 },
  { id: 'leadDept',       labelKey: 'lead_dept',        minWidth: 110 },
  { id: 'sponsor',        labelKey: 'field_sponsor',    minWidth: 130 },
  { id: 'projectManager', labelKey: 'project_manager',  minWidth: 130 },
  { id: 'priority',       labelKey: 'priority',         minWidth: 70, textAlign: 'center' },
  { id: 'complexity',     labelKey: 'complexity',       minWidth: 70, textAlign: 'center' },
  { id: 'status',         labelKey: 'status',           minWidth: 120 },
  { id: 'startDate',      labelKey: 'start_date',       minWidth: 90 },
  { id: 'goLive',         labelKey: 'go_live',          minWidth: 90 },
  { id: 'hypercare',      labelKey: 'hypercare_date',   minWidth: 90 },
];

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
  // Multi-select filters — empty array = All selected
  const [fStatus,  setFStatus]  = useState<string[]>([]);
  const [fDomain,  setFDomain]  = useState<string[]>([]);
  const [fType,    setFType]    = useState<string[]>([]);
  const [fDept,    setFDept]    = useState<string[]>([]);
  const [fCountry, setFCountry] = useState<string[]>([]);
  const [fSponsor, setFSponsor] = useState<string[]>([]);
  const [fPM,      setFPM]      = useState<string[]>([]);
  const [fPrio,    setFPrio]    = useState<string[]>([]);
  const [fComplex, setFComplex] = useState<string[]>([]);

  // Dropdown open state
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const closeDrop = () => setOpenDrop(null);

  const toggleF = (setter: React.Dispatch<React.SetStateAction<string[]>>, val: string, all: string[]) =>
    setter(prev => {
      if ((prev as any)[0] === '__none__') return [val];           // was none → select this one
      if (prev.length === 0) return all.filter(x => x !== val);   // all → deselect one
      if (prev.includes(val)) {
        const next = prev.filter(x => x !== val);
        return next.length === 0 ? [] : next;
      }
      const next = [...prev, val];
      return next.length === all.length ? [] : next;
    });

  const activeFilterCount = [fStatus, fDomain, fType, fDept, fCountry, fSponsor, fPM, fPrio, fComplex]
    .filter(f => f.length > 0).length;
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const { t, settings } = useSettings();
  const { user } = useAuth();
  const canEditCols = ['admin', 'superadmin', 'space_admin'].includes((user as any)?.role ?? '');

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
  const [ganttScale, setGanttScale] = useState<'week' | 'month' | 'semester' | 'year'>('month');
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string } | null>(null);

  // E8: Column config persisted in localStorage
  const [colOrder, setColOrder] = useState<string[]>(() => {
    try { const s = localStorage.getItem('ppm-col-order'); if (s) return JSON.parse(s); } catch {}
    return BASE_COLS.map(c => c.id);
  });
  const [colVisible, setColVisible] = useState<Record<string, boolean>>(() => {
    try { const s = localStorage.getItem('ppm-col-visible'); if (s) return JSON.parse(s); } catch {}
    return {};
  });
  const [showColsDrop, setShowColsDrop] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dragColId, setDragColId] = useState<string | null>(null);

  const saveColOrder = (order: string[]) => { setColOrder(order); localStorage.setItem('ppm-col-order', JSON.stringify(order)); };
  const saveColVisible = (vis: Record<string, boolean>) => { setColVisible(vis); localStorage.setItem('ppm-col-visible', JSON.stringify(vis)); };

  // E7: Custom fields — global (from settings) + space-specific (from spaceConfig)
  const globalCustomFields: { id: string; label: string; type: 'text' | 'select'; options?: string[] }[] = (settings as any).customFields ?? [];
  const spaceCustomFields: { id: string; label: string; type: 'text' | 'select'; options?: string[] }[] = sc.customFields ?? [];
  const customFields = [
    ...globalCustomFields,
    ...spaceCustomFields.filter(sf => !globalCustomFields.some(gf => gf.id === sf.id)),
  ];
  const allCols: ColDef[] = [
    ...BASE_COLS,
    ...customFields.map(cf => ({ id: `cf_${cf.id}`, labelKey: cf.label, minWidth: 110, isCustom: true, cfId: cf.id } as ColDef)),
  ];
  const allColIds = allCols.map(c => c.id);
  const effectiveOrder = [...colOrder.filter(id => allColIds.includes(id)), ...allColIds.filter(id => !colOrder.includes(id))];
  const visibleCols = effectiveOrder.map(id => allCols.find(c => c.id === id)!).filter(c => c && colVisible[c.id] !== false);

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
    const m = (arr: string[], val: string | null | undefined) => {
      if ((arr as any)[0] === '__none__') return false;
      return arr.length === 0 || arr.includes(val ?? '');
    };
    return matchSearch
      && m(fStatus,  p.status)
      && m(fDomain,  p.domain)
      && m(fType,    p.requestType)
      && m(fDept,    p.leadDept)
      && m(fCountry, p.leadCountry)
      && m(fSponsor, p.sponsor)
      && m(fPM,      p.projectManager)
      && m(fPrio,    p.priority != null ? String(p.priority) : '')
      && m(fComplex, p.complexity != null ? String(p.complexity) : '');
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
      onNavigateToPlanning(newId, true);
    }
  };

  const remove = (id: string) => {
    const projects = data.projects.filter(p => p.id !== id);
    const workloads = data.workloads.filter(w => w.projectId !== id);
    const allocations = data.allocations.filter(a => a.projectId !== id);
    updateData({ ...data, projects, workloads, allocations });
  };

  const pmOptions = data.staff.map(s => s.name);

  // E8+E7: Dynamic cell renderer
  const renderCell = (p: Project, col: ColDef) => {
    const id = col.id;
    if (col.isCustom && col.cfId) {
      const cfId = col.cfId;
      const cf = customFields.find(f => f.id === cfId);
      const val = (p as any).customFields?.[cfId] ?? '';
      const saveCf = (v: string) => updateField(p.id, 'customFields', { ...((p as any).customFields ?? {}), [cfId]: v });
      return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: id })}>
          {inlineEdit?.id === p.id && inlineEdit.field === id
            ? cf?.type === 'select'
              ? <select className="cell-select" autoFocus defaultValue={val} onChange={e => { saveCf(e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>
                  <option value="">—</option>{(cf.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              : <input className="cell-input" autoFocus defaultValue={val}
                  onBlur={e => { saveCf(e.target.value); setInlineEdit(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { saveCf((e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }}
                  onClick={e => e.stopPropagation()} />
            : val || <span style={{color:'var(--text-faint)'}}>—</span>}
        </td>
      );
    }
    switch (id) {
      case 'domain': return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'domain' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'domain'
            ? <select className="cell-select" autoFocus defaultValue={p.domain} onChange={e => { updateField(p.id, 'domain', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>{spaceDomains.map(d => <option key={d} value={d}>{d}</option>)}</select>
            : p.domain || <span style={{color:'var(--text-faint)'}}>—</span>}
        </td>
      );
      case 'requestType': return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'requestType' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'requestType'
            ? <select className="cell-select" autoFocus defaultValue={p.requestType} onChange={e => { updateField(p.id, 'requestType', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>{spaceRequestTypes.map(r => <option key={r} value={r}>{r}</option>)}</select>
            : p.requestType || <span style={{color:'var(--text-faint)'}}>—</span>}
        </td>
      );
      case 'leadDept': return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'leadDept' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'leadDept'
            ? <select className="cell-select" autoFocus defaultValue={p.leadDept} onChange={e => { updateField(p.id, 'leadDept', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>{spaceDepartments.map(d => <option key={d} value={d}>{d}</option>)}</select>
            : p.leadDept || <span style={{color:'var(--text-faint)'}}>—</span>}
        </td>
      );
      case 'sponsor': return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'sponsor' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'sponsor'
            ? <select className="cell-select" autoFocus defaultValue={p.sponsor ?? ''} onChange={e => { updateField(p.id, 'sponsor', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}><option value="">—</option>{spaceSponsors.map(s => <option key={s} value={s}>{s}</option>)}</select>
            : p.sponsor || <span style={{color:'var(--text-faint)'}}>—</span>}
        </td>
      );
      case 'projectManager': return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'projectManager' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'projectManager'
            ? <><input className="cell-input" autoFocus defaultValue={p.projectManager ?? ''} list={`pm-${p.id}`}
                onBlur={e => { updateField(p.id, 'projectManager', e.target.value); setInlineEdit(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { updateField(p.id, 'projectManager', (e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }}
                onClick={e => e.stopPropagation()} style={{ minWidth: 130 }} />
              <datalist id={`pm-${p.id}`}>{data.staff.map(s => <option key={s.id} value={s.name} />)}</datalist></>
            : p.projectManager || <span style={{color:'var(--text-faint)'}}>—</span>}
        </td>
      );
      case 'priority': return (
        <td key={id} className="cell-edit" style={{ textAlign: 'center' }} onClick={() => setInlineEdit({ id: p.id, field: 'priority' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'priority'
            ? <select className="cell-select" autoFocus defaultValue={p.priority ?? ''} onChange={e => { updateField(p.id, 'priority', e.target.value ? Number(e.target.value) : null); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()} style={{ width: 55 }}><option value="">—</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>P{n}</option>)}</select>
            : p.priority ? `P${p.priority}` : <span style={{color:'var(--text-faint)'}}>—</span>}
        </td>
      );
      case 'complexity': return (
        <td key={id} className="cell-edit" style={{ textAlign: 'center' }} onClick={() => setInlineEdit({ id: p.id, field: 'complexity' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'complexity'
            ? <select className="cell-select" autoFocus defaultValue={p.complexity ?? ''} onChange={e => { updateField(p.id, 'complexity', e.target.value ? Number(e.target.value) : null); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()} style={{ width: 55 }}><option value="">—</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>C{n}</option>)}</select>
            : p.complexity ? `C${p.complexity}` : <span style={{color:'var(--text-faint)'}}>—</span>}
        </td>
      );
      case 'status': return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'status' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'status'
            ? <select className="cell-select" autoFocus defaultValue={p.status ?? ''} onChange={e => { updateField(p.id, 'status', e.target.value); setInlineEdit(null); }} onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}><option value="">—</option>{spaceStatuses.map(s => <option key={s} value={s}>{s.replace(/^\d-/, '')}</option>)}</select>
            : p.status ? <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-gray'}`}>{p.status.replace(/^\d-/, '')}</span> : <span style={{color:'var(--text-faint)'}}>—</span>}
        </td>
      );
      case 'startDate': return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'startDate' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'startDate'
            ? <input type="date" className="cell-input" autoFocus defaultValue={p.startDate ?? ''} onBlur={e => { updateField(p.id, 'startDate', e.target.value); setInlineEdit(null); }} onKeyDown={e => { if (e.key === 'Enter') { updateField(p.id, 'startDate', (e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }} onClick={e => e.stopPropagation()} style={{ minWidth: 120 }} />
            : <span style={{color:'var(--text-muted)'}}>{p.startDate ? p.startDate.slice(0, 7) : '—'}</span>}
        </td>
      );
      case 'goLive': return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'goLive' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'goLive'
            ? <input type="date" className="cell-input" autoFocus defaultValue={p.goLive ?? ''} onBlur={e => { updateField(p.id, 'goLive', e.target.value); setInlineEdit(null); }} onKeyDown={e => { if (e.key === 'Enter') { updateField(p.id, 'goLive', (e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }} onClick={e => e.stopPropagation()} style={{ minWidth: 120 }} />
            : <span style={{color:'var(--text-muted)'}}>{p.goLive ? p.goLive.slice(0, 7) : '—'}</span>}
        </td>
      );
      case 'hypercare': return (
        <td key={id} className="cell-edit" onClick={() => setInlineEdit({ id: p.id, field: 'hypercare' })}>
          {inlineEdit?.id === p.id && inlineEdit.field === 'hypercare'
            ? <input type="date" className="cell-input" autoFocus defaultValue={(p as any).hypercare ?? ''} onBlur={e => { updateField(p.id, 'hypercare', e.target.value); setInlineEdit(null); }} onKeyDown={e => { if (e.key === 'Enter') { updateField(p.id, 'hypercare', (e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }} onClick={e => e.stopPropagation()} style={{ minWidth: 120 }} />
            : <span style={{color:'var(--text-muted)'}}>{(p as any).hypercare ? (p as any).hypercare.slice(0, 7) : '—'}</span>}
        </td>
      );
      default: return <td key={id} />;
    }
  };

  // EB1/EB2: Reusable filter dropdown renderer
  const filterDefs = [
    { key: 'status',  label: t('all_statuses') as string,  items: spaceStatuses.map(s => ({ val: s, label: s.replace(/^\d-/, '') })), fState: fStatus,  fSet: setFStatus  },
    { key: 'domain',  label: t('all_domains') as string,   items: spaceDomains.map(d => ({ val: d, label: d })),                    fState: fDomain,  fSet: setFDomain  },
    { key: 'type',    label: t('type') as string,           items: spaceRequestTypes.map(o => ({ val: o, label: o })),              fState: fType,    fSet: setFType    },
    { key: 'dept',    label: t('lead_dept') as string,      items: spaceDepartments.map(o => ({ val: o, label: o })),               fState: fDept,    fSet: setFDept    },
    { key: 'country', label: t('field_country') as string,  items: spaceCountries.map(o => ({ val: o, label: o })),                 fState: fCountry, fSet: setFCountry },
    { key: 'sponsor', label: t('field_sponsor') as string,  items: spaceSponsors.map(o => ({ val: o, label: o })),                  fState: fSponsor, fSet: setFSponsor },
    { key: 'pm',      label: t('project_manager') as string,items: data.projects.map(p => p.projectManager).filter((v,i,a) => v && a.indexOf(v)===i).sort().map(o => ({ val: o!, label: o! })), fState: fPM, fSet: setFPM },
    { key: 'prio',    label: t('priority') as string,       items: ['1','2','3','4','5'].map(o => ({ val: o, label: `P${o}` })),     fState: fPrio,    fSet: setFPrio    },
    { key: 'complex', label: t('complexity') as string,     items: ['1','2','3','4','5'].map(o => ({ val: o, label: `C${o}` })),     fState: fComplex, fSet: setFComplex },
  ] as const;

  const renderFilterDrop = ({ key, label, items, fState, fSet }: typeof filterDefs[number]) => {
    const allSel = fState.length === 0;
    const isNone = (fState as any)[0] === '__none__';
    const isOpen = openDrop === key;
    const activeCount = isNone ? 0 : fState.length;
    return (
      <div key={key} style={{ position: 'relative' }}>
        <button
          className={`toolbar-btn${(!allSel || isNone) ? ' active' : ''}`}
          onClick={() => setOpenDrop(isOpen ? null : key)}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {label}
          {activeCount > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>{activeCount}</span>}
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {isOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 3999 }} onClick={closeDrop} />
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 4000, minWidth: 190, maxHeight: 280, overflowY: 'auto', animation: 'dropIn .15s ease' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)', color: 'var(--text)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                <input type="checkbox" checked={allSel && !isNone}
                  onChange={() => (fSet as any)(allSel && !isNone ? (['__none__'] as any) : [])}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                {t('all')} ({items.length})
              </label>
              {(items as readonly { val: string; label: string }[]).map(({ val, label: lbl }) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)', color: 'var(--text)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                  <input type="checkbox"
                    checked={!isNone && (allSel || (fState as string[]).includes(val))}
                    onChange={() => toggleF(fSet as React.Dispatch<React.SetStateAction<string[]>>, val, (items as readonly { val: string }[]).map(i => i.val))}
                    style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                  {lbl}
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="animate-in">
      <div className="page-sticky-header">
        {/* Line 1: Search | Filtres | List/Gantt | Colonnes or Scale | → New Project */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

          {/* Search */}
          <input className="toolbar-select" placeholder={t('search')} value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth: 200 }} />

          {/* Filtres toggle button */}
          <button
            className={`toolbar-btn${showFilters || activeFilterCount > 0 ? ' active' : ''}`}
            onClick={() => setShowFilters(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Filtres
            {activeFilterCount > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>{activeFilterCount}</span>}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d={showFilters ? 'M1 5l3-3 3 3' : 'M1 3l3 3 3-3'} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setViewMode('list')} className={`toolbar-btn${viewMode === 'list' ? ' primary' : ''}`}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="2" rx="1" fill="currentColor"/><rect x="1" y="5" width="11" height="2" rx="1" fill="currentColor"/><rect x="1" y="9" width="11" height="2" rx="1" fill="currentColor"/></svg>
              {t('view_list')}
            </button>
            <button onClick={() => setViewMode('gantt')} className={`toolbar-btn${viewMode === 'gantt' ? ' primary' : ''}`}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="5" height="3" rx="1" fill="currentColor" opacity="0.5"/><rect x="1" y="5" width="8" height="3" rx="1" fill="currentColor"/><rect x="1" y="9" width="6" height="3" rx="1" fill="currentColor" opacity="0.7"/></svg>
              {t('view_gantt')}
            </button>
          </div>

          {/* E8: Columns button (list only, admin/space_admin only) */}
          {viewMode === 'list' && canEditCols && (
            <div style={{ position: 'relative' }}>
              <button className={`toolbar-btn${showColsDrop ? ' active' : ''}`}
                onClick={() => setShowColsDrop(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="3" height="11" rx="1" fill="currentColor" opacity="0.6"/><rect x="5" y="1" width="3" height="11" rx="1" fill="currentColor"/><rect x="9" y="1" width="3" height="11" rx="1" fill="currentColor" opacity="0.6"/></svg>
                Colonnes
              </button>
              {showColsDrop && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 3999 }} onClick={() => setShowColsDrop(false)} />
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 4000, minWidth: 220, maxHeight: 380, overflowY: 'auto', animation: 'dropIn .15s ease' }}>
                    <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>COLONNES</span>
                      <button style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => { saveColOrder(allCols.map(c => c.id)); saveColVisible({}); }}>
                        Réinitialiser
                      </button>
                    </div>
                    {effectiveOrder.filter(id => allCols.find(c => c.id === id)).map(colId => {
                      const col = allCols.find(c => c.id === colId)!;
                      const isVis = colVisible[colId] !== false;
                      return (
                        <div key={colId}
                          draggable
                          onDragStart={() => setDragColId(colId)}
                          onDragEnd={() => setDragColId(null)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => {
                            if (!dragColId || dragColId === colId) return;
                            const order = [...effectiveOrder];
                            const from = order.indexOf(dragColId); const to = order.indexOf(colId);
                            order.splice(from, 1); order.splice(to, 0, dragColId);
                            saveColOrder(order); setDragColId(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'grab', fontSize: 12, fontFamily: 'var(--font)', color: isVis ? 'var(--text)' : 'var(--text-faint)', userSelect: 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                          <span style={{ color: 'var(--text-faint)', fontSize: 14, lineHeight: 1 }}>⠿</span>
                          <input type="checkbox" checked={isVis}
                            onChange={() => saveColVisible({ ...colVisible, [colId]: !isVis })}
                            onClick={e => e.stopPropagation()}
                            style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{col.isCustom ? col.labelKey : t(col.labelKey as any) as string}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Gantt scale selector (gantt only) */}
          {viewMode === 'gantt' && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setOpenDrop(openDrop === 'gscale' ? null : 'gscale')} className="toolbar-btn">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M1 3h10M1 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                {ganttScale === 'week' ? String(t('scale_week')) : ganttScale === 'month' ? String(t('scale_month')) : ganttScale === 'semester' ? String(t('scale_semester')) : String(t('scale_year'))}
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {openDrop === 'gscale' && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={closeDrop} />
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(124,92,191,0.15)', zIndex: 50, overflow: 'hidden', minWidth: 140 }}>
                    {(['week', 'month', 'semester', 'year'] as const).map(scale => (
                      <button key={scale} onClick={() => { setGanttScale(scale); closeDrop(); }}
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

          <div style={{ flex: 1 }} />

          {/* New Project — always far right */}
          <button className="btn btn-primary" onClick={() => { setEditing({ id: '', ...EMPTY_PROJECT }); setIsNew(true); }}>
            {t('new_project')}
          </button>
        </div>

        {/* Line 2: Filters row (toggle) */}
        {showFilters && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            {filterDefs.map(renderFilterDrop)}
            {(activeFilterCount > 0 || search) && (
              <button onClick={() => { setSearch(''); setFStatus([]); setFDomain([]); setFType([]); setFDept([]); setFCountry([]); setFSponsor([]); setFPM([]); setFPrio([]); setFComplex([]); }}
                style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>
                ✕ {t('clear_filters')}
              </button>
            )}
          </div>
        )}
      </div>

            {/* Gantt Portfolio View */}
      {viewMode === 'gantt' && <PortfolioGantt data={data} filtered={filtered} t={t} timeScale={ganttScale} />}

      {/* Table — same structure as Workload (proven working) */}
      {viewMode === 'list' && (
        <div className="card card-table" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
          <div className="utbl-wrap" style={{ maxHeight: 'calc(100vh - 148px)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-left" style={{ minWidth: 300 }}>{t('project_name')}</th>
                  {visibleCols.map(col => (
                    <th key={col.id}
                      style={{ minWidth: col.minWidth, textAlign: col.textAlign as any, cursor: canEditCols ? 'grab' : undefined, userSelect: canEditCols ? 'none' : undefined, opacity: dragColId === col.id ? 0.4 : 1 }}
                      draggable={canEditCols}
                      onDragStart={canEditCols ? () => setDragColId(col.id) : undefined}
                      onDragOver={canEditCols ? e => e.preventDefault() : undefined}
                      onDragEnd={canEditCols ? () => setDragColId(null) : undefined}
                      onDrop={canEditCols ? () => {
                        if (!dragColId || dragColId === col.id) return;
                        const order = [...effectiveOrder];
                        const from = order.indexOf(dragColId); const to = order.indexOf(col.id);
                        order.splice(from, 1); order.splice(to, 0, dragColId);
                        saveColOrder(order); setDragColId(null);
                      } : undefined}
                    >
                      {col.isCustom ? col.labelKey : t(col.labelKey as any) as string}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={1 + visibleCols.length} style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)' }}>{t('no_projects')}</td></tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="sticky-left cell-edit" style={{ fontWeight: 600 }} onClick={() => setInlineEdit({ id: p.id, field: 'name' })}>
                      {inlineEdit?.id === p.id && inlineEdit.field === 'name'
                        ? <input className="cell-input" autoFocus defaultValue={p.name}
                            onBlur={e => { updateField(p.id, 'name', e.target.value); setInlineEdit(null); }}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { if (e.key === 'Enter') updateField(p.id, 'name', (e.target as HTMLInputElement).value); setInlineEdit(null); } }}
                            onClick={e => e.stopPropagation()} style={{ minWidth: 180 }} />
                        : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minWidth: 0 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{p.name}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                              {onNavigateToPlanning && (
                                <button className="btn-icon" style={{ width: 22, height: 22, color: 'var(--text-faint)', opacity: 0.6 }} title={t('go_to_planning') as string} onClick={e => { e.stopPropagation(); onNavigateToPlanning(p.id, false); }}>
                                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="4" width="8" height="3" rx="1.5" fill="currentColor"/><rect x="4" y="8" width="8" height="3" rx="1.5" fill="currentColor" opacity="0.5"/><path d="M10 1.5L12 3.5L10 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                              )}
                              <button className="btn-icon" style={{ width: 22, height: 22, color: 'var(--text-faint)', opacity: 0.6 }} onClick={e => { e.stopPropagation(); setConfirmAction(() => () => remove(p.id)); }} title="Supprimer"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                            </span>
                          </span>
                      }
                    </td>
                    {visibleCols.map(col => renderCell(p, col))}
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
              <button className="btn-icon" onClick={() => setEditing(null)}><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
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
    <div style={{ marginTop: 20 }}>
      <div className="card card-table" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 155px)' }}>
          <div style={{ minWidth: LEFT_W + chartW }}>
            {/* Header row — sticky */}
            <div style={{ display: 'flex', background: '#3D3A4E', borderBottom: 'none', position: 'sticky', top: 0, zIndex: 30 }}>
              <div style={{ width: LEFT_W, minWidth: LEFT_W, flexShrink: 0, height: 38, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' as const, letterSpacing: '0.07em', position: 'sticky', left: 0, zIndex: 35, background: '#3D3A4E', borderRight: '1px solid rgba(255,255,255,0.10)' }}>
                {t('project_name')}
              </div>
              <div style={{ width: chartW, flexShrink: 0, position: 'relative', height: 38 }}>
                {columns.map((col, i) => (
                  <div key={i} style={{ position: 'absolute', left: col.left, width: col.width, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' as const, letterSpacing: '0.04em', overflow: 'hidden' }}>
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
                      <div style={{ position: 'absolute', left: glX - 7, top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: 12, height: 12, background: color, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,.25)', zIndex: 5 }} title={`${t('go_live')}: ${p.goLive}`} />
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
