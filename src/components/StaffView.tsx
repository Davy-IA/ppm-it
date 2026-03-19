'use client';
import { useState } from 'react';
import { formatMonth, formatDate, formatDateTime } from '@/lib/locale-utils';
import { AppData, Staff, MONTHS_2026_2028, PROFILES, DEPARTMENTS, COUNTRIES } from '@/types';
import { v4 as uuid } from 'uuid';
import { useSettings } from '@/lib/context';

interface Props { data: AppData; updateData: (d: AppData) => void; }

const EMPTY_STAFF: Omit<Staff, 'id'> = {
  name: '', type: 'Internal', department: 'IT', entity: 'FR', profile: 'FUNC', capacity: {},
};

export default function StaffView({ data, updateData }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { t, settings } = useSettings();
  const locale = settings.locale ?? 'fr';
  const [editing, setEditing] = useState<Staff | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [yearFilter, setYearFilter] = useState('2026');

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('staff_title')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {data.staff.filter(s => s.type === 'Internal').length} internes · {data.staff.filter(s => s.type === 'External').length} externes
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing({ id: '', ...EMPTY_STAFF }); setIsNew(true); }}>
          + Ajouter ressource
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input className="input" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
        <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">{t('all_types')}</option>
          <option value="Internal">{t('internal')}</option>
          <option value="External">{t('contract_external')}</option>
        </select>
        <select className="input" value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ maxWidth: 120 }}>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
        </select>
      </div>

      {/* Capacity grid table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky-left" style={{ minWidth: 200 }}>{t('project_name').replace('Projet', 'Ressource') || 'Ressource'}</th>
                <th>{t('profile')}</th>
                <th>{t('type')}</th>
                <th>{t('entity')}</th>
                {months.map(m => {
                  const label = formatMonth(m, locale);
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
                    <td className="sticky-left" style={{ fontWeight: 500 }}>
                      {s.name}
                      {s.type === 'External' && <span className="badge badge-yellow" style={{ marginLeft: 6, fontSize: 10 }}>Ext.</span>}
                    </td>
                    <td><span className="badge badge-blue">{s.profile}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.type === 'Internal' ? t('internal') : t('external_label')}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.entity}</td>
                    {months.map(m => {
                      const cap = s.capacity[m] ?? 0;
                      const alloc = allocated[m] ?? 0;
                      let cls = 'cap-cell';
                      if (cap === 0) cls += ' cap-zero';
                      else if (alloc > cap) cls += ' cap-over';
                      else if (alloc > 0) cls += ' cap-ok';
                      return (
                        <td key={m} className={cls} title={alloc > 0 ? `Cap: ${cap}j | Alloué: ${alloc}j` : `Cap: ${cap}j`}>
                          {cap > 0 ? cap : '—'}
                          {alloc > 0 && <div style={{ fontSize: 10, opacity: 0.7 }}>{alloc}j</div>}
                        </td>
                      );
                    })}
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditing({ ...s }); setIsNew(false); }}>{t('edit_btn')}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>✕</button>
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
          <div className="modal" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{isNew ? t('new_staff') : `Éditer — ${editing.name}`}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              {/* Info fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nom complet *</label>
                  <input className="input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Profil</label>
                  <select className="input" value={editing.profile} onChange={e => setEditing({ ...editing, profile: e.target.value })}>
                    {PROFILES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type de contrat</label>
                  <select className="input" value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as 'Internal' | 'External' })}>
                    <option value="Internal">{t('internal')}</option>
                    <option value="External">{t('contract_external')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Entité</label>
                  <select className="input" value={editing.entity} onChange={e => setEditing({ ...editing, entity: e.target.value })}>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Département</label>
                  <select className="input" value={editing.department} onChange={e => setEditing({ ...editing, department: e.target.value })}>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Capacity by year */}
              {['2026', '2027', '2028'].map(year => (
                <div key={year} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Disponibilité {year}</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => fillYear(21)}>{t('btn_fill21')}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => fillYear(0)}>{t('btn_clear')}</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
                    {MONTHS_2026_2028.filter(m => m.startsWith(year)).map(m => {
                      const label = formatMonth(m, locale);
                      return (
                        <div key={m} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                          <input
                            type="number"
                            min={0} max={31} step={0.5}
                            className="input"
                            value={editing.capacity[m] ?? ''}
                            onChange={e => setCapacity(m, e.target.value)}
                            style={{ textAlign: 'center', padding: '4px', fontFamily: 'DM Mono, monospace', fontSize: 13 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
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
