'use client';
import AlertDialog from './AlertDialog';
import { useState } from 'react';
import { useSettings } from '@/lib/context';
import ConfirmDialog from './ConfirmDialog';
import { useAuth } from '@/lib/auth-context';

interface Space { id: string; name: string; description: string; color: string; icon: string; active: boolean; }
interface Props { spaces: Space[]; onRefresh: () => void; }

const SPACE_COLORS = ['#7C5CBF','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
const SPACE_ICONS = ['◈','◉','▦','◎','▣','🏪','🏭','💼','📦','🌐','🔧','💻'];

const NAV_TOGGLEABLE = [
  { id: 'projects',  labelKey: 'nav_projects' as const },
  { id: 'gantt',     labelKey: 'nav_planning' as const },
  { id: 'tasks',     labelKey: 'nav_tasks' as const },
  { id: 'staff',     labelKey: 'nav_staff' as const },
  { id: 'workload',  labelKey: 'nav_workload' as const },
  { id: 'dashboard', labelKey: 'nav_dashboard' as const },
];

export default function SpacesManager({ spaces, onRefresh }: Props) {
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const { token } = useAuth();
  const { t } = useSettings();
  const [editing, setEditing] = useState<Partial<Space> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Space | null>(null);
  const [existingSpaceData, setExistingSpaceData] = useState<any>(null);
  const [hiddenNavItems, setHiddenNavItems] = useState<string[]>([]);

  const openEdit = async (space: Space) => {
    setEditing({ ...space });
    setIsNew(false);
    setExistingSpaceData(null);
    setHiddenNavItems([]);
    const r = await fetch(`/api/spaces/${space.id}/data`, { headers: { Authorization: `Bearer ${token}` } });
    const d = r.ok ? await r.json() : {};
    setExistingSpaceData(d);
    setHiddenNavItems(d?.spaceConfig?.hiddenNavItems ?? []);
  };

  const save = async () => {
    if (!editing?.name) return;
    const method = isNew ? 'POST' : 'PUT';
    const r = await fetch('/api/spaces', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editing),
    });
    if (!r.ok) { const d = await r.json(); setAlertMessage(d.error || 'Erreur'); return; }

    // Save spaceConfig (nav visibility) for existing spaces
    if (!isNew && editing?.id) {
      const newData = { ...(existingSpaceData ?? {}), spaceConfig: { ...(existingSpaceData?.spaceConfig ?? {}), hiddenNavItems } };
      await fetch(`/api/spaces/${editing.id}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newData),
      });
    }

    onRefresh();
    setEditing(null);
  };

  const toggleActive = async (space: Space) => {
    await fetch('/api/spaces', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...space, active: !space.active }),
    });
    onRefresh();
  };

  const deleteSpace = async (space: Space) => {
    const r = await fetch(`/api/spaces?id=${space.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) { onRefresh(); setConfirmDelete(null); }
    else { const d = await r.json(); setAlertMessage(d.error || 'Erreur'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{spaces.length} espace{spaces.length > 1 ? 's' : ''}</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing({ color: SPACE_COLORS[0], icon: '◈', active: true }); setIsNew(true); }}>+ Nouvel espace</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {spaces.map(space => (
          <div key={space.id} className="card" style={{ borderTop: `3px solid ${space.color}`, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `${space.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{space.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{space.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{space.description || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
              <span className={`badge ${space.active ? 'badge-green' : 'badge-gray'}`}>{space.active ? t('space_active') : t('space_inactive')}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(space)}>{t('edit_btn')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(space)}>{space.active ? t('deactivate') : t('activate')}</button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(space)}><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{isNew ? 'Nouvel espace' : `Modifier — ${editing.name}`}</span>
              <button className="btn-icon" onClick={() => setEditing(null)}><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('field_space_name')}</label>
                <input className="input" value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Ex: Retail, Finance, Supply Chain…" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('field_description')}</label>
                <input className="input" value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Description courte de l'espace" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>{t('field_color')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SPACE_COLORS.map(c => <button key={c} onClick={() => setEditing({ ...editing, color: c })} style={{ width: 28, height: 28, borderRadius: 6, background: c, border: editing.color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>{t('field_icon')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SPACE_ICONS.map(icon => <button key={icon} onClick={() => setEditing({ ...editing, icon })} style={{ width: 36, height: 36, borderRadius: 8, background: editing.icon === icon ? 'var(--accent-subtle)' : 'var(--bg3)', border: editing.icon === icon ? '2px solid var(--accent)' : '2px solid var(--border)', cursor: 'pointer', fontSize: 18 }}>{icon}</button>)}
                </div>
              </div>
              {!isNew && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Navigation visible</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {NAV_TOGGLEABLE.map(item => {
                      const hidden = hiddenNavItems.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setHiddenNavItems(hidden ? hiddenNavItems.filter(x => x !== item.id) : [...hiddenNavItems, item.id])}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: hidden ? 'var(--bg3)' : 'var(--accent-subtle)', border: hidden ? '1.5px solid var(--border)' : '1.5px solid var(--accent)', color: hidden ? 'var(--text-muted)' : 'var(--accent)', textDecoration: hidden ? 'line-through' : 'none' }}
                        >
                          {t(item.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={save} disabled={!editing.name}>{isNew ? t('create_space') : t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{t('delete_space_title')}</span>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>{t('delete_space_warning')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Supprimer <strong>"{confirmDelete.name}"</strong> {t('delete_space_warning')} (projets, ressources, Gantt…).
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('confirm_continue')}</div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={() => deleteSpace(confirmDelete)}>{t('delete_space_confirm')}</button>
            </div>
          </div>
        </div>
      )}
      {alertMessage && <AlertDialog message={alertMessage} onClose={() => setAlertMessage(null)} />}
      {confirmAction && <ConfirmDialog onConfirm={() => { confirmAction(); setConfirmAction(null); }} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
