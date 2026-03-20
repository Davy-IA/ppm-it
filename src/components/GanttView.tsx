'use client';
import { useState } from 'react';
import { useSettings } from '@/lib/context';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { AppData, GanttPhase, GanttSubphase, Milestone } from '@/types';
import { v4 as uuid } from 'uuid';

interface Props { data: AppData; updateData: (d: AppData) => void; }

const PHASE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
const DAY_PX = 26;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
// fmt is locale-aware (defined inside component)

function propagateDeps(phases: GanttPhase[]): GanttPhase[] {
  const map: Record<string, GanttPhase> = {};
  const result = phases.map(p => ({ ...p, subphases: p.subphases.map(s => ({ ...s })) }));
  result.forEach(p => { map[p.id] = p; });
  const visited = new Set<string>();
  const order: string[] = [];
  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    if (map[id]?.dependsOn) visit(map[id].dependsOn!);
    order.push(id);
  }
  result.forEach(p => visit(p.id));
  order.forEach(id => {
    const p = map[id];
    if (!p) return;
    if (p.dependsOn && map[p.dependsOn]) {
      const dep = map[p.dependsOn];
      p.startDate = addDays(dep.startDate, dep.duration);
    }
    const sm: Record<string, GanttSubphase> = {};
    p.subphases.forEach(s => { sm[s.id] = s; });
    const sv = new Set<string>(); const so: string[] = [];
    function vs(sid: string) { if (sv.has(sid)) return; sv.add(sid); if (sm[sid]?.dependsOn) vs(sm[sid].dependsOn!); so.push(sid); }
    p.subphases.forEach(s => vs(s.id));
    so.forEach(sid => {
      const s = sm[sid]; if (!s) return;
      if (s.dependsOn && sm[s.dependsOn]) s.startDate = addDays(sm[s.dependsOn].startDate, sm[s.dependsOn].duration);
    });
  });
  return result;
}

function getRange(phases: GanttPhase[], extra?: string | null) {
  if (!phases.length) return null;
  const all = phases.flatMap(p => [p.startDate, addDays(p.startDate, p.duration)]);
  if (extra) all.push(extra);
  return { start: all.reduce((a,b)=>a<b?a:b), end: all.reduce((a,b)=>a>b?a:b) };
}

