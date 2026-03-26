'use client';
import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';

interface Space { id: string; name: string; color: string; icon: string; }
interface Project { id: string; name: string; domain: string; status: string | null; priority: number | null; projectManager: string; goLive: string | null; startDate: string | null; }
interface SpaceData { projects: Project[]; staff: any[]; workloads: any[]; allocations: any[]; ganttPhases: any[]; }

interface Props { spaces: Space[]; onBack: () => void; }

export default function GlobalPortfolio({ spaces, onBack }: Props) {
  const { token } = useAuth();
  const { settings, t } = useSettings();
  const locale = settings.locale ?? 'fr';
  const [allData, setAllData] = useState<Record<string, SpaceData>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showColsDrop, setShowColsDrop] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [colVisible, setColVisible] = useState<Record<string, boolean>>({});
  // Filters
  const [fSpace, setFSpace] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<string[]>([]);
  const [fDomain, setFDomain] = useState<string[]>([]);
  const [fPM, setFPM] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  // Gantt time scale
  const [ganttTimeScale, setGanttTimeScale] = useState<'week' | 'month' | 'semester' | 'year'>('month');

  useEffect(() => {
    const fetchAll = async () => {
      const results: Record<string, SpaceData> = {};
      await Promise.all(spaces.map(async (space) => {
        try {
          const r = await fetch(`/api/spaces/${space.id}/data`, { headers: { Authorization: `Bearer ${token}` } });
          if (r.ok) results[space.id] = await r.json();
        } catch {}
      }));
      setAllData(results);
      setLoading(false);
    };
    fetchAll();
  }, [spaces, token]);

  const allProjects = spaces.flatMap(s => (allData[s.id]?.projects ?? []).map(p => ({ ...p, spaceName: s.name, spaceColor: s.color, spaceId: s.id })));
  const allStaff = spaces.flatMap(s => (allData[s.id]?.staff ?? []).map(st => ({ ...st, spaceName: s.name })));

  const STATUS_COLORS: Record<string, string> = {
    '1-To arbitrate': 'badge-gray', '2-Validated': 'badge-blue',
    '3-In progress': 'badge-green', '4-Frozen': 'badge-yellow',
    '5-Completed': 'badge-purple', '6-Aborted': 'badge-red',
  };

  const ALL_COLS = [
    { id: 'space',          label: t('global_col_space') },
    { id: 'domain',         label: t('domain') },
    { id: 'projectManager', label: t('project_manager') },
    { id: 'priority',       label: t('priority') },
    { id: 'status',         label: t('status') },
    { id: 'startDate',      label: t('start_date') },
    { id: 'goLive',         label: t('go_live') },
  ];
  const visibleCols = ALL_COLS.filter(c => colVisible[c.id] !== false);
  const activeFilterCount = fSpace.length + fStatus.length + fDomain.length + fPM.length;

  const domains = Array.from(new Set(allProjects.map((p: any) => p.domain).filter(Boolean))).sort() as string[];
  const pms = Array.from(new Set(allProjects.map((p: any) => p.projectManager).filter(Boolean))).sort() as string[];

  const filterDefs = [
    { key: 'space',  label: t('global_col_space') as string,  items: spaces.map(s => ({ val: s.id, label: s.name })),                         fState: fSpace,  fSet: setFSpace },
    { key: 'status', label: t('all_statuses') as string,      items: ['1-To arbitrate','2-Validated','3-In progress','4-Frozen','5-Completed','6-Aborted'].map(s => ({ val: s, label: s.replace(/^\d-/,'') })), fState: fStatus, fSet: setFStatus },
    { key: 'domain', label: t('all_domains') as string,       items: domains.map(d => ({ val: d, label: d })),                                 fState: fDomain, fSet: setFDomain },
    { key: 'pm',     label: t('project_manager') as string,   items: pms.map(p => ({ val: p, label: p })),                                     fState: fPM,     fSet: setFPM },
  ] as const;

  const renderFilterDrop = (fd: typeof filterDefs[number]) => {
    const isOpen = openDrop === fd.key;
    const active = fd.fState.length > 0;
    return (
      <div key={fd.key} style={{ position: 'relative' }}>
        <button className={`toolbar-btn${active ? ' active' : ''}`} onClick={() => setOpenDrop(isOpen ? null : fd.key)}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {fd.label}
          {active && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>{fd.fState.length}</span>}
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d={isOpen ? 'M1 5l3-3 3 3' : 'M1 3l3 3 3-3'} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {isOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpenDrop(null)} />
            <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(124,92,191,0.15)', zIndex: 50, overflow: 'hidden', minWidth: 180 }}>
              {fd.items.map((item: any) => {
                const checked = (fd.fState as string[]).includes(item.val);
                return (
                  <button key={item.val} onClick={() => { fd.fSet(checked ? (fd.fState as string[]).filter(v => v !== item.val) : [...(fd.fState as string[]), item.val]); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', border: 'none', background: checked ? 'var(--accent-subtle)' : 'none', color: checked ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left' as const }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`, background: checked ? 'var(--accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {checked && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </div>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} className="btn btn-ghost btn-sm">{t('back_to_spaces')}</button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>🌐 {t('global_portfolio')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{allProjects.length} projets · {allStaff.length} ressources</p>
          </div>
        </div>
        {/* Space legend */}
        <div style={{ display: 'flex', gap: 8 }}>
          {spaces.map(s => (
            <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: s.color, background: `${s.color}15`, borderRadius: 20, padding: '4px 10px', border: `1px solid ${s.color}30` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      {/* Toolbar — identical mechanics to ProjectsView */}
      <div className="page-sticky-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Search */}
          <input className="toolbar-select" placeholder={t('search')} value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth: 200 }} />
          {/* Filtres */}
          <button className={`toolbar-btn${showFilters || activeFilterCount > 0 ? ' active' : ''}`}
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
          {/* Colonnes (list only) */}
          {viewMode === 'list' && (
            <div style={{ position: 'relative' }}>
              <button className={`toolbar-btn${showColsDrop ? ' active' : ''}`} onClick={() => setShowColsDrop(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="3" height="11" rx="1" fill="currentColor" opacity="0.6"/><rect x="5" y="1" width="3" height="11" rx="1" fill="currentColor"/><rect x="9" y="1" width="3" height="11" rx="1" fill="currentColor" opacity="0.6"/></svg>
                Colonnes
              </button>
              {showColsDrop && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 3999 }} onClick={() => setShowColsDrop(false)} />
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 4000, minWidth: 200, animation: 'dropIn .15s ease' }}>
                    {ALL_COLS.map(col => {
                      const isVis = colVisible[col.id] !== false;
                      return (
                        <div key={col.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: isVis ? 'var(--text)' : 'var(--text-faint)' }}
                          onClick={() => setColVisible(v => ({ ...v, [col.id]: !isVis }))}>
                          <input type="checkbox" checked={isVis} onChange={() => {}} onClick={e => e.stopPropagation()}
                            style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{col.label as string}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          {/* Gantt scale (gantt only) */}
          {viewMode === 'gantt' && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setOpenDrop(openDrop === 'gscale' ? null : 'gscale')} className="toolbar-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M1 3h10M1 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                {ganttTimeScale === 'week' ? String(t('scale_week')) : ganttTimeScale === 'month' ? String(t('scale_month')) : ganttTimeScale === 'semester' ? String(t('scale_semester')) : String(t('scale_year'))}
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {openDrop === 'gscale' && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpenDrop(null)} />
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(124,92,191,0.15)', zIndex: 50, overflow: 'hidden', minWidth: 140 }}>
                    {(['week','month','semester','year'] as const).map(scale => (
                      <button key={scale} onClick={() => { setGanttTimeScale(scale); setOpenDrop(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: ganttTimeScale === scale ? 'var(--accent-subtle)' : 'none', color: ganttTimeScale === scale ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: ganttTimeScale === scale ? 700 : 400, fontFamily: 'inherit', textAlign: 'left' as const }}>
                        {ganttTimeScale === scale && <span style={{ color: 'var(--accent)', fontSize: 10 }}>✓</span>}
                        {scale === 'week' ? String(t('scale_week')) : scale === 'month' ? String(t('scale_month')) : scale === 'semester' ? String(t('scale_semester')) : String(t('scale_year'))}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {/* Filters row */}
        {showFilters && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            {filterDefs.map(renderFilterDrop)}
            {(activeFilterCount > 0 || search) && (
              <button onClick={() => { setSearch(''); setFSpace([]); setFStatus([]); setFDomain([]); setFPM([]); }}
                style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>
                ✕ {t('clear_filters')}
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>{t('global_loading')}</div>
      ) : (
        <>
          {/* LIST VIEW */}
          {viewMode === 'list' && (() => {
            const filtered = allProjects.filter((p: any) => {
              if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.projectManager ?? '').toLowerCase().includes(search.toLowerCase())) return false;
              if (fSpace.length && !fSpace.includes(p.spaceId)) return false;
              if (fStatus.length && !fStatus.includes(p.status ?? '')) return false;
              if (fDomain.length && !fDomain.includes(p.domain ?? '')) return false;
              if (fPM.length && !fPM.includes(p.projectManager ?? '')) return false;
              return true;
            });
            return (
              <div className="card card-table" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
                <div className="utbl-wrap" style={{ maxHeight: 'calc(100vh - 148px)' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="sticky-left" style={{ minWidth: 260 }}>{t('project_name')}</th>
                        {visibleCols.map(col => (
                          <th key={col.id} style={{ textAlign: col.id === 'priority' ? 'center' : undefined }}>{col.label as string}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={1 + visibleCols.length} style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)' }}>{t('no_project')}</td></tr>
                      )}
                      {filtered.map((p: any, i: number) => (
                        <tr key={i}>
                          <td className="sticky-left" style={{ fontWeight: 600 }}>{p.name}</td>
                          {visibleCols.map(col => {
                            if (col.id === 'space') return (
                              <td key={col.id}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: p.spaceColor, background: `${p.spaceColor}15`, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.spaceColor, display: 'inline-block' }} />{p.spaceName}
                                </span>
                              </td>
                            );
                            if (col.id === 'domain') return <td key={col.id}>{p.domain || <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>;
                            if (col.id === 'projectManager') return <td key={col.id}>{p.projectManager || <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>;
                            if (col.id === 'priority') return <td key={col.id} style={{ textAlign: 'center' }}>{p.priority ? `P${p.priority}` : <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>;
                            if (col.id === 'status') return <td key={col.id}>{p.status ? <span className={`badge ${STATUS_COLORS[p.status] ?? 'badge-gray'}`}>{p.status.replace(/^\d-/, '')}</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>;
                            if (col.id === 'startDate') return <td key={col.id}><span style={{ color: 'var(--text-muted)' }}>{p.startDate ? p.startDate.slice(0, 7) : '—'}</span></td>;
                            if (col.id === 'goLive') return <td key={col.id}><span style={{ color: 'var(--text-muted)' }}>{p.goLive ? p.goLive.slice(0, 7) : '—'}</span></td>;
                            return <td key={col.id} />;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* GANTT VIEW */}
          {viewMode === 'gantt' && (() => {
            const localeStr = ({ fr: 'fr-FR', en: 'en-US', pt: 'pt-BR', zh: 'zh-CN' } as Record<string,string>)[locale] ?? 'fr-FR';
            function db(a: string, b: string) { return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000); }

            const ganttProjects = allProjects
              .filter((p: any) => !fSpace.length || fSpace.includes(p.spaceId))
              .filter((p: any) => !fStatus.length || fStatus.includes(p.status ?? ''))
              .filter((p: any) => p.startDate || p.goLive);

            if (ganttProjects.length === 0) {
              return <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>{t('no_project')}</div>;
            }

            const LEFT_W = 280;
            const DAY_PX = ganttTimeScale === 'week' ? 22 : ganttTimeScale === 'month' ? 8 : ganttTimeScale === 'semester' ? 2.7 : 0.9;
            const ROW_H = 40;

            const projectDates = ganttProjects.flatMap((p: any) => [p.startDate, p.goLive].filter(Boolean) as string[]);
            const minProjDate = projectDates.reduce((a: string, b: string) => a < b ? a : b);
            const maxProjDate = projectDates.reduce((a: string, b: string) => a > b ? a : b);
            const anchorD = new Date(minProjDate);
            const anchorYear = anchorD.getFullYear();
            const anchorMon = anchorD.getMonth();

            let displayMin: string;
            let displayMax: string;
            if (ganttTimeScale === 'week') {
              const d = new Date(minProjDate); const dow = d.getDay(); d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
              displayMin = d.toISOString().slice(0,10);
              const endW = new Date(maxProjDate); endW.setDate(endW.getDate() + 14);
              displayMax = endW.toISOString().slice(0,10);
            } else if (ganttTimeScale === 'month') {
              displayMin = `${anchorYear}-${String(anchorMon + 1).padStart(2,'0')}-01`;
              const endD = new Date(maxProjDate); endD.setMonth(endD.getMonth() + 1);
              displayMax = endD.toISOString().slice(0,10);
            } else if (ganttTimeScale === 'semester') {
              const semStart = anchorMon < 6 ? 0 : 6;
              displayMin = `${anchorYear}-${String(semStart + 1).padStart(2,'0')}-01`;
              displayMax = `${new Date(maxProjDate).getFullYear()}-12-31`;
            } else {
              displayMin = `${anchorYear}-01-01`;
              displayMax = `${anchorYear + 2}-12-31`;
            }

            const totalDays = Math.max(db(displayMin, displayMax) + 1, 7);
            const chartW = totalDays * DAY_PX;
            const today = new Date().toISOString().slice(0,10);
            const todayX = db(displayMin, today) * DAY_PX;

            const columns: { label: string; left: number; width: number }[] = [];
            if (ganttTimeScale === 'week') {
              let cur = new Date(displayMin); const dow = cur.getDay(); cur.setDate(cur.getDate() - (dow === 0 ? 6 : dow - 1));
              while (db(displayMin, cur.toISOString().slice(0,10)) < totalDays) {
                const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
                const left = Math.max(0, db(displayMin, cur.toISOString().slice(0,10))) * DAY_PX;
                const right = Math.min(totalDays, db(displayMin, wEnd.toISOString().slice(0,10)) + 1) * DAY_PX;
                columns.push({ label: cur.toLocaleDateString(localeStr, { day: 'numeric', month: 'short' }), left, width: right - left });
                cur.setDate(cur.getDate() + 7);
              }
            } else if (ganttTimeScale === 'semester') {
              let cur = new Date(displayMin); cur.setMonth(cur.getMonth() < 6 ? 0 : 6, 1);
              while (db(displayMin, cur.toISOString().slice(0,10)) < totalDays) {
                const isS1 = cur.getMonth() === 0;
                const sEnd = new Date(cur.getFullYear(), isS1 ? 5 : 11, isS1 ? 30 : 31);
                const left = Math.max(0, db(displayMin, cur.toISOString().slice(0,10))) * DAY_PX;
                const right = Math.min(totalDays, db(displayMin, sEnd.toISOString().slice(0,10)) + 1) * DAY_PX;
                columns.push({ label: `S${isS1 ? 1 : 2} ${cur.getFullYear()}`, left, width: right - left });
                cur.setMonth(cur.getMonth() + 6);
              }
            } else if (ganttTimeScale === 'year') {
              let cur = new Date(displayMin); cur.setMonth(0, 1);
              while (db(displayMin, cur.toISOString().slice(0,10)) < totalDays) {
                const yEnd = new Date(cur.getFullYear(), 11, 31);
                const left = Math.max(0, db(displayMin, cur.toISOString().slice(0,10))) * DAY_PX;
                const right = Math.min(totalDays, db(displayMin, yEnd.toISOString().slice(0,10)) + 1) * DAY_PX;
                columns.push({ label: String(cur.getFullYear()), left, width: right - left });
                cur.setFullYear(cur.getFullYear() + 1);
              }
            } else {
              let cur = new Date(displayMin); cur.setDate(1);
              while (db(displayMin, cur.toISOString().slice(0,10)) < totalDays) {
                const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
                const left = Math.max(0, db(displayMin, cur.toISOString().slice(0,10))) * DAY_PX;
                const right = Math.min(totalDays, db(displayMin, mEnd.toISOString().slice(0,10)) + 1) * DAY_PX;
                columns.push({ label: cur.toLocaleDateString(localeStr, { month: 'short', year: '2-digit' }), left, width: right - left });
                cur.setMonth(cur.getMonth() + 1);
              }
            }

            const statusColor: Record<string, string> = {
              '3-In progress': 'var(--success)', '2-Validated': 'var(--accent)',
              '1-To arbitrate': 'var(--text-faint)', '4-Frozen': 'var(--warning)',
              '5-Completed': 'var(--purple)', '6-Aborted': 'var(--danger)',
            };

            return (
              <div className="card card-table" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 230px)' }}>
                  <div style={{ minWidth: LEFT_W + chartW }}>
                    {/* Header */}
                    <div style={{ display: 'flex', background: '#3D3A4E', position: 'sticky', top: 0, zIndex: 30 }}>
                      <div style={{ width: LEFT_W, minWidth: LEFT_W, flexShrink: 0, height: 38, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' as const, letterSpacing: '0.07em', position: 'sticky', left: 0, zIndex: 35, background: '#3D3A4E', borderRight: '1px solid rgba(255,255,255,0.10)' }}>
                        {t('project_name')}
                      </div>
                      <div style={{ width: chartW, flexShrink: 0, position: 'relative', height: 38 }}>
                        {columns.map((col, i) => (
                          <div key={i} style={{ position: 'absolute', left: col.left, width: col.width, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.10)', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' as const, letterSpacing: '0.04em', overflow: 'hidden' }}>
                            {col.label}
                          </div>
                        ))}
                        {todayX >= 0 && todayX <= chartW && (
                          <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, background: 'var(--accent)', opacity: 0.5 }} />
                        )}
                      </div>
                    </div>
                    {/* Project rows */}
                    {ganttProjects.map((p: any, idx: number) => {
                      const barStart = p.startDate ? db(displayMin, p.startDate) : null;
                      const barGl = p.goLive ? db(displayMin, p.goLive) : null;
                      const hasBar = barStart !== null && barGl !== null;
                      const color = statusColor[p.status ?? ''] ?? 'var(--accent)';
                      const bg = idx % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)';
                      return (
                        <div key={idx} style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: bg, minHeight: ROW_H }}>
                          <div style={{ width: LEFT_W, minWidth: LEFT_W, flexShrink: 0, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6, position: 'sticky', left: 0, zIndex: 20, background: bg, borderRight: '1px solid var(--border)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: p.spaceColor, background: `${p.spaceColor}18`, borderRadius: 10, padding: '1px 5px', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.spaceColor, display: 'inline-block' }} />
                              {p.spaceName}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }} title={p.name}>{p.name}</span>
                          </div>
                          <div style={{ width: chartW, flexShrink: 0, position: 'relative', height: ROW_H }}>
                            {columns.map((col, i) => (
                              <div key={i} style={{ position: 'absolute', left: col.left, top: 0, bottom: 0, width: 1, background: 'var(--border)', opacity: 0.5 }} />
                            ))}
                            {todayX >= 0 && todayX <= chartW && (
                              <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, background: 'var(--accent)', opacity: 0.35, zIndex: 4 }} />
                            )}
                            {hasBar && barStart! * DAY_PX <= chartW && barGl! * DAY_PX >= 0 && (
                              <div style={{ position: 'absolute', left: Math.max(0, barStart!) * DAY_PX, width: Math.max(4, Math.min(chartW, barGl! * DAY_PX) - Math.max(0, barStart!) * DAY_PX), top: 9, height: 20, background: color, borderRadius: 4, zIndex: 3, opacity: 0.85 }} title={`${p.name}: ${p.startDate} → ${p.goLive}`} />
                            )}
                            {barGl !== null && barGl * DAY_PX >= -4 && barGl * DAY_PX <= chartW + 4 && (
                              <div style={{ position: 'absolute', left: barGl * DAY_PX - 6, top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: 11, height: 11, background: color, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,.2)', zIndex: 5 }} title={`Go-live: ${p.goLive}`} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
