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
  const { settings, t } = useSettings();
  const locale = settings.locale ?? 'fr';
  const [allData, setAllData] = useState<Record<string, SpaceData>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'gantt'>('projects');
  // Filters (ED8)
  const [fSpace, setFSpace] = useState<string[]>([]);
  const [fStatus, setFStatus] = useState<string[]>([]);
  const [fDomain, setFDomain] = useState<string[]>([]);
  const [fPM, setFPM] = useState<string[]>([]);
  const [search, setSearch] = useState('');

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
  const allGantt = spaces.flatMap(s => (allData[s.id]?.ganttPhases ?? []).map(g => ({ ...g, spaceName: s.name, spaceColor: s.color })));

  const STATUS_COLORS: Record<string, string> = {
    '1-To arbitrate': 'badge-gray', '2-Validated': 'badge-blue',
    '3-In progress': 'badge-green', '4-Frozen': 'badge-yellow',
    '5-Completed': 'badge-purple', '6-Aborted': 'badge-red',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} className="btn btn-ghost btn-sm">{t('back_to_spaces')}</button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>🌐 {t('global_portfolio')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{t('global_portfolio_subtitle2')}aces · {allProjects.length} projets · {allStaff.length} ressources</p>
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
          { id: 'projects', label: t('global_projects_tab') },
          { id: 'gantt', label: t('global_gantt_tab') },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 13 }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Filter bar (ED8) */}
      {!loading && activeTab === 'projects' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <input className="toolbar-select" placeholder={t('search')} value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth: 200 }} />
          {/* Space filter */}
          <select className="toolbar-select" value={fSpace[0] ?? ''} onChange={e => setFSpace(e.target.value ? [e.target.value] : [])}>
            <option value="">{t('global_col_space')} — {t('all')}</option>
            {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {/* Status filter */}
          <select className="toolbar-select" value={fStatus[0] ?? ''} onChange={e => setFStatus(e.target.value ? [e.target.value] : [])}>
            <option value="">{t('all_statuses')}</option>
            {['1-To arbitrate','2-Validated','3-In progress','4-Frozen','5-Completed','6-Aborted'].map(s => (
              <option key={s} value={s}>{s.replace(/^\d-/, '')}</option>
            ))}
          </select>
          {/* Domain filter */}
          {(() => {
            const domains = Array.from(new Set(allProjects.map((p: any) => p.domain).filter(Boolean))).sort();
            return (
              <select className="toolbar-select" value={fDomain[0] ?? ''} onChange={e => setFDomain(e.target.value ? [e.target.value] : [])}>
                <option value="">{t('all_domains')}</option>
                {domains.map((d: any) => <option key={d} value={d}>{d}</option>)}
              </select>
            );
          })()}
          {/* PM filter */}
          {(() => {
            const pms = Array.from(new Set(allProjects.map((p: any) => p.projectManager).filter(Boolean))).sort();
            return (
              <select className="toolbar-select" value={fPM[0] ?? ''} onChange={e => setFPM(e.target.value ? [e.target.value] : [])}>
                <option value="">{t('project_manager')} — {t('all')}</option>
                {pms.map((pm: any) => <option key={pm} value={pm}>{pm}</option>)}
              </select>
            );
          })()}
          {(search || fSpace.length || fStatus.length || fDomain.length || fPM.length) && (
            <button onClick={() => { setSearch(''); setFSpace([]); setFStatus([]); setFDomain([]); setFPM([]); }}
              style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              ✕ {t('clear_filters')}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>{t('global_loading')}</div>
      ) : (
        <>
          {/* PROJECTS TAB (ED6) */}
          {activeTab === 'projects' && (() => {
            const filtered = allProjects.filter((p: any) => {
              if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.projectManager ?? '').toLowerCase().includes(search.toLowerCase())) return false;
              if (fSpace.length && !fSpace.includes(p.spaceId ?? spaces.find(s => s.name === p.spaceName)?.id ?? '')) return false;
              if (fStatus.length && !fStatus.includes(p.status ?? '')) return false;
              if (fDomain.length && !fDomain.includes(p.domain ?? '')) return false;
              if (fPM.length && !fPM.includes(p.projectManager ?? '')) return false;
              return true;
            });
            return (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{filtered.length} / {allProjects.length} {t('projects_count')}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('global_col_space')}</th><th style={{ minWidth: 240 }}>{t('project_name')}</th><th>{t('domain')}</th>
                        <th>{t('project_manager')}</th><th>{t('priority')}</th><th>{t('status')}</th>
                        <th>{t('start_date')}</th><th>{t('go_live')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-faint)' }}>{t('no_project')}</td></tr>
                      )}
                      {filtered.map((p: any, i: number) => (
                        <tr key={i}>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: p.spaceColor, background: `${p.spaceColor}15`, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.spaceColor, display: 'inline-block' }} />
                              {p.spaceName}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</td>
                          <td><span className="badge badge-blue">{p.domain}</span></td>
                          <td style={{ color: 'var(--text-muted)' }}>{p.projectManager || '—'}</td>
                          <td>{p.priority ? <span className="badge badge-gray">P{p.priority}</span> : '—'}</td>
                          <td>{p.status ? <span className={`badge ${STATUS_COLORS[p.status] ?? 'badge-gray'}`}>{p.status.replace(/^\d-/, '')}</span> : '—'}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{p.startDate ? p.startDate.slice(0, 7) : '—'}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{p.goLive ? p.goLive.slice(0, 7) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

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
                                {proj?.name ?? t('global_unknown_project')}
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
                                        {start.toLocaleDateString(({ fr: 'fr-FR', en: 'en-US', pt: 'pt-BR', zh: 'zh-CN' }[locale] ?? 'fr-FR'), { day: '2-digit', month: 'short' })} → {end.toLocaleDateString(({ fr: 'fr-FR', en: 'en-US', pt: 'pt-BR', zh: 'zh-CN' }[locale] ?? 'fr-FR'), { day: '2-digit', month: 'short', year: '2-digit' })}
                                      </span>
                                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{phase.duration}j</span>
                                      {phase.subphases?.length > 0 && <span className="badge badge-gray" style={{ fontSize: 10 }}>{phase.subphases.length} {t('gantt_subphases').toLowerCase()}</span>}
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
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>{t('no_gantt_phase')}</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
