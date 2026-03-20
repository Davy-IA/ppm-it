'use client';
import { useState } from 'react';
import { Partner, AppData } from '@/types';
import { v4 as uuid } from 'uuid';
import { useSettings } from '@/lib/context';

interface Props { data: AppData; updateData: (d: AppData) => void; }

// Partner types come from settings (configurable)

const TYPE_COLORS = ['badge-blue', 'badge-purple', 'badge-yellow', 'badge-green', 'badge-gray', 'badge-blue', 'badge-purple'];
const getTypeBadge = (types: string[], type: string) => TYPE_COLORS[types.indexOf(type) % TYPE_COLORS.length] ?? 'badge-gray';

const EMPTY: Omit<Partner, 'id'> = { name: '', type: 'Consulting', contact: '' };

export default function PartnersManager({ data, updateData }: Props) {
  const { t, settings } = useSettings();
  const partnerTypes: string[] = (settings as any).partnerTypes ?? ['Consulting', 'Agency', 'Freelance', 'Software', 'Other'];
  const [editing, setEditing] = useState<Partner | null>(null);
  const [isNew, setIsNew] = useState(false);

  const partners = data.partners ?? [];

  const save = () => {
    if (!editing) return;
    const next = isNew
      ? [...partners, { ...editing, id: uuid() }]
      : partners.map(p => p.id === editing.id ? editing : p);
    updateData({ ...data, partners: next });
    setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm(t('delete_confirm') as string)) return;
    // Also clear partnerId on affected staff
    const staff = data.staff.map(s => s.partnerId === id ? { ...s, partnerId: null } : s);
    updateData({ ...data, partners: partners.filter(p => p.id !== id), staff });
  };

  // Count staff per partner
  const staffCount = (id: string) => data.staff.filter(s => s.partnerId === id).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {partners.length} {t('partners_count')}
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing({ id: '', ...EMPTY }); setIsNew(true); }}>
          + {t('new_partner')}
        </button>
      </div>

      {partners.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-faint)', fontSize: 13 }}>
          {t('no_partners')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {partners.map(p => (
          <div key={p.id} className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Icon */}
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="1.5" stroke="var(--accent)" strokeWidth="1.4"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="var(--accent)" strokeWidth="1.4"/><path d="M1 8h14" stroke="var(--accent)" strokeWidth="1" strokeDasharray="2 2"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: p.contact ? 4 : 0 }}>
                <span className={`badge ${getTypeBadge(partnerTypes, p.type)}`} style={{ fontSize: 10 }}>{p.type}</span>
                {staffCount(p.id) > 0 && (
                  <span className="badge badge-gray" style={{ fontSize: 10 }}>{staffCount(p.id)} {t('resources')}</span>
                )}
              </div>
              {p.contact && <div style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.contact}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing({ ...p }); setIsNew(false); }}>✎</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>{isNew ? t('new_partner') : t('edit_partner')}</h2>
              <button className="btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('partner_name')} *</label>
                <input className="input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Accenture, TechCorp…" autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('partner_type')}</label>
                <select className="input" value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as Partner['type'] })}>
                  {partnerTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('partner_contact')}</label>
                <input className="input" value={editing.contact ?? ''} onChange={e => setEditing({ ...editing, contact: e.target.value })} placeholder="john@accenture.com" />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
              <button className="btn btn-primary" disabled={!editing.name} onClick={save}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
