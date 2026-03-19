'use client';
import { useState } from 'react';
import { useSettings } from '@/lib/context';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { AppData, GanttPhase, GanttSubphase } from '@/types';
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

  const project = data.projects.find(p => p.id === selProj);
  const rawPhases = data.ganttPhases.filter(p => p.projectId === selProj);
  const phases = propagateDeps(rawPhases);

  const savePhases = (next: GanttPhase[]) => {
    const others = data.ganttPhases.filter(p => p.projectId !== selProj);
    updateData({ ...data, ganttPhases: [...others, ...propagateDeps(next)] });
  };

  const range = getRange(phases, project?.goLive);
  const ganttEnd = phases.length ? phases.flatMap(p => [addDays(p.startDate, p.duration)]).reduce((a,b)=>a>b?a:b) : null;
  const goLive = project?.goLive ?? null;
  const overdue = ganttEnd && goLive && ganttEnd > goLive;

  // ── Chart
  const minDate = range?.start ?? new Date().toISOString().slice(0,10);
  const maxDate = range?.end ?? addDays(minDate, 90);
  const totalDays = Math.max(daysBetween(minDate, maxDate) + 14, 60);
  const chartW = totalDays * DAY_PX;
  const LEFT_W = 260;
  const today = new Date().toISOString().slice(0,10);
  const todayX = daysBetween(minDate, today) * DAY_PX;
  const goLiveX = goLive ? daysBetween(minDate, goLive) * DAY_PX : null;

  // Month headers
  const months: { label: string; left: number; width: number }[] = [];
  let cur = new Date(minDate); cur.setDate(1);
  while (cur.toISOString().slice(0,10) <= addDays(minDate, totalDays)) {
    const mEnd = new Date(cur.getFullYear(), cur.getMonth()+1, 0);
    const left = Math.max(0, daysBetween(minDate, cur.toISOString().slice(0,10))) * DAY_PX;
    const right = Math.min(totalDays, daysBetween(minDate, mEnd.toISOString().slice(0,10))) * DAY_PX;
    months.push({ label: cur.toLocaleDateString(({ fr: 'fr-FR', en: 'en-US', pt: 'pt-BR', zh: 'zh-CN' }[locale] ?? 'fr-FR'), {month:'short',year:'2-digit'}), left, width: right - left });
    cur.setMonth(cur.getMonth()+1);
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('gantt_title')}</h1>
          <p className="page-subtitle">{t('gantt_subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditPhase({ id: uuid(), projectId: selProj, name: '', startDate: new Date().toISOString().slice(0,10), duration: 30, color: PHASE_COLORS[phases.length % PHASE_COLORS.length], dependsOn: null, subphases: [] } as unknown as GanttPhase);
          setIsNew(true);
        }}>{t('new_phase')}</button>
      </div>

      {/* Project selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="input" value={selProj} onChange={e => setSelProj(e.target.value)} style={{ maxWidth: 340, fontWeight: 600 }}>
          {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {project?.startDate && <span className="badge badge-blue">{t('gantt_start')} : {fmt(project.startDate)}</span>}
        {goLive && <span className="badge badge-purple">Go-Live : {fmt(goLive)}</span>}
        <span className="badge badge-gray">{phases.length} {t('gantt_phases').toLowerCase()} · {phases.reduce((s,p)=>s+p.subphases.length,0)} {t('gantt_subphases').toLowerCase()}</span>
      </div>

      {/* Coherence alert */}
      {overdue && <div style={{ marginBottom: 14, padding: '12px 16px', background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, fontWeight: 500, display:'flex', gap:10, alignItems:'center' }}>
        <span style={{fontSize:20}}>⚠</span>
        <div><strong>{t('overdue_alert').replace('{end}', fmt(ganttEnd!)).replace('{golive}', fmt(goLive!))}</strong><br/><span style={{fontSize:12,opacity:0.8}}>{t('overdue_hint')}</span></div>
      </div>}
      {!overdue && ganttEnd && goLive && <div style={{ marginBottom: 14, padding: '10px 16px', background: 'var(--success-subtle)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: 13, fontWeight: 600, display:'flex', gap:8, alignItems:'center' }}>
        {t('gantt_ok').replace('{end}', fmt(ganttEnd??'')).replace('{golive}', fmt(goLive??''))}
      </div>}

      {/* KPI row */}
      {phases.length > 0 && range && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { label: t('gantt_start'), value: fmt(range.start) },
            { label: t('gantt_end'), value: fmt(ganttEnd!), danger: !!overdue },
            { label: t('gantt_duration'), value: `${daysBetween(range.start, ganttEnd!)}${t('days')}` },
            { label: t('gantt_phases'), value: phases.length },
            { label: t('gantt_subphases'), value: phases.reduce((s,p)=>s+p.subphases.length,0) },
          ].map(k => (
            <div key={k.label} className="card" style={{ padding: '10px 18px', minWidth: 110 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-faint)', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: k.danger ? 'var(--danger)' : 'var(--text)' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gantt grid */}
      {phases.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:60, color:'var(--text-faint)' }}>
          <div style={{fontSize:48,marginBottom:12}}>📅</div>
          <div style={{fontWeight:700,fontSize:16,color:'var(--text-muted)',marginBottom:6}}>{t('no_phases')}</div>
          <div style={{fontSize:13}}>{t('no_phases_cta')}</div>
        </div>
      ) : (
        <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden', background:'var(--bg2)', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ overflowX:'auto' }}>
            <div style={{ display:'flex', minWidth: LEFT_W + chartW }}>
              {/* Labels */}
              <div style={{ width:LEFT_W, minWidth:LEFT_W, borderRight:'1px solid var(--border)', flexShrink:0 }}>
                <div style={{ height:40, background:'var(--bg3)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 16px' }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-faint)' }}>{t('structure')}</span>
                </div>
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
                {/* Month headers */}
                <div style={{ height:40, background:'var(--bg3)', borderBottom:'1px solid var(--border)', position:'relative' }}>
                  {months.map((m,i) => (
                    <div key={i} style={{ position:'absolute', left:m.left, width:m.width, height:'100%', display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'capitalize' }}>{m.label}</div>
                  ))}
                </div>

                {/* Bars area */}
                <div style={{ position:'relative', width:chartW }}>
                  {/* Grid lines */}
                  {months.map((m,i) => <div key={i} style={{ position:'absolute', left:m.left, top:0, bottom:0, width:1, background:'var(--border)', zIndex:1 }}/>)}

                  {/* Today */}
                  {todayX>=0 && todayX<=chartW && <div style={{ position:'absolute', left:todayX, top:0, bottom:0, width:2, background:'var(--accent)', opacity:0.7, zIndex:6 }}>
                    <div style={{ position:'absolute', top:2, left:3, background:'var(--accent)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4, whiteSpace:'nowrap' }}>Aujourd'hui</div>
                  </div>}

                  {/* Go-live */}
                  {goLiveX!=null && goLiveX>=0 && goLiveX<=chartW+200 && <div style={{ position:'absolute', left:goLiveX, top:0, bottom:0, width:2, background:overdue?'var(--danger)':'var(--success)', opacity:0.85, zIndex:6 }}>
                    <div style={{ position:'absolute', top:2, left:3, background:overdue?'var(--danger)':'var(--success)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4, whiteSpace:'nowrap' }}>Go-Live</div>
                  </div>}

                  {phases.map(ph => {
                    const px = daysBetween(minDate, ph.startDate)*DAY_PX;
                    const pw = Math.max(ph.duration*DAY_PX, 16);
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
                <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>Nom de la phase *</label>
                <input className="input" value={editPhase.name} onChange={e=>setEditPhase({...editPhase,name:e.target.value})} placeholder="Ex: Cadrage & Discovery"/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>Date de début</label>
                  <input type="date" className="input" value={editPhase.startDate} onChange={e=>setEditPhase({...editPhase,startDate:e.target.value})} disabled={!!editPhase.dependsOn} style={{opacity:editPhase.dependsOn?0.5:1}}/>
                  {editPhase.dependsOn && <div style={{fontSize:11,color:'var(--text-faint)',marginTop:4}}>Calculée automatiquement</div>}
                </div>
                <div>
                  <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>Durée (jours)</label>
                  <input type="number" min={1} className="input" value={editPhase.duration} onChange={e=>setEditPhase({...editPhase,duration:parseInt(e.target.value)||1})}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>Dépend de (commence après…)</label>
                <select className="input" value={editPhase.dependsOn??''} onChange={e=>setEditPhase({...editPhase,dependsOn:e.target.value||null})}>
                  <option value="">{t('no_dependency')}</option>
                  {phases.filter(p=>p.id!==editPhase.id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:8}}>Couleur</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {PHASE_COLORS.map(c=><button key={c} onClick={()=>setEditPhase({...editPhase,color:c})} style={{width:28,height:28,borderRadius:6,border:editPhase.color===c?'3px solid var(--text)':'2px solid transparent',background:c,cursor:'pointer'}}/>)}
                </div>
              </div>
            </div>
            <div style={{padding:'16px 24px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:10}}>
              <button className="btn btn-ghost" onClick={()=>{setEditPhase(null);setIsNew(false);}}>Annuler</button>
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
                  <span style={{fontWeight:700,fontSize:15}}>{isNew?'Nouvelle sous-phase':'Modifier sous-phase'}</span>
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
    </div>
  );
}

function SubForm({ initial, phase, onSave, onClose }: { initial: GanttSubphase; phase: GanttPhase; onSave: (s: GanttSubphase) => void; onClose: () => void }) {
  const { t } = useSettings();
  const [form, setForm] = useState<GanttSubphase>(initial);
  return (
    <>
      <div style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div>
          <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>Nom *</label>
          <input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex: Ateliers métier"/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div>
            <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>Date de début</label>
            <input type="date" className="input" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} disabled={!!form.dependsOn} style={{opacity:form.dependsOn?0.5:1}}/>
          </div>
          <div>
            <label style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:6}}>Durée (jours)</label>
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
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" disabled={!form.name} onClick={()=>form.name&&onSave(form)}>{t('save')}</button>
      </div>
    </>
  );
}
