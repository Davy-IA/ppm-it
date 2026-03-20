'use client';
import { useState } from 'react';
import { AppData, Project, DOMAINS, REQUEST_TYPES, STATUSES, DEPARTMENTS, COUNTRIES, SPONSORS } from '@/types';
import { v4 as uuid } from 'uuid';
import { useSettings } from '@/lib/context';

interface Props { data: AppData; updateData: (d: AppData) => void; }

const EMPTY_PROJECT: Omit<Project, 'id'> = {
  name: '', domain: 'APPLI', requestType: 'IT Project', leadDept: 'IT',
  leadCountry: 'FR', sponsor: '', projectManager: '', priority: null,
  complexity: null, roi: null, status: '2-Validated', startDate: null, goLive: null,
};

const STATUS_BADGE: Record<string, string> = {
  '1-To arbitrate': 'badge-gray', '2-Validated': 'badge-blue',
  '3-In progress': 'badge-green', '4-Frozen': 'badge-yellow',
  '5-Completed': 'badge-purple', '6-Aborted': 'badge-red',
};

export default function ProjectsView({ data, updateData }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const { t } = useSettings();
  const [editing, setEditing] = useState<Project | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = data.projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.projectManager ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchDomain = !domainFilter || p.domain === domainFilter;
    return matchSearch && matchStatus && matchDomain;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{t('projects_title')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{t('projects_subtitle_fmt').replace('{n}', String(data.projects.length))}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing({ id: '', ...EMPTY_PROJECT }); setIsNew(true); }}>
          {t('new_project')}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input className="input" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">{t('all_statuses')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/^\d-/, '')}</option>)}
        </select>
        <select className="input" value={domainFilter} onChange={e => setDomainFilter(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">{t('all_domains')}</option>
          {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('project_name')}</th><th>{t('domain')}</th><th>{t('type')}</th><th>{t('lead_dept')}</th>
                <th>{t('sponsor')}</th><th>{t('project_manager')}</th><th>{t('priority')}</th>
                <th>{t('complexity')}</th><th>{t('status')}</th><th>{t('start_date')}</th><th>{t('go_live')}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</td>
                  <td><span className="badge badge-blue">{p.domain}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.requestType}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.leadDept}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.sponsor}</td>
                  <td>{p.projectManager || '—'}</td>
                  <td>{p.priority ? <span className="badge badge-gray">P{p.priority}</span> : '—'}</td>
                  <td>{p.complexity ? <span className="badge badge-gray">C{p.complexity}</span> : '—'}</td>
                  <td>{p.status ? <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-gray'}`}>{p.status.replace(/^\d-/, '')}</span> : '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.startDate ? p.startDate.slice(0, 7) : '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.goLive ? p.goLive.slice(0, 7) : '—'}</td>
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
      </div>

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
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nom du projet *</label>
                <input className="input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_domain')}</label>
                <select className="input" value={editing.domain} onChange={e => setEditing({ ...editing, domain: e.target.value })}>
                  {DOMAINS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type de demande</label>
                <select className="input" value={editing.requestType} onChange={e => setEditing({ ...editing, requestType: e.target.value })}>
                  {REQUEST_TYPES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Département leader</label>
                <select className="input" value={editing.leadDept} onChange={e => setEditing({ ...editing, leadDept: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Pays</label>
                <select className="input" value={editing.leadCountry} onChange={e => setEditing({ ...editing, leadCountry: e.target.value })}>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_sponsor')}</label>
                <select className="input" value={editing.sponsor ?? ''} onChange={e => setEditing({ ...editing, sponsor: e.target.value })}>
                  <option value="">—</option>
                  {SPONSORS.map(s => <option key={s}>{s}</option>)}
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
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_start_date')}</label>
                <input type="date" className="input" value={editing.startDate ?? ''} onChange={e => setEditing({ ...editing, startDate: e.target.value || null })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Go-Live</label>
                <input type="date" className="input" value={editing.goLive ?? ''} onChange={e => setEditing({ ...editing, goLive: e.target.value || null })} />
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