export default function GanttView({ data, updateData }: Props) {
  const { settings, t } = useSettings();
  const locale = settings.locale ?? 'fr';
  const fmt = (d: string) => formatDate(d, locale);
  const [selProj, setSelProj] = useState(data.projects[0]?.id ?? '');
  const [editPhase, setEditPhase] = useState<GanttPhase | null>(null);
  const [editSub, setEditSub] = useState<{ sub: GanttSubphase; phase: GanttPhase } | null>(null);
  const [addSubPhase, setAddSubPhase] = useState<GanttPhase | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null);
  const [isNewMilestone, setIsNewMilestone] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [timeScale, setTimeScale] = useState<'week' | 'month' | 'year'>('month');
  const [showScaleMenu, setShowScaleMenu] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Filtered + alpha-sorted project list for selector
  const filteredProjects = data.projects
    .filter(p => !statusFilter || p.status === statusFilter)
    .filter(p => !domainFilter || p.domain === domainFilter)
    .filter(p => !deptFilter || p.leadDept === deptFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Auto-select first project if current selection is filtered out
  const selProjValid = filteredProjects.some(p => p.id === selProj);

  const project = data.projects.find(p => p.id === selProj);
  const milestones: Milestone[] = [
    // Auto Go-Live milestone from project date
    ...(project?.goLive ? [{
      id: `auto-golive-${selProj}`,
      projectId: selProj,
      name: t('go_live') as string,
      date: project.goLive,
      type: 'Go-Live',
      isAutoGoLive: true,
    }] : []),
    // Manual milestones
    ...(data.milestones ?? []).filter(m => m.projectId === selProj),
  ];
  const rawPhases = data.ganttPhases.filter(p => p.projectId === selProj);
  const phases = propagateDeps(rawPhases);

  const saveMilestones = (next: Milestone[]) => {
    const others = (data.milestones ?? []).filter(m => m.projectId !== selProj);
    updateData({ ...data, milestones: [...others, ...next] });
  };

  const savePhases = (next: GanttPhase[]) => {
    const others = data.ganttPhases.filter(p => p.projectId !== selProj);
    updateData({ ...data, ganttPhases: [...others, ...propagateDeps(next)] });
  };

  const range = getRange(phases, project?.goLive);
  const ganttEnd = phases.length ? phases.flatMap(p => [addDays(p.startDate, p.duration)]).reduce((a,b)=>a>b?a:b) : null;
  const goLive = project?.goLive ?? null;
  const hypercare = (project as any)?.hypercare ?? null;
  const endDeadline = hypercare ?? goLive; // use hypercare as deadline if set
  const overdue = ganttEnd && endDeadline && ganttEnd > endDeadline;

  // ── Chart
  // Dynamic px per day based on time scale
  const DAY_PX_DYN = timeScale === 'week' ? 42 : timeScale === 'month' ? 17 : 4;

  // For year view: pad to cover full project duration nicely
  const minDate = timeScale === 'year' && range
    ? `${new Date(range.start).getFullYear()}-01-01`
    : range?.start ?? new Date().toISOString().slice(0,10);
  const maxDate = timeScale === 'year' && range
    ? `${new Date(range.end).getFullYear()}-12-31`
    : range?.end ?? addDays(minDate, 90);
  const totalDays = Math.max(daysBetween(minDate, maxDate) + (timeScale === 'year' ? 0 : 14), 60);
  const chartW = totalDays * DAY_PX_DYN;
  const LEFT_W = 260;
  const today = new Date().toISOString().slice(0,10);
  const todayX = daysBetween(minDate, today) * DAY_PX_DYN;
  const goLiveX = goLive ? daysBetween(minDate, goLive) * DAY_PX_DYN : null;
  const hypercareX = hypercare ? daysBetween(minDate, hypercare) * DAY_PX_DYN : null;

  // Time columns based on scale
  const months: { label: string; left: number; width: number }[] = [];
  const localeStr = ({ fr: 'fr-FR', en: 'en-US', pt: 'pt-BR', zh: 'zh-CN' } as Record<string,string>)[locale] ?? 'fr-FR';

  if (timeScale === 'week') {
    // Week columns — start from Monday of minDate week
    let cur = new Date(minDate);
    const dow = cur.getDay(); // 0=Sun
    cur.setDate(cur.getDate() - (dow === 0 ? 6 : dow - 1));
    while (cur.toISOString().slice(0,10) <= addDays(minDate, totalDays)) {
      const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
      const left = Math.max(0, daysBetween(minDate, cur.toISOString().slice(0,10))) * DAY_PX_DYN;
      const right = Math.min(totalDays, daysBetween(minDate, wEnd.toISOString().slice(0,10))) * DAY_PX_DYN;
      const label = cur.toLocaleDateString(localeStr, { day: 'numeric', month: 'short' });
      months.push({ label, left, width: right - left });
      cur.setDate(cur.getDate() + 7);
    }
  } else if (timeScale === 'year') {
    // Quarter columns
    let cur = new Date(minDate); cur.setMonth(Math.floor(cur.getMonth()/3)*3, 1);
    while (cur.toISOString().slice(0,10) <= addDays(minDate, totalDays)) {
      const qEnd = new Date(cur); qEnd.setMonth(qEnd.getMonth()+3, 0);
      const left = Math.max(0, daysBetween(minDate, cur.toISOString().slice(0,10))) * DAY_PX_DYN;
      const right = Math.min(totalDays, daysBetween(minDate, qEnd.toISOString().slice(0,10))) * DAY_PX_DYN;
      const q = Math.floor(cur.getMonth()/3)+1;
      months.push({ label: `Q${q} ${cur.getFullYear()}`, left, width: right - left });
      cur.setMonth(cur.getMonth()+3);
    }
  } else {
    // Month columns (default)
    let cur = new Date(minDate); cur.setDate(1);
    while (cur.toISOString().slice(0,10) <= addDays(minDate, totalDays)) {
      const mEnd = new Date(cur.getFullYear(), cur.getMonth()+1, 0);
      const left = Math.max(0, daysBetween(minDate, cur.toISOString().slice(0,10))) * DAY_PX_DYN;
      const right = Math.min(totalDays, daysBetween(minDate, mEnd.toISOString().slice(0,10))) * DAY_PX_DYN;
      months.push({ label: cur.toLocaleDateString(localeStr, {month:'short',year:'2-digit'}), left, width: right - left });
      cur.setMonth(cur.getMonth()+1);
    }
  }

  return (
    <div className="animate-in">
      <div className="page-sticky-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Pre-filters */}
          <select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSelProj(''); }} style={{ maxWidth: 155 }}>
            <option value="">{t('all_statuses')}</option>
            {['1-To arbitrate','2-Validated','3-In progress','4-Frozen','5-Completed','6-Aborted'].map(s => (
              <option key={s} value={s}>{s.replace(/^\d-/, '')}</option>
            ))}
          </select>
          <select className="input" value={domainFilter} onChange={e => { setDomainFilter(e.target.value); setSelProj(''); }} style={{ maxWidth: 115 }}>
            <option value="">{t('all_domains')}</option>
            {['APPLI','INFRA','INNOV','DATA'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input" value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setSelProj(''); }} style={{ maxWidth: 155 }}>
            <option value="">{t('all_depts')}</option>
            {data.projects.map(p => p.leadDept).filter((v, i, a) => v && a.indexOf(v) === i).sort().map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {(statusFilter || domainFilter || deptFilter) && (
            <button onClick={() => { setStatusFilter(''); setDomainFilter(''); setDeptFilter(''); }}
              style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              ✕ {t('clear_filters')}
            </button>
          )}
          <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
          {/* Project selector */}
          <select className="input"
            value={selProjValid ? selProj : (filteredProjects[0]?.id ?? '')}
            onChange={e => setSelProj(e.target.value)}
            style={{ maxWidth: 300, fontWeight: 600 }}>
            {filteredProjects.length === 0
              ? <option value="">{t('no_project')}</option>
              : filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
            }
          </select>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{filteredProjects.length}/{data.projects.length}</span>
          {project?.startDate && <span className="badge badge-blue">{t('gantt_start')} : {fmt(project.startDate)}</span>}
          {goLive && <span className="badge badge-purple">{t('go_live')} : {fmt(goLive)}</span>}
          <div style={{ flex: 1 }} />
          {/* Scale selector */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowScaleMenu(m => !m)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M1 3h10M1 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              {timeScale === 'week' ? t('scale_week') : timeScale === 'month' ? t('scale_month') : t('scale_year')}
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
            {showScaleMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowScaleMenu(false)} />
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(99,102,241,0.15)', zIndex: 50, overflow: 'hidden', minWidth: 140 }}>
                  {(['week', 'month', 'year'] as const).map(scale => (
                    <button key={scale} onClick={() => { setTimeScale(scale); setShowScaleMenu(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: timeScale === scale ? 'var(--accent-subtle)' : 'none', color: timeScale === scale ? 'var(--accent)' : 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: timeScale === scale ? 700 : 400, fontFamily: 'inherit', textAlign: 'left' }}>
                      {timeScale === scale && <span style={{ color: 'var(--accent)', fontSize: 10 }}>✓</span>}
                      {scale === 'week' ? t('scale_week') : scale === 'month' ? t('scale_month') : t('scale_year')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* + New dropdown */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-primary" onClick={() => setShowNewMenu(m => !m)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              + {t('new_btn')}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.8 }}>
                <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showNewMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowNewMenu(false)} />
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(99,102,241,0.15)', zIndex: 50, overflow: 'hidden', minWidth: 160, animation: 'dropIn 0.12s ease' }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    onClick={() => {
                      setShowNewMenu(false);
                      setEditPhase({ id: uuid(), projectId: selProj, name: '', startDate: new Date().toISOString().slice(0,10), duration: 30, color: PHASE_COLORS[phases.length % PHASE_COLORS.length], dependsOn: null, subphases: [] } as unknown as GanttPhase);
                      setIsNew(true);
                    }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="8" height="3" rx="1.5" fill="var(--accent)"/><rect x="4" y="8" width="9" height="3" rx="1.5" fill="var(--accent)" opacity="0.5"/></svg>
                    <span><strong>{t('new_phase')}</strong><div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{t('phase_hint')}</div></span>
                  </button>
                  <div style={{ height: 1, background: 'var(--border)', margin: '0 10px' }} />
                  <button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    onClick={() => {
                      setShowNewMenu(false);
                      setEditMilestone({ id: uuid(), projectId: selProj, name: '', date: project?.goLive ?? new Date().toISOString().slice(0,10), type: (settings.milestoneTypes as any)?.[1] ?? 'Kick-off', isAutoGoLive: false });
                      setIsNewMilestone(true);
                    }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 7L7 13L1 7L7 1Z" fill="var(--accent2)"/></svg>
                    <span><strong>{t('new_milestone')}</strong><div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{t('milestone_hint')}</div></span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {/* KPI row — second line of sticky header */}
        {phases.length > 0 && range && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
            {[
              { label: t('gantt_start'), value: fmt(range.start) },
              { label: t('gantt_end'), value: fmt(ganttEnd!), danger: !!overdue },
              { label: t('gantt_duration'), value: `${daysBetween(range.start, ganttEnd!)}${t('days')}` },
              { label: t('gantt_phases'), value: `${phases.length} ${String(t('gantt_phases')).toLowerCase()}` },
              { label: t('gantt_subphases'), value: `${phases.reduce((s,p)=>s+p.subphases.length,0)} ${String(t('gantt_subphases')).toLowerCase()}` },
            ].map(k => (
              <span key={k.label} style={{ fontSize: 12, fontWeight: 600, color: k.danger ? 'var(--danger)' : 'var(--text-muted)', background: 'var(--bg3)', border: `1px solid ${k.danger ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' as const }}>
                {k.label} : <span style={{ color: k.danger ? 'var(--danger)' : 'var(--text)', fontWeight: 700 }}>{k.value}</span>
              </span>
            ))}
            <div style={{ marginLeft: 'auto' }}>
              {overdue && ganttEnd && endDeadline && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--danger)', background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 20, padding: '3px 12px' }}>
                  ⚠ {t('overdue_alert').replace('{end}', fmt(ganttEnd)).replace('{golive}', fmt(endDeadline))}
                </span>
              )}
              {!overdue && ganttEnd && goLive && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--success)', background: 'var(--success-subtle)', border: '1px solid var(--success)', borderRadius: 20, padding: '3px 12px' }}>
                  ✓ {t('gantt_ok').replace('{end}', fmt(ganttEnd??'')).replace('{golive}', fmt(endDeadline??''))}
                </span>
              )}
            </div>
          </div>
        )}
      </div>



      {/* Gantt grid */}
      {phases.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:60, color:'var(--text-faint)' }}>
          <div style={{fontSize:48,marginBottom:12}}>📅</div>
          <div style={{fontWeight:700,fontSize:16,color:'var(--text-muted)',marginBottom:6}}>{t('no_phases')}</div>
          <div style={{fontSize:13}}>{t('no_phases_cta')}</div>
        </div>
      ) : (
        <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'var(--bg2)', boxShadow:'var(--shadow-sm)', marginTop: 12 }}>
          <div style={{ overflowX:'auto' }}>
            <div style={{ minWidth: LEFT_W + chartW }}>
              {/* Sticky header row */}
              <div style={{ display:'flex', background:'var(--bg3)', borderBottom:'2px solid var(--border)' }}>
                <div style={{ width:LEFT_W, minWidth:LEFT_W, flexShrink:0, borderRight:'1px solid var(--border)', height:40, display:'flex', alignItems:'center', padding:'0 16px' }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-faint)' }}>{t('structure')}</span>
                </div>
                <div style={{ flex:1, position:'relative', height:40 }}>
                  {months.map((m,i) => (
                    <div key={i} style={{ position:'absolute', left:m.left, width:m.width, height:'100%', display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'capitalize' }}>{m.label}</div>
                  ))}
                </div>
              </div>
              {/* Body row */}
              <div style={{ display:'flex' }}>
              {/* Labels */}
              <div style={{ width:LEFT_W, minWidth:LEFT_W, borderRight:'1px solid var(--border)', flexShrink:0 }}>
                {phases.map(ph => (
                  <div key={ph.id}>
                    <div style={{ height:40, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 8px', gap:6, background:'var(--bg2)' }}>
                      <button onClick={() => {
                        const updated = phases.map(p => p.id === ph.id ? {...p, collapsed:!p.collapsed} : p);
                        savePhases(updated);
                      }} style={{background:'none',border:'none',cursor:'pointer',fontSize:10,color:'var(--text-faint)',width:16,flexShrink:0}}>
                        {ph.collapsed ? '▶' : '▼'}
                      </button>
                      <div style={{width:10,height:10,borderRadius:3,background:ph.color||'#6366f1',flexShrink:0}}/>
                      <span style={{fontWeight:700,fontSize:12,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ph.name}</span>
                      <div style={{display:'flex',gap:2,flexShrink:0}}>
                        <button className="btn-icon" style={{width:22,height:22,fontSize:11}} onClick={()=>{setAddSubPhase(ph);setIsNew(true);}} title="+ Sous-phase">＋</button>
                        <button className="btn-icon" style={{width:22,height:22,fontSize:11}} onClick={()=>{setEditPhase({...ph});setIsNew(false);}}>✎</button>
                        <button className="btn-icon" style={{width:22,height:22,fontSize:11,color:'var(--danger)'}} onClick={()=>{if(!confirm(t('delete_phase_confirm' as any) || 'Delete this phase?'))return; savePhases(phases.filter(p=>p.id!==ph.id).map(p=>p.dependsOn===ph.id?{...p,dependsOn:null}:p));}}>✕</button>
                      </div>
                    </div>
                    {!ph.collapsed && ph.subphases.map(sub => (
                      <div key={sub.id} style={{ height:34, borderBottom:'1px solid var(--border)', background:'var(--bg3)', display:'flex', alignItems:'center', padding:'0 8px 0 30px', gap:6 }}>
                        <div style={{width:7,height:7,borderRadius:2,background:ph.color||'#10b981',opacity:0.6,flexShrink:0}}/>
                        <span style={{fontSize:12,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text-muted)'}}>{sub.name}</span>
                        <div style={{display:'flex',gap:2,flexShrink:0}}>
                          <button className="btn-icon" style={{width:20,height:20,fontSize:10}} onClick={()=>{setEditSub({sub:{...sub},phase:ph});setIsNew(false);}}>✎</button>
                          <button className="btn-icon" style={{width:20,height:20,fontSize:10,color:'var(--danger)'}} onClick={()=>{const updated=phases.map(p=>p.id===ph.id?{...p,subphases:p.subphases.filter(s=>s.id!==sub.id)}:p);savePhases(updated);}}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div style={{ flex:1, position:'relative', minWidth: chartW }}>
                {/* Bars area */}
                <div style={{ position:'relative', width:chartW }}>
                  {/* Grid lines */}
                  {months.map((m,i) => <div key={i} style={{ position:'absolute', left:m.left, top:0, bottom:0, width:1, background:'var(--border)', zIndex:1 }}/>)}

                  {/* Today */}
                  {todayX>=0 && todayX<=chartW && <div style={{ position:'absolute', left:todayX, top:0, bottom:0, width:2, background:'var(--accent)', opacity:0.7, zIndex:6 }}>
                    <div style={{ position:'absolute', top:2, left:3, background:'var(--accent)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4, whiteSpace:'nowrap' }}>{t('today')}</div>
                  </div>}

                  {/* Go-live */}
                  {goLiveX!=null && goLiveX>=0 && goLiveX<=chartW+200 && <div style={{ position:'absolute', left:goLiveX, top:0, bottom:0, width:2, background:overdue?'var(--danger)':'var(--success)', opacity:0.85, zIndex:6 }}>
                    <div style={{ position:'absolute', top:2, left:3, background:overdue?'var(--danger)':'var(--success)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4, whiteSpace:'nowrap' }}>{t('go_live')}</div>
                  </div>}

                  {/* Hypercare end line */}
                  {hypercareX!=null && hypercareX>=0 && hypercareX<=chartW+200 && <div style={{ position:'absolute', left:hypercareX, top:0, bottom:0, width:2, borderLeft:'2px dashed var(--purple)', opacity:0.7, zIndex:6 }}>
                    <div style={{ position:'absolute', top:2, left:3, background:'var(--purple)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4, whiteSpace:'nowrap' }}>{t('hypercare_date')}</div>
                  </div>}

                  {/* Milestone diamonds ◆ on phase bars */}
                  {milestones.filter(m => !m.isAutoGoLive).map(m => {
                    const mx = daysBetween(minDate, m.date) * DAY_PX_DYN;
                    if (mx < -20 || mx > chartW + 20) return null;
                    return (
                      <div key={m.id}
                        onClick={() => { setEditMilestone({...m}); setIsNewMilestone(false); }}
                        title={`${m.name} — ${fmt(m.date)}`}
                        style={{ position:'absolute', left: mx - 8, top: 0, zIndex: 8, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <div style={{ width:0, height:0, borderLeft:'8px solid transparent', borderRight:'8px solid transparent', borderBottom:'12px solid var(--accent2)' }}/>
                        <div style={{ width:0, height:0, borderLeft:'8px solid transparent', borderRight:'8px solid transparent', borderTop:'12px solid var(--accent2)', marginTop:-1 }}/>
                        <div style={{ fontSize:9, fontWeight:700, color:'var(--accent2)', whiteSpace:'nowrap', marginTop:2, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis' }}>{m.name}</div>
                      </div>
                    );
                  })}

                  {phases.map(ph => {
                    const px = daysBetween(minDate, ph.startDate)*DAY_PX_DYN;
                    const pw = Math.max(ph.duration*DAY_PX_DYN, 16);
                    return (
                      <div key={ph.id}>
                        {/* Phase row */}
                        <div style={{ position:'relative', height:40, borderBottom:'1px solid var(--border)' }}>
                          <div style={{ position:'absolute', top:7, left:px, width:pw, height:26, borderRadius:6, background:ph.color||'#6366f1', cursor:'pointer', display:'flex', alignItems:'center', padding:'0 8px', zIndex:3, boxShadow:'0 2px 8px rgba(0,0,0,0.15)', transition:'opacity 0.15s' }}
                            onClick={()=>{setEditPhase({...ph});setIsNew(false);}}
                            title={`${ph.name} — ${fmt(ph.startDate)} → ${fmt(addDays(ph.startDate,ph.duration))} (${ph.duration}j)`}>
                            {pw>60 && <span style={{fontSize:11,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ph.name}</span>}
                          </div>
                        </div>
                        {/* Subphase rows */}
                        {!ph.collapsed && ph.subphases.map(sub => {
                          const sx = daysBetween(minDate, sub.startDate)*DAY_PX;
                          const sw = Math.max(sub.duration*DAY_PX, 10);
                          return (
                            <div key={sub.id} style={{ position:'relative', height:34, borderBottom:'1px solid var(--border)', background:'var(--bg3)' }}>
                              <div style={{ position:'absolute', top:6, left:sx, width:sw, height:22, borderRadius:5, background:ph.color||'#10b981', opacity:0.72, cursor:'pointer', display:'flex', alignItems:'center', padding:'0 6px', zIndex:3, transition:'opacity 0.15s' }}
                                onClick={()=>{setEditSub({sub:{...sub},phase:ph});setIsNew(false);}}
                                title={`${sub.name} — ${fmt(sub.startDate)} → ${fmt(addDays(sub.startDate,sub.duration))} (${sub.duration}j)`}>
                                {sw>44 && <span style={{fontSize:10,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub.name}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>{/* end body flex row */}
            </div>
          </div>
        </div>
      )}

      {/* Phase Modal */}
      {editPhase && (
        <div className="modal-overlay" onClick={()=>{setEditPhase(null);setIsNew(false);}}>
          <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,fontSize:15}}>{isNew?t('new_phase_title'):t('edit_phase_title')}</span>
              <button className="btn-icon" onClick={()=>{setEditPhase(null);setIsNew(false);}}>✕</button>
            </div>
            <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>{t('field_phase_name')}</label>
                <input className="input" value={editPhase.name} onChange={e=>setEditPhase({...editPhase,name:e.target.value})} placeholder="Ex: Cadrage & Discovery"/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>{t('field_start')}</label>
                  <input type="date" className="input" value={editPhase.startDate} onChange={e=>setEditPhase({...editPhase,startDate:e.target.value})} disabled={!!editPhase.dependsOn} style={{opacity:editPhase.dependsOn?0.5:1}}/>
                  {editPhase.dependsOn && <div style={{fontSize:11,color:'var(--text-faint)',marginTop:4}}>{t('gantt_calculated_from')}</div>}
                </div>
                <div>
                  <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>{t('field_duration')}</label>
                  <input type="number" min={1} className="input" value={editPhase.duration} onChange={e=>setEditPhase({...editPhase,duration:parseInt(e.target.value)||1})}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>{t('field_depends_on')}</label>
                <select className="input" value={editPhase.dependsOn??''} onChange={e=>setEditPhase({...editPhase,dependsOn:e.target.value||null})}>
                  <option value="">{t('no_dependency')}</option>
                  {phases.filter(p=>p.id!==editPhase.id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:8}}>{t('field_color')}</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {PHASE_COLORS.map(c=><button key={c} onClick={()=>setEditPhase({...editPhase,color:c})} style={{width:28,height:28,borderRadius:6,border:editPhase.color===c?'3px solid var(--text)':'2px solid transparent',background:c,cursor:'pointer'}}/>)}
                </div>
              </div>
            </div>
            <div style={{padding:'16px 24px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:10}}>
              <button className="btn btn-ghost" onClick={()=>{setEditPhase(null);setIsNew(false);}}>{t('cancel')}</button>
              <button className="btn btn-primary" disabled={!editPhase.name} onClick={()=>{
                const exist = phases.find(p=>p.id===editPhase.id);
                const updated = exist ? phases.map(p=>p.id===editPhase.id?editPhase:p) : [...phases,editPhase];
                savePhases(updated); setEditPhase(null); setIsNew(false);
              }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Subphase Modal */}
      {(editSub || addSubPhase) && (() => {
        const parentPhase = editSub?.phase ?? addSubPhase!;
        const subForm: GanttSubphase = editSub?.sub ?? { id:uuid(), phaseId:parentPhase.id, name:'', startDate:parentPhase.startDate, duration:14, dependsOn:null };
        return (
          <div className="modal-overlay" onClick={()=>{setEditSub(null);setAddSubPhase(null);}}>
            <div className="modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
              <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <span style={{fontWeight:700,fontSize:15}}>{isNew ? t('new_subphase') : t('edit_subphase')}</span>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Phase : {parentPhase.name}</div>
                </div>
                <button className="btn-icon" onClick={()=>{setEditSub(null);setAddSubPhase(null);}}>✕</button>
              </div>
              <SubForm
                initial={subForm}
                phase={parentPhase}
                onSave={sub => {
                  const ph = phases.find(p=>p.id===parentPhase.id)!;
                  const exist = ph.subphases.find(s=>s.id===sub.id);
                  const newSubs = exist ? ph.subphases.map(s=>s.id===sub.id?sub:s) : [...ph.subphases,sub];
                  savePhases(phases.map(p=>p.id===ph.id?{...p,subphases:newSubs}:p));
                  setEditSub(null); setAddSubPhase(null);
                }}
                onClose={()=>{setEditSub(null);setAddSubPhase(null);}}
              />
            </div>
          </div>
        );
      })()}
      {/* Milestone Modal */}
      {editMilestone && (
        <div className="modal-overlay" onClick={() => { setEditMilestone(null); setIsNewMilestone(false); }}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>◆ {isNewMilestone ? t('new_milestone') : t('edit_milestone')}</span>
              <button className="btn-icon" onClick={() => { setEditMilestone(null); setIsNewMilestone(false); }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('field_name_required')}</label>
                <input className="input" value={editMilestone.name} onChange={e => setEditMilestone({ ...editMilestone, name: e.target.value })} placeholder={String(t('milestone_name'))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('milestone_type')}</label>
                <select className="input" value={editMilestone.type} onChange={e => setEditMilestone({ ...editMilestone, type: e.target.value })}>
                  {((settings.milestoneTypes as any) ?? ['Kick-off', 'UAT', 'Go-Live']).filter((mt: string) => mt !== 'Go-Live').map((mt: string) => (
                    <option key={mt} value={mt}>{mt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('milestone_date')}</label>
                <input type="date" className="input" value={editMilestone.date} onChange={e => setEditMilestone({ ...editMilestone, date: e.target.value })} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              {!isNewMilestone && (
                <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => {
                  saveMilestones((data.milestones ?? []).filter(m => m.id !== editMilestone.id && m.projectId === selProj));
                  setEditMilestone(null);
                }}>{t('delete')}</button>
              )}
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                <button className="btn btn-ghost" onClick={() => { setEditMilestone(null); setIsNewMilestone(false); }}>{t('cancel')}</button>
                <button className="btn btn-primary" disabled={!editMilestone.name || !editMilestone.date} onClick={() => {
                  const existing = (data.milestones ?? []).filter(m => m.projectId === selProj);
                  const found = existing.find(m => m.id === editMilestone.id);
                  const next = found ? existing.map(m => m.id === editMilestone.id ? editMilestone : m) : [...existing, editMilestone];
                  saveMilestones(next); setEditMilestone(null); setIsNewMilestone(false);
                }}>{t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function SubForm({ initial, phase, onSave, onClose }: { initial: GanttSubphase; phase: GanttPhase; onSave: (s: GanttSubphase) => void; onClose: () => void }) {
  const { t, settings } = useSettings();
  const [form, setForm] = useState<GanttSubphase>(initial);
  return (
    <>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div>
          <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>{t('field_name_required')}</label>
          <input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={String(t('phase_name_placeholder'))}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div>
            <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>{t('field_start')}</label>
            <input type="date" className="input" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} disabled={!!form.dependsOn} style={{opacity:form.dependsOn?0.5:1}}/>
          </div>
          <div>
            <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>{t('field_duration')}</label>
            <input type="number" min={1} className="input" value={form.duration} onChange={e=>setForm({...form,duration:parseInt(e.target.value)||1})}/>
          </div>
        </div>
        <div>
          <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>{t('sub_depends')}</label>
          <select className="input" value={form.dependsOn??''} onChange={e=>setForm({...form,dependsOn:e.target.value||null})}>
            <option value="">{t('no_sub_dependency')}</option>
            {phase.subphases.filter(s=>s.id!==form.id).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{padding:'16px 24px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:10}}>
        <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary" disabled={!form.name} onClick={()=>form.name&&onSave(form)}>{t('save')}</button>
      </div>
    </>
  );
}
