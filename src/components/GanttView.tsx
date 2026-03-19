'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppData, GanttPhase, GanttSubPhase, GANTT_COLORS, Project } from '@/types';
import { v4 as uuid } from 'uuid';

interface Props { data: AppData; }

const DAY_PX = 28; // pixels per day

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// Cascade dependency shifts
function cascadePhases(phases: GanttPhase[]): GanttPhase[] {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  const resolved: GanttPhase[] = [];
  for (let phase of sorted) {
    if (phase.dependsOn) {
      const dep = resolved.find(p => p.id === phase.dependsOn);
      if (dep) {
        const depEnd = addDays(dep.startDate, dep.duration);
        if (phase.startDate < depEnd) {
          phase = { ...phase, startDate: depEnd };
        }
      }
    }
    // Cascade subphases
    const subs = [...phase.subPhases].sort((a, b) => a.order - b.order);
    const resolvedSubs: GanttSubPhase[] = [];
    for (const sub of subs) {
      let s = { ...sub };
      if (s.dependsOn) {
        const dep = resolvedSubs.find(x => x.id === s.dependsOn);
        if (dep) {
          const depEnd = addDays(dep.startDate, dep.duration);
          if (s.startDate < depEnd) s = { ...s, startDate: depEnd };
        }
      }
      resolvedSubs.push(s);
    }
    resolved.push({ ...phase, subPhases: resolvedSubs });
  }
  return resolved;
}

