'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface Space { id: string; name: string; color: string; }
interface User { id: string; email: string; first_name: string; last_name: string; role: string; active: boolean; last_login: string | null; spaces: Space[]; }

const ROLE_LABELS: Record<string, { label: string; badge: string; desc: string }> = {
  superadmin: { label: 'Super Admin', badge: 'badge-red', desc: 'Accès total, gestion complète' },
  admin: { label: 'Admin', badge: 'badge-purple', desc: 'Gestion users, espaces, paramètres' },
  global: { label: 'Global / CODIR', badge: 'badge-yellow', desc: 'Portfolio global, tous espaces en lecture' },
  member: { label: 'Membre', badge: 'badge-blue', desc: 'Accès aux espaces assignés uniquement' },
};

interface Props { spaces: Space[]; }

export default function UsersManager({ spaces }: Props) {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<User> & { password?: string; spaceIds?: string[] } | null>(null);
  const [isNew, setIsNew] = useState(false);

  const fetchUsers = async () => {
    const r = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const d = await r.json(); setUsers(d.users); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const save = async () => {
    if (!editing) return;
    const method = isNew ? 'POST' : 'PUT';
    const body = {
      id: editing.id,
      email: editing.email,
      firstName: editing.first_name,
      lastName: editing.last_name,
      role: editing.role ?? 'member',
      active: editing.active ?? true,
      password: editing.password,
      spaceIds: editing.spaceIds ?? [],
    };
    const r = await fetch('/api/users', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    if (r.ok) { fetchUsers(); setEditing(null); }
    else { const d = await r.json(); alert(d.error); }
  };

  const toggleActive = async (user: User) => {
    await fetch('/api/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: user.id, firstName: user.first_name, lastName: user.last_name, role: user.role, active: !user.active, spaceIds: user.spaces.map(s => s.id) }),
    });
    fetchUsers();
  };

  const allowedRoles = me?.role === 'superadmin'
    ? ['superadmin', 'admin', 'global', 'member']
    : ['global', 'member'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{users.length} utilisateur{users.length > 1 ? 's' : ''}</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing({ role: 'member', active: true, spaceIds: [] }); setIsNew(true); }}>+ Nouvel utilisateur</button>
      </div>

      {loading ? <div style={{ color: 'var(--text-faint)', padding: 20 }}>Chargement…</div> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Utilisateur</th><th>Rôle</th><th>Espaces</th><th>Dernière connexion</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td><span className={`badge ${ROLE_LABELS[u.role]?.badge ?? 'badge-gray'}`}>{ROLE_LABELS[u.role]?.label ?? u.role}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {['superadmin', 'admin', 'global'].includes(u.role)
                        ? <span className="badge badge-gray">Tous les espaces</span>
                        : u.spaces?.map(s => <span key={s.id} style={{ fontSize: 10, fontWeight: 600, color: s.color, background: `${s.color}15`, borderRadius: 20, padding: '2px 7px' }}>{s.name}</span>)
                      }
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-green' : 'badge-gray'}`}>{u.active ? 'Actif' : 'Inactif'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditing({ ...u, spaceIds: u.spaces?.map(s => s.id) ?? [] }); setIsNew(false); }} disabled={u.id === me?.id}>Éditer</button>
                      {u.id !== me?.id && <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)}>{u.active ? 'Désactiver' : 'Activer'}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{isNew ? 'Nouvel utilisateur' : 'Modifier utilisateur'}</span>
              <button className="btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Prénom *</label>
                  <input className="input" value={editing.first_name ?? ''} onChange={e => setEditing({ ...editing, first_name: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Nom *</label>
                  <input className="input" value={editing.last_name ?? ''} onChange={e => setEditing({ ...editing, last_name: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Email *</label>
                <input className="input" type="email" value={editing.email ?? ''} onChange={e => setEditing({ ...editing, email: e.target.value })} disabled={!isNew} style={{ opacity: isNew ? 1 : 0.6 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{isNew ? 'Mot de passe *' : 'Nouveau mot de passe (laisser vide pour ne pas changer)'}</label>
                <input className="input" type="password" placeholder={isNew ? 'Minimum 8 caractères' : '••••••••'} value={editing.password ?? ''} onChange={e => setEditing({ ...editing, password: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Rôle</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allowedRoles.map(role => (
                    <button key={role} onClick={() => setEditing({ ...editing, role })}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: `2px solid ${editing.role === role ? 'var(--accent)' : 'var(--border)'}`, background: editing.role === role ? 'var(--accent-subtle)' : 'var(--bg3)', cursor: 'pointer', textAlign: 'left' }}>
                      <span className={`badge ${ROLE_LABELS[role]?.badge}`}>{ROLE_LABELS[role]?.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ROLE_LABELS[role]?.desc}</span>
                      {editing.role === role && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 700 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              {editing.role === 'member' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Espaces accessibles</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {spaces.map(space => {
                      const isChecked = (editing.spaceIds ?? []).includes(space.id);
                      return (
                        <button key={space.id} onClick={() => {
                          const current = editing.spaceIds ?? [];
                          setEditing({ ...editing, spaceIds: isChecked ? current.filter(id => id !== space.id) : [...current, space.id] });
                        }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: `2px solid ${isChecked ? space.color : 'var(--border)'}`, background: isChecked ? `${space.color}10` : 'var(--bg3)', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: space.color }} />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{space.name}</span>
                          {isChecked && <span style={{ marginLeft: 'auto', color: space.color, fontWeight: 700, fontSize: 12 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={!editing.first_name || !editing.last_name || !editing.email || (isNew && !editing.password)}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
