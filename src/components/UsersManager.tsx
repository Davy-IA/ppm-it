'use client';
import AlertDialog from './AlertDialog';
import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/context';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { useAuth } from '@/lib/auth-context';

interface Space { id: string; name: string; color: string; }
interface User { id: string; email: string; first_name: string; last_name: string; role: string; active: boolean; last_login: string | null; spaces: Space[]; is_external?: boolean; partner_id?: string | null; }

const ROLE_BADGES: Record<string, string> = { superadmin: 'badge-red', admin: 'badge-purple', global: 'badge-yellow', member: 'badge-blue', space_admin: 'badge-green' };

interface PartnerItem { id: string; name: string; type: string; }
interface Props { spaces: Space[]; partners?: PartnerItem[]; }

export default function UsersManager({ spaces, partners = [] }: Props) {
  const { token, user: me } = useAuth();
  const { t, settings } = useSettings();
  const locale = settings.locale ?? 'fr';
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<User> & { password?: string; spaceIds?: string[] } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [pendingResets, setPendingResets] = useState<Record<string, string>>({});
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const fetchUsers = async () => {
    const r = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const d = await r.json(); setUsers(d.users); }
    setLoading(false);
  };

  const fetchPendingResets = async () => {
    const r = await fetch('/api/auth/reset-request', { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const d = await r.json(); setPendingResets(d.pendingMap ?? {}); }
  };

  const handleAdminReset = async () => {
    if (!resetUser || !resetPw) return;
    setResetLoading(true);
    const r = await fetch('/api/auth/reset-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: resetUser.id, newPassword: resetPw }),
    });
    const d = await r.json();
    setResetLoading(false);
    if (d.ok) {
      setResetMsg(String(t('password_reset_success')));
      setPendingResets(prev => { const n = { ...prev }; delete n[resetUser.id]; return n; });
      setTimeout(() => { setResetUser(null); setResetPw(''); setResetMsg(''); }, 1500);
    } else {
      setResetMsg('⚠ ' + (d.error || 'Erreur'));
    }
  };

  useEffect(() => { fetchUsers(); fetchPendingResets(); }, []);

  const save = async () => {
    if (!editing) return;
    const method = isNew ? 'POST' : 'PUT';
    const body = {
      id: editing.id,
      email: editing.email,
      firstName: editing.first_name,
      lastName: editing.last_name,
      role: editing.role ?? 'member',
      isExternal: (editing as any).is_external ?? false,
      partnerId: (editing as any).partner_id ?? null,
      active: editing.active ?? true,
      password: editing.password,
      spaceIds: editing.spaceIds ?? [],
    };
    const r = await fetch('/api/users', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    if (r.ok) { fetchUsers(); setEditing(null); }
    else { const d = await r.json(); setAlertMessage(d.error || 'Erreur'); }
  };

  const toggleActive = async (user: User) => {
    await fetch('/api/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: user.id, firstName: user.first_name, lastName: user.last_name, role: user.role, active: !user.active, spaceIds: user.spaces.map(s => s.id) }),
    });
    fetchUsers();
  };

  const allowedRoles = me?.role === 'superadmin'
    ? ['superadmin', 'admin', 'global', 'space_admin', 'member']
    : ['global', 'space_admin', 'member'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{users.length} {users.length > 1 ? t('users_plural') : t('user_singular')}</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing({ role: 'member', active: true, spaceIds: [] }); setIsNew(true); }}>{t('user_new_btn')}</button>
      </div>

      {loading ? <div style={{ color: 'var(--text-faint)', padding: 20 }}>{t('loading')}…</div> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>{t('col_user')}</th><th>{t('user_col_role')}</th><th>{t('user_col_spaces')}</th><th>{t('user_col_last_login')}</th><th>{t('user_col_status')}</th><th></th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                    {u.is_external && <span className="badge badge-yellow" style={{ fontSize: 9, marginTop: 2 }}>External</span>}
                  </td>
                  <td><span className={`badge ${ROLE_BADGES[u.role] ?? 'badge-gray'}`}>{t(('role_' + u.role) as any) ?? u.role}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {['superadmin', 'admin', 'global'].includes(u.role)
                        ? <span className="badge badge-gray">{t('all_spaces')}</span>
                        : u.spaces?.map(s => <span key={s.id} style={{ fontSize: 10, fontWeight: 600, color: s.color, background: `${s.color}15`, borderRadius: 20, padding: '2px 7px' }}>{s.name}</span>)
                      }
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {u.last_login ? formatDateTime(u.last_login, locale) : t('never')}
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-green' : 'badge-gray'}`}>{u.active ? t('active') : t('inactive')}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditing({ ...u, spaceIds: u.spaces?.map(s => s.id) ?? [] }); setIsNew(false); }} disabled={u.id === me?.id}>{t('edit_btn')}</button>
                      {u.id !== me?.id && <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)}>{u.active ? t('deactivate') : t('activate')}</button>}
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
              <span style={{ fontWeight: 700, fontSize: 15 }}>{isNew ? t('user_new_title') : t('user_edit_title')}</span>
              <button className="btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('user_first_name')} *</label>
                  <input className="input" value={editing.first_name ?? ''} onChange={e => setEditing({ ...editing, first_name: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('user_last_name')} *</label>
                  <input className="input" value={editing.last_name ?? ''} onChange={e => setEditing({ ...editing, last_name: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('user_email')} *</label>
                <input className="input" type="email" value={editing.email ?? ''} onChange={e => setEditing({ ...editing, email: e.target.value })} disabled={!isNew} style={{ opacity: isNew ? 1 : 0.6 }} />
              </div>
              {/* External flag + partner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: `2px solid ${(editing as any).is_external ? 'var(--warning)' : 'var(--border)'}`, background: (editing as any).is_external ? 'rgba(245,158,11,0.07)' : 'var(--bg3)', cursor: 'pointer' }}
                onClick={() => setEditing({ ...editing, is_external: !(editing as any).is_external, partner_id: !(editing as any).is_external ? (editing as any).partner_id : null } as any)}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${(editing as any).is_external ? 'var(--warning)' : 'var(--border)'}`, background: (editing as any).is_external ? 'var(--warning)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(editing as any).is_external && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t('user_is_external')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('user_is_external_hint')}</div>
                </div>
              </div>
              {(editing as any).is_external && partners.length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('partner_company')}</label>
                  <select className="input" value={(editing as any).partner_id ?? ''} onChange={e => setEditing({ ...editing, partner_id: e.target.value || null } as any)}>
                    <option value="">— {t('no_partner')} —</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{isNew ? t('user_password_new') + ' *' : t('user_password_change')}</label>
                <input className="input" type="password" placeholder={isNew ? t('password_min_chars') : '••••••••'} value={editing.password ?? ''} onChange={e => setEditing({ ...editing, password: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>{t('user_role_label')}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allowedRoles.map(role => (
                    <button key={role} onClick={() => setEditing({ ...editing, role })}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: `2px solid ${editing.role === role ? 'var(--accent)' : 'var(--border)'}`, background: editing.role === role ? 'var(--accent-subtle)' : 'var(--bg3)', cursor: 'pointer', textAlign: 'left' }}>
                      <span className={`badge ${ROLE_BADGES[role]}`}>{t(('role_' + role) as any)}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t(('role_' + role + '_desc') as any)}</span>
                      {editing.role === role && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 700 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              {(editing.role === 'member' || editing.role === 'space_admin') && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>{t('user_spaces_label')}</label>
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
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={save} disabled={!editing.first_name || !editing.last_name || !editing.email || (isNew && !editing.password)}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetUser && (
        <div className="modal-overlay" onClick={() => setResetUser(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>🔑 {t('reset_password_for')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{resetUser.first_name} {resetUser.last_name} — {resetUser.email}</div>
              </div>
              <button className="btn-icon" onClick={() => setResetUser(null)}>✕</button>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pendingResets[resetUser.id] && (
                <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--danger)' }}>
                  ⚠ {t('reset_requested_at')} {new Date(pendingResets[resetUser.id]).toLocaleString()}
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t('new_password_for_user')}
                </label>
                <input
                  className="input" type="text"
                  placeholder={String(t('placeholder_min_8'))}
                  value={resetPw}
                  onChange={e => setResetPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminReset()}
                  autoFocus
                />
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>💡 {t('reset_tip')}</div>
              </div>
              {resetMsg && (
                <div style={{ background: resetMsg.startsWith('✓') ? 'var(--success-subtle)' : 'var(--danger-subtle)', border: `1px solid ${resetMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)'}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: resetMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>
                  {resetMsg}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setResetUser(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleAdminReset} disabled={resetLoading || resetPw.length < 8}>
                {resetLoading ? '⏳…' : t('set_password')}
              </button>
            </div>
          </div>
        </div>
      )}
      {alertMessage && <AlertDialog message={alertMessage} onClose={() => setAlertMessage(null)} />}
    </div>
  );
}