export default function GanttView({ data }: Props) {
  const [selectedProject, setSelectedProject] = useState<string>(data.projects[0]?.id ?? '');
  const [ganttData, setGanttData] = useState<Record<string, GanttPhase[]>>({});
  const [editingPhase, setEditingPhase] = useState<GanttPhase | null>(null);
  const [editingSub, setEditingSub] = useState<{ sub: GanttSubPhase; phaseId: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/gantt').then(r => r.json()).then(setGanttData).catch(() => {});
  }, []);

  const save = useCallback(async (newData: Record<string, GanttPhase[]>) => {
    setGanttData(newData);
    await fetch('/api/gantt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
  }, []);

  const project = data.projects.find(p => p.id === selectedProject);
  const rawPhases = ganttData[selectedProject] ?? [];
  const phases = cascadePhases(rawPhases);

  // Compute gantt range
  const allDates = phases.flatMap(p => [
    p.startDate, addDays(p.startDate, p.duration),
    ...p.subPhases.flatMap(s => [s.startDate, addDays(s.startDate, s.duration)])
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const ganttStart = allDates.length ? allDates.reduce((a, b) => a < b ? a : b) : today;
  const ganttEnd = allDates.length ? allDates.reduce((a, b) => a > b ? a : b) : addDays(today, 90);
  // Pad
  const viewStart = addDays(ganttStart, -7);
  const viewEnd = addDays(ganttEnd, 14);
  const totalDays = diffDays(viewStart, viewEnd);

  // Build month headers
  const months: { label: string; days: number; start: string }[] = [];
  let cur = new Date(viewStart);
  const endD = new Date(viewEnd);
  while (cur < endD) {
    const y = cur.getFullYear(), m = cur.getMonth();
    const monthEnd = new Date(y, m + 1, 1);
    const days = Math.min(Math.round((Math.min(monthEnd.getTime(), endD.getTime()) - cur.getTime()) / 86400000), totalDays);
    months.push({ label: cur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), days, start: cur.toISOString().slice(0, 10) });
    cur = monthEnd;
  }

  const todayOffset = Math.max(0, diffDays(viewStart, today));
  const LEFT_COL = 240;

  function barLeft(date: string) { return Math.max(0, diffDays(viewStart, date)) * DAY_PX; }
  function barWidth(dur: number) { return Math.max(2, dur) * DAY_PX; }

  // Project date vs gantt validation
  const ganttProjectEnd = phases.length ? phases.reduce((acc, p) => {
    const end = addDays(p.startDate, p.duration);
    return end > acc ? end : acc;
  }, '') : '';
  const projectGoLive = project?.goLive ?? null;
  const dateWarning = ganttProjectEnd && projectGoLive && ganttProjectEnd > projectGoLive;

  // ─── PHASE CRUD ───
  const addPhase = () => {
    const lastPhase = phases[phases.length - 1];
    const start = lastPhase ? addDays(lastPhase.startDate, lastPhase.duration) : (project?.startDate ?? today);
    const newPhase: GanttPhase = {
      id: uuid(), projectId: selectedProject, name: 'Nouvelle phase',
      startDate: start, duration: 14,
      color: GANTT_COLORS[phases.length % GANTT_COLORS.length],
      dependsOn: lastPhase ? lastPhase.id : null,
      order: phases.length, subPhases: [],
    };
    setEditingPhase(newPhase); setIsNew(true);
  };

  const savePhase = () => {
    if (!editingPhase) return;
    const existing = rawPhases.filter(p => p.id !== editingPhase.id);
    const updated = [...existing, editingPhase].sort((a, b) => a.order - b.order);
    save({ ...ganttData, [selectedProject]: updated });
    setEditingPhase(null);
  };

  const deletePhase = (id: string) => {
    if (!confirm('Supprimer cette phase ?')) return;
    const updated = rawPhases.filter(p => p.id !== id).map(p => ({
      ...p, dependsOn: p.dependsOn === id ? null : p.dependsOn
    }));
    save({ ...ganttData, [selectedProject]: updated });
  };

  // ─── SUBPHASE CRUD ───
  const addSubPhase = (phaseId: string) => {
    const phase = phases.find(p => p.id === phaseId)!;
    const lastSub = phase.subPhases[phase.subPhases.length - 1];
    const start = lastSub ? addDays(lastSub.startDate, lastSub.duration) : phase.startDate;
    const newSub: GanttSubPhase = {
      id: uuid(), phaseId, name: 'Nouvelle sous-phase',
      startDate: start, duration: 7,
      dependsOn: lastSub ? lastSub.id : null, order: phase.subPhases.length,
    };
    setEditingSub({ sub: newSub, phaseId }); setIsNew(true);
  };

  const saveSubPhase = () => {
    if (!editingSub) return;
    const { sub, phaseId } = editingSub;
    const updated = rawPhases.map(p => {
      if (p.id !== phaseId) return p;
      const subs = p.subPhases.filter(s => s.id !== sub.id);
      return { ...p, subPhases: [...subs, sub].sort((a, b) => a.order - b.order) };
    });
    save({ ...ganttData, [selectedProject]: updated });
    setEditingSub(null);
  };

  const deleteSubPhase = (phaseId: string, subId: string) => {
    if (!confirm('Supprimer cette sous-phase ?')) return;
    const updated = rawPhases.map(p => {
      if (p.id !== phaseId) return p;
      return { ...p, subPhases: p.subPhases.filter(s => s.id !== subId).map(s => ({ ...s, dependsOn: s.dependsOn === subId ? null : s.dependsOn })) };
    });
    save({ ...ganttData, [selectedProject]: updated });
  };

  const toggleCollapse = (id: string) => {
    const next = new Set(collapsed);
    next.has(id) ? next.delete(id) : next.add(id);
    setCollapsed(next);
  };

  const totalWidth = totalDays * DAY_PX;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Planning Gantt</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 3 }}>Phases et jalons par projet</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="input" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ maxWidth: 300, fontWeight: 600 }}>
            {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={addPhase}>+ Phase</button>
        </div>
      </div>

      {/* Date warning */}
      {dateWarning && (
        <div style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--warning)', display: 'flex', gap: 8, alignItems: 'center' }}>
          ⚠ La fin du Gantt ({formatDate(ganttProjectEnd)}) dépasse le Go-Live projet ({formatDate(projectGoLive!)}). Pensez à ajuster les dates dans le portefeuille.
        </div>
      )}

      {/* Info bar */}
      {project && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Démarrage projet', value: project.startDate ? formatDate(project.startDate) : '—', color: 'var(--accent2)' },
            { label: 'Go-Live prévu', value: project.goLive ? formatDate(project.goLive) : '—', color: 'var(--success)' },
            { label: 'Fin Gantt calculée', value: ganttProjectEnd ? formatDate(ganttProjectEnd) : '—', color: dateWarning ? 'var(--danger)' : 'var(--text-muted)' },
            { label: 'Phases', value: String(phases.length), color: 'var(--accent)' },
            { label: 'Sous-phases', value: String(phases.reduce((s, p) => s + p.subPhases.length, 0)), color: 'var(--purple)' },
          ].map(item => (
            <div key={item.label} className="card" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
              <div style={{ fontWeight: 700, color: item.color, fontFamily: 'JetBrains Mono', fontSize: 14 }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gantt chart */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Fixed header row */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: 'var(--bg3)', flexShrink: 0 }}>
          <div style={{ width: LEFT_COL, minWidth: LEFT_COL, padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
            Phase / Sous-phase
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div ref={scrollRef} style={{ overflowX: 'scroll', display: 'flex' }}
              onScroll={e => {
                const ganttBody = document.getElementById('gantt-body-scroll');
                if (ganttBody) ganttBody.scrollLeft = (e.target as HTMLElement).scrollLeft;
              }}
            >
              <div style={{ display: 'flex', width: totalWidth, flexShrink: 0 }}>
                {months.map((m, i) => (
                  <div key={i} className="gantt-header-cell" style={{ width: m.days * DAY_PX }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
          {/* Left labels */}
          <div style={{ width: LEFT_COL, minWidth: LEFT_COL, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
            {phases.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
                Aucune phase — cliquez "+ Phase"
              </div>
            )}
            {phases.map(phase => (
              <div key={phase.id}>
                {/* Phase label */}
                <div className="gantt-row" style={{ paddingLeft: 8, gap: 6, background: 'var(--bg2)' }}>
                  <button onClick={() => toggleCollapse(phase.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '2px 4px', flexShrink: 0 }}>
                    {collapsed.has(phase.id) ? '▶' : '▼'}
                  </button>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: phase.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{phase.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(phase.startDate)} · {phase.duration}j</div>
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Ajouter sous-phase" onClick={() => { addSubPhase(phase.id); }} style={{ fontSize: 12 }}>+</button>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Éditer" onClick={() => { setEditingPhase({ ...phase }); setIsNew(false); }} style={{ fontSize: 11 }}>✎</button>
                    <button className="btn btn-danger btn-sm btn-icon" title="Supprimer" onClick={() => deletePhase(phase.id)} style={{ fontSize: 11 }}>✕</button>
                  </div>
                </div>
                {/* Subphase labels */}
                {!collapsed.has(phase.id) && phase.subPhases.map(sub => (
                  <div key={sub.id} className="gantt-row-sub" style={{ paddingLeft: 36, gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: phase.color, opacity: 0.6, flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 500, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{sub.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{formatDate(sub.startDate)} · {sub.duration}j</div>
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingSub({ sub: { ...sub }, phaseId: phase.id }); setIsNew(false); }} style={{ fontSize: 11 }}>✎</button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteSubPhase(phase.id, sub.id)} style={{ fontSize: 11 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right: bars */}
          <div id="gantt-body-scroll" style={{ flex: 1, overflowX: 'scroll', overflowY: 'hidden' }}>
            <div style={{ width: totalWidth, position: 'relative', minHeight: '100%' }}>
              {/* Today line */}
              <div className="gantt-today" style={{ left: todayOffset * DAY_PX }} />

              {/* Weekend shading + grid lines */}
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = new Date(viewStart);
                d.setDate(d.getDate() + i);
                const dow = d.getDay();
                return (dow === 0 || dow === 6) ? (
                  <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * DAY_PX, width: DAY_PX, background: 'rgba(255,255,255,0.015)', pointerEvents: 'none' }} />
                ) : null;
              })}

              {phases.map(phase => (
                <div key={phase.id}>
                  {/* Phase bar */}
                  <div className="gantt-row">
                    <div
                      className="gantt-bar"
                      style={{ left: barLeft(phase.startDate), width: barWidth(phase.duration), background: phase.color }}
                      title={`${phase.name} — ${formatDate(phase.startDate)} → ${formatDate(addDays(phase.startDate, phase.duration))} (${phase.duration}j)`}
                      onClick={() => { setEditingPhase({ ...phase }); setIsNew(false); }}
                    >
                      {phase.name}
                    </div>
                    {/* Dependency arrow */}
                    {phase.dependsOn && (() => {
                      const dep = phases.find(p => p.id === phase.dependsOn);
                      if (!dep) return null;
                      const x1 = barLeft(dep.startDate) + barWidth(dep.duration);
                      const x2 = barLeft(phase.startDate);
                      if (x2 <= x1) return null;
                      return (
                        <svg style={{ position: 'absolute', top: 0, left: 0, width: totalWidth, height: 44, pointerEvents: 'none', zIndex: 4 }}>
                          <defs><marker id={`arrow-${phase.id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--text-faint)" /></marker></defs>
                          <line x1={x1} y1={22} x2={x2 - 4} y2={22} stroke="var(--text-faint)" strokeWidth="1.5" strokeDasharray="4,3" markerEnd={`url(#arrow-${phase.id})`} />
                        </svg>
                      );
                    })()}
                  </div>
                  {/* Subphase bars */}
                  {!collapsed.has(phase.id) && phase.subPhases.map(sub => (
                    <div key={sub.id} className="gantt-row-sub">
                      <div
                        className="gantt-bar gantt-bar-sub"
                        style={{ left: barLeft(sub.startDate), width: barWidth(sub.duration), background: phase.color }}
                        title={`${sub.name} — ${formatDate(sub.startDate)} → ${formatDate(addDays(sub.startDate, sub.duration))} (${sub.duration}j)`}
                        onClick={() => { setEditingSub({ sub: { ...sub }, phaseId: phase.id }); setIsNew(false); }}
                      >
                        {barWidth(sub.duration) > 60 ? sub.name : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PHASE MODAL */}
      {editingPhase && (
        <div className="modal-overlay" onClick={() => setEditingPhase(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? 'Nouvelle phase' : 'Modifier la phase'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingPhase(null)}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Nom de la phase *</label>
                <input className="input" value={editingPhase.name} onChange={e => setEditingPhase({ ...editingPhase, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Date de début</label>
                  <input type="date" className="input" value={editingPhase.startDate} onChange={e => setEditingPhase({ ...editingPhase, startDate: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Durée (jours)</label>
                  <input type="number" min={1} className="input" value={editingPhase.duration} onChange={e => setEditingPhase({ ...editingPhase, duration: Math.max(1, parseInt(e.target.value) || 1) })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Couleur</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GANTT_COLORS.map(c => (
                    <button key={c} onClick={() => setEditingPhase({ ...editingPhase, color: c })}
                      style={{ width: 28, height: 28, borderRadius: 6, background: c, border: editingPhase.color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.1s' }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Dépend de (commence après)</label>
                <select className="input" value={editingPhase.dependsOn ?? ''} onChange={e => setEditingPhase({ ...editingPhase, dependsOn: e.target.value || null })}>
                  <option value="">Aucune dépendance</option>
                  {phases.filter(p => p.id !== editingPhase.id).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {editingPhase.dependsOn && (
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                    ↳ La date de début sera automatiquement décalée si la phase précédente change.
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Ordre d'affichage</label>
                <input type="number" min={0} className="input" value={editingPhase.order} onChange={e => setEditingPhase({ ...editingPhase, order: parseInt(e.target.value) || 0 })} />
              </div>
              {/* Preview */}
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ height: 14, borderRadius: 4, background: editingPhase.color, width: 80, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatDate(editingPhase.startDate)} → {formatDate(addDays(editingPhase.startDate, editingPhase.duration))} · {editingPhase.duration} jours
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditingPhase(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={savePhase} disabled={!editingPhase.name}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* SUBPHASE MODAL */}
      {editingSub && (
        <div className="modal-overlay" onClick={() => setEditingSub(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? 'Nouvelle sous-phase' : 'Modifier la sous-phase'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingSub(null)}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Nom *</label>
                <input className="input" value={editingSub.sub.name} onChange={e => setEditingSub({ ...editingSub, sub: { ...editingSub.sub, name: e.target.value } })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Date de début</label>
                  <input type="date" className="input" value={editingSub.sub.startDate} onChange={e => setEditingSub({ ...editingSub, sub: { ...editingSub.sub, startDate: e.target.value } })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Durée (jours)</label>
                  <input type="number" min={1} className="input" value={editingSub.sub.duration} onChange={e => setEditingSub({ ...editingSub, sub: { ...editingSub.sub, duration: Math.max(1, parseInt(e.target.value) || 1) } })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Dépend de (sous-phase)</label>
                <select className="input" value={editingSub.sub.dependsOn ?? ''} onChange={e => setEditingSub({ ...editingSub, sub: { ...editingSub.sub, dependsOn: e.target.value || null } })}>
                  <option value="">Aucune dépendance</option>
                  {phases.find(p => p.id === editingSub.phaseId)?.subPhases
                    .filter(s => s.id !== editingSub.sub.id)
                    .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditingSub(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveSubPhase} disabled={!editingSub.sub.name}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
