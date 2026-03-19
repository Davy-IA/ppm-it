'use client';
import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/context';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { useAuth } from '@/lib/auth-context';

interface Space { id: string; name: string; color: string; icon: string; }
interface Project { id: string; name: string; domain: string; status: string | null; priority: number | null; projectManager: string; goLive: string | null; startDate: string | null; }
interface SpaceData { projects: Project[]; staff: any[]; workloads: any[]; allocations: any[]; ganttPhases: any[]; }

interface Props { spaces: Space[]; onBack: () => void; }

export default function GlobalPortfolio({ spaces, onBack }: Props) {
  const { token } = useAuth();
  const { settings } = useSettings();
  const locale = settings.locale ?? 'fr';
  const [allData, setAllData] = useState<Record<string, SpaceData>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'kpis' | 'gantt'>('kpis');

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

  const allProjects = spaces.flatMap(s => (allData[s.id]?.projects ?? []).map(p => ({ ...p, spaceName: s.name, spaceColor: s.color })));
  const allStaff = spaces.flatMap(s => (allData[s.id]?.staff ?? []).map(st => ({ ...st, spaceName: s.name })));
  const allGantt = spaces.flatMap(s => (allData[s.id]?.ganttPhases ?? []).map(g => ({ ...g, spaceName: s.name, spaceColor: s.color })));

  const STATUS_COLORS: Record<string, string> = {
    '1-To arbitrate': 'badge-gray', '2-Validated': 'badge-blue',
    '3-In progress': 'badge-green', '4-Frozen': 'badge-yellow',
    '5-Completed': 'badge-purple', '6-Aborted': 'badge-red',
  };

  const kpis = spaces.map(s => {
    const d = allData[s.id];
    return {
      space: s,
      projects: d?.projects?.length ?? 0,
      active: d?.projects?.filter(p => p.status === '3-In progress').length ?? 0,
      staff: d?.staff?.length ?? 0,
      phases: d?.ganttPhases?.length ?? 0,
    };
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} className="btn btn-ghost btn-sm">← Espaces</button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>🌐 Portfolio Global</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>Vue consolidée de tous les espaces · {allProjects.length} projets · {allStaff.length} ressources</p>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { id: 'kpis', label: '📊 Dashboard KPIs' },
          { id: 'projects', label: '◉ Projets consolidés' },
          { id: 'gantt', label: '▦ Gantt cross-espaces' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 13 }}
          >{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>⏳ Chargement des données…</div>
      ) : (
        <>
          {/* KPIs TAB */}
          {activeTab === 'kpis' && (
            <div>
              {/* Summary row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Projets total', value: allProjects.length, color: 'var(--accent)' },
                  { label: 'En cours', value: allProjects.filter(p => p.status === '3-In progress').length, color: 'var(--success)' },
                  { label: 'À arbitrer', value: allProjects.filter(p => p.status === '1-To arbitrate').length, color: 'var(--warning)' },
                  { label: 'Ressources', value: allStaff.length, color: 'var(--purple)' },
                  { label: 'Espaces actifs', value: spaces.length, color: '#f59e0b' },
                ].map(k => (
                  <div key={k.label} className="card" style={{ borderLeft: `3px solid ${k.color}` }}>
                    <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Per-space breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {kpis.map(({ space, projects, active, staff, phases }) => (
                  <div key={space.id} className="card" style={{ borderTop: `3px solid ${space.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 20 }}>{space.icon}</span>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{space.name}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Projets', value: projects },
                        { label: 'En cours', value: active },
                        { label: 'Ressources', value: staff },
                        { label: 'Phases Gantt', value: phases },
                      ].map(k => (
                        <div key={k.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: space.color }}>{k.value}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Status bar */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6 }}>Statut des projets</div>
                      {(() => {
                        const d = allData[space.id];
                        const statuses: Record<string, number> = {};
                        (d?.projects ?? []).forEach(p => { const s = p.status ?? 'N/A'; statuses[s] = (statuses[s] ?? 0) + 1; });
                        const colors: Record<string, string> = { '3-In progress': 'var(--success)', '2-Validated': 'var(--accent)', '1-To arbitrate': 'var(--text-faint)', '4-Frozen': 'var(--warning)', '5-Completed': 'var(--purple)', '6-Aborted': 'var(--danger)' };
                        return Object.entries(statuses).map(([status, count]) => (
                          <div key={status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{status.replace(/^\d-/, '')}</span>
                            <span style={{ fontWeight: 700, color: colors[status] ?? 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === 'projects' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Espace</th><th>Projet</th><th>Domaine</th>
                      <th>Chef de projet</th><th>Priorité</th><th>Statut</th>
                      <th>Début</th><th>Go-Live</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProjects.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)' }}>Aucun projet</td></tr>
                    )}
                    {allProjects.map((p: any, i) => (
                      <tr key={i}>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: p.spaceColor, background: `${p.spaceColor}15`, borderRadius: 20, padding: '2px 8px' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.spaceColor, display: 'inline-block' }} />
                            {p.spaceName}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</td>
                        <td><span className="badge badge-blue">{p.domain}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.projectManager || '—'}</td>
                        <td>{p.priority ? <span className="badge badge-gray">P{p.priority}</span> : '—'}</td>
                        <td>{p.status ? <span className={`badge ${STATUS_COLORS[p.status] ?? 'badge-gray'}`}>{p.status.replace(/^\d-/, '')}</span> : '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.startDate ? p.startDate.slice(0, 7) : '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.goLive ? p.goLive.slice(0, 7) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GANTT TAB */}
          {activeTab === 'gantt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {spaces.map(space => {
                const phases = allData[space.id]?.ganttPhases ?? [];
                if (phases.length === 0) return null;
                return (
                  <div key={space.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: `${space.color}08` }}>
                      <span style={{ fontSize: 18 }}>{space.icon}</span>
                      <span style={{ fontWeight: 700, color: space.color }}>{space.name}</span>
                      <span className="badge badge-gray">{phases.length} phases</span>
                    </div>
                    <div style={{ padding: 16 }}>
                      {/* Group by project */}
                      {(() => {
                        const projIds = Array.from(new Set<string>(phases.map((p: any) => p.projectId)));
                        return projIds.map(projId => {
                          const proj = allData[space.id]?.projects?.find(p => p.id === projId);
                          const projPhases = phases.filter((p: any) => p.projectId === projId);
                          return (
                            <div key={projId} style={{ marginBottom: 16 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text)' }}>
                                {proj?.name ?? 'Projet inconnu'}
                                <span style={{ marginLeft: 8 }} className="badge badge-gray">{projPhases.length} phases</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {projPhases.map((phase: any) => {
                                  const start = new Date(phase.startDate);
                                  const end = new Date(phase.startDate);
                                  end.setDate(end.getDate() + phase.duration);
                                  return (
                                    <div key={phase.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <div style={{ width: 10, height: 10, borderRadius: 3, background: phase.color ?? space.color, flexShrink: 0 }} />
                                      <span style={{ fontSize: 13, minWidth: 200 }}>{phase.name}</span>
                                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {start.toLocaleDateString(locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'zh-CN', { day: '2-digit', month: 'short' })} → {end.toLocaleDateString(locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'zh-CN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                      </span>
                                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{phase.duration}j</span>
                                      {phase.subphases?.length > 0 && <span className="badge badge-gray" style={{ fontSize: 10 }}>{phase.subphases.length} sous-phases</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              })}
              {allGantt.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>Aucune phase Gantt définie</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
