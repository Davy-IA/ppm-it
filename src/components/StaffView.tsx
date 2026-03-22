'use client';
import { useState, useEffect } from 'react';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { AppData, Staff, MONTHS_2026_2028, PROFILES, DEPARTMENTS, COUNTRIES } from '@/types';
import { v4 as uuid } from 'uuid';
import { useSettings } from '@/lib/context';
import ConfirmDialog from './ConfirmDialog';
import { useAuth } from '@/lib/auth-context';

interface Props { data: AppData; updateData: (d: AppData) => void; }

const EMPTY_STAFF: Omit<Staff, 'id'> = {
  name: '', type: 'Internal', department: 'IT', entity: 'FR', profile: 'FUNC', capacity: {}, partnerId: null, userId: null,
};

export default function StaffView({ data, updateData }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const { t, settings } = useSettings();
  const { token } = useAuth();
  const [ppmUsers, setPpmUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.users) {
          setPpmUsers(d.users.map((u: any) => ({
            id: u.id,
            name: `${u.first_name} ${u.last_name}`.trim(),
            email: u.email,
          })));
        }
      })
      .catch(() => {});
  }, [token]);
  const locale = settings.locale ?? 'fr';
  const [editing, setEditing] = useState<Staff | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [yearFilter, setYearFilter] = useState('2026');
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: string } | null>(null);

  const updateStaffField = (id: string, field: string, value: any) => {
    const staff = data.staff.map(s => s.id === id ? { ...s, [field]: value } : s);
    updateData({ ...data, staff });
  };

  const updateCapacity = (id: string, month: string, value: string) => {
    const v = parseFloat(value);
    const staff = data.staff.map(s => s.id === id
      ? { ...s, capacity: { ...s.capacity, [month]: isNaN(v) ? 0 : v } }
      : s
    );
    updateData({ ...data, staff });
  };


  const sc = (data as any).spaceConfig ?? {};
  const spaceProfiles: string[]    = sc.profiles    ?? settings.profiles    ?? PROFILES;
  const spaceDepartments: string[] = sc.departments ?? settings.departments ?? DEPARTMENTS;
  const months = MONTHS_2026_2028.filter(m => m.startsWith(yearFilter));

  const filtered = data.staff.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || s.type === typeFilter;
    return matchSearch && matchType;
  });

  const save = () => {
    if (!editing) return;
    const staff = isNew
      ? [...data.staff, { ...editing, id: uuid() }]
      : data.staff.map(s => s.id === editing.id ? editing : s);
    updateData({ ...data, staff });
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm(t('delete_resource_confirm'))) return;
    const staff = data.staff.filter(s => s.id !== id);
    const allocations = data.allocations.filter(a => a.staffId !== id);
    updateData({ ...data, staff, allocations });
  };

  const setCapacity = (month: string, val: string) => {
    if (!editing) return;
    const v = parseFloat(val);
    setEditing({ ...editing, capacity: { ...editing.capacity, [month]: isNaN(v) ? 0 : v } });
  };

  // Fill all months in year with standard value
  const fillYear = (val: number) => {
    if (!editing) return;
    const cap = { ...editing.capacity };
    months.forEach(m => { cap[m] = val; });
    setEditing({ ...editing, capacity: cap });
  };

  return (
    <div className="animate-in">
      <div className="page-sticky-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="toolbar-select" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
          <select className="toolbar-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ maxWidth: 150 }}>
            <option value="">{t('all_types')}</option>
            <option value="Internal">{t('internal')}</option>
            <option value="External">{t('contract_external')}</option>
          </select>
          <select className="toolbar-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ maxWidth: 110 }}>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
          </select>
          <div style={{ flex: 1 }} />
          <button className="toolbar-btn primary" onClick={() => { setEditing({ id: '', ...EMPTY_STAFF }); setIsNew(true); }}>
            {t('add_staff')}
          </button>
        </div>
      </div>

      <div className="card card-table" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <div className="utbl-wrap" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky-left" style={{ minWidth: 200 }}>{t('project_name').replace('Projet', 'Ressource') || 'Ressource'}</th>
                <th>{t('profile')}</th>
                <th>{t('type')}</th>
                <th>{t('entity')}</th>
                {months.map(m => {
                  const label = formatMonth(m, locale, { month: 'short', year: '2-digit' });
                  return <th key={m} className="cap-cell">{label}</th>;
                })}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                // Compute allocation per month for this staff
                const allocated: Record<string, number> = {};
                data.allocations.filter(a => a.staffId === s.id).forEach(a => {
                  Object.entries(a.monthly).forEach(([m, v]) => {
                    allocated[m] = (allocated[m] ?? 0) + v;
                  });
                });

                return (
                  <tr key={s.id}>
                    <td className="sticky-left cell-edit" style={{ fontWeight: 500 }} onClick={() => setInlineEdit({ id: s.id, field: 'name' })}>
                      {inlineEdit?.id === s.id && inlineEdit.field === 'name'
                        ? <input className="cell-input" autoFocus defaultValue={s.name}
                            onBlur={e => { updateStaffField(s.id, 'name', e.target.value); setInlineEdit(null); }}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setInlineEdit(null); }}
                            onClick={e => e.stopPropagation()} style={{ minWidth: 140 }} />
                        : (() => {
                            const linked = (s as any).userId ? ppmUsers.find(u => u.id === (s as any).userId) : null;
                            const displayName = linked ? linked.name : s.name;
                            return <>{displayName}
                              {s.type === 'External' && <span className="badge badge-yellow" style={{ marginLeft: 6, fontSize: 10 }}>{t('field_ext')}</span>}
                              {linked && <span className="badge badge-green" style={{ marginLeft: 4, fontSize: 9 }} title={linked.email}>👤</span>}
                            </>;
                          })()
                      }
                    </td>
                    <td className="cell-edit" onClick={() => setInlineEdit({ id: s.id, field: 'profile' })}>
                      {inlineEdit?.id === s.id && inlineEdit.field === 'profile'
                        ? <select className="cell-select" autoFocus defaultValue={s.profile}
                            onChange={e => { updateStaffField(s.id, 'profile', e.target.value); setInlineEdit(null); }}
                            onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>
                            {spaceProfiles.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        : <span className="badge badge-blue">{s.profile}</span>
                      }
                    </td>
                    <td className="cell-edit" style={{ fontSize: 12 }} onClick={() => setInlineEdit({ id: s.id, field: 'type' })}>
                      {inlineEdit?.id === s.id && inlineEdit.field === 'type'
                        ? <select className="cell-select" autoFocus defaultValue={s.type}
                            onChange={e => { updateStaffField(s.id, 'type', e.target.value); setInlineEdit(null); }}
                            onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>
                            <option value="Internal">{t('internal')}</option>
                            <option value="External">{t('contract_external')}</option>
                          </select>
                        : <span style={{color:'var(--text-muted)'}}>{s.type === 'Internal' ? t('internal') : t('external_label')}</span>
                      }
                    </td>
                    <td className="cell-edit" style={{ color: 'var(--text-muted)' }} onClick={() => setInlineEdit({ id: s.id, field: 'entity' })}>
                      {inlineEdit?.id === s.id && inlineEdit.field === 'entity'
                        ? <select className="cell-select" autoFocus defaultValue={s.entity}
                            onChange={e => { updateStaffField(s.id, 'entity', e.target.value); setInlineEdit(null); }}
                            onBlur={() => setInlineEdit(null)} onClick={e => e.stopPropagation()}>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        : s.entity
                      }
                    </td>
                    {months.map(m => {
                      const cap = s.capacity[m] ?? 0;
                      const alloc = allocated[m] ?? 0;
                      let cls = 'cap-cell';
                      if (cap === 0) cls += ' cap-zero';
                      else if (alloc > cap) cls += ' cap-over';
                      else if (alloc > 0) cls += ' cap-ok';
                      return (
                        <td key={m} className={cls + ' cell-edit'} title={alloc > 0 ? `${String(t('capacity_cap_alloc')).replace('{cap}', String(cap)).replace('{alloc}', String(alloc))}` : `Cap: ${cap}j`}
                          onClick={() => setInlineEdit({ id: s.id, field: 'cap_' + m })}>
                          {inlineEdit?.id === s.id && inlineEdit.field === 'cap_' + m
                            ? <input type="number" min={0} step={0.5} className="cell-input" autoFocus defaultValue={cap || ''}
                                style={{ minWidth: 48, width: 52, textAlign: 'center' }}
                                onBlur={e => { updateCapacity(s.id, m, e.target.value); setInlineEdit(null); }}
                                onKeyDown={e => { if (e.key === 'Enter') { updateCapacity(s.id, m, (e.target as HTMLInputElement).value); setInlineEdit(null); } if (e.key === 'Escape') setInlineEdit(null); }}
                                onClick={e => e.stopPropagation()} />
                            : <>{cap > 0 ? cap : '—'}{alloc > 0 && (
                              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1, fontWeight: 400 }}
                                title={`${alloc} ${t('days_allocated')} / ${cap} (${Math.round(alloc/cap*100)}%)`}>
                                {alloc}{t('days_allocated')}
                              </div>
                            )}</>
                          }
                        </td>
                      );
                    })}
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" title={t('link_to_user') as string}
                          style={{ width: 26, height: 26, color: (s as any).userId ? 'var(--success)' : 'var(--text-faint)' }}
                          onClick={() => { setEditing({ ...s }); setIsNew(false); }}>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M2 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        </button>
                        <button className="btn btn-ghost btn-sm" title={t('copy_resource') as string} onClick={() => {
                          const copy = { ...s, id: '', name: s.name + ' (copy)' };
                          setEditing(copy); setIsNew(true);
                        }}>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="4" width="7" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4V2.5A1.5 1.5 0 015.5 1H10a1.5 1.5 0 011.5 1.5V8A1.5 1.5 0 0110 9.5H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmAction(() => remove(s.id))}><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? t('new_staff') : editing.name}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </div>
            <div style={{ padding: 24 }}>
              {/* Info fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_fullname')}</label>
                  <input className="input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_profile')}</label>
                  <select className="input" value={editing.profile} onChange={e => setEditing({ ...editing, profile: e.target.value })}>
                    {spaceProfiles.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_contract')}</label>
                  <select className="input" value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as 'Internal' | 'External', partnerId: e.target.value === 'Internal' ? null : editing.partnerId })}>
                    <option value="Internal">{t('internal')}</option>
                    <option value="External">{t('contract_external')}</option>
                  </select>
                </div>
                {editing.type === 'External' && (
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('partner_company')}</label>
                    <select className="input" value={editing.partnerId ?? ''} onChange={e => setEditing({ ...editing, partnerId: e.target.value || null })}>
                      <option value="">— {t('no_partner')} —</option>
                      {(data.partners ?? []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('link_to_user')}</label>
                  <select className="input" value={(editing as any).userId ?? ''} onChange={e => setEditing({ ...editing, userId: e.target.value || null } as any)}>
                    <option value="">— {t('no_linked_user')} —</option>
                    {ppmUsers.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>{t('link_user_hint')}</div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_entity')}</label>
                  <select className="input" value={editing.entity} onChange={e => setEditing({ ...editing, entity: e.target.value })}>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('field_dept')}</label>
                  <select className="input" value={editing.department} onChange={e => setEditing({ ...editing, department: e.target.value })}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={save} disabled={!editing.name}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}
      {confirmAction && <ConfirmDialog onConfirm={() => { confirmAction(); setConfirmAction(null); }} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
