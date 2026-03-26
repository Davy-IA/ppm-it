'use client';
import AlertDialog from './AlertDialog';
import { useState, useRef, useEffect } from 'react';
import { AppData } from '@/types';
import { useSettings } from '@/lib/context';
import ConfirmDialog from './ConfirmDialog';
import { useAuth } from '@/lib/auth-context';
import { COLOR_THEMES, AppSettings } from '@/lib/settings';
import { LOCALES } from '@/lib/i18n';
import UsersManager from './UsersManager';
import SpacesManager from './SpacesManager';
import PartnersManager from './PartnersManager';

interface Space { id: string; name: string; description: string; color: string; icon: string; active: boolean; }
interface Props { data: AppData; updateData: (d: AppData) => void; spaces: Space[]; onRefreshSpaces?: () => void; }

type ListKey = 'domains' | 'profiles' | 'statuses' | 'departments' | 'countries' | 'requestTypes' | 'sponsors' | 'milestoneTypes' | 'partnerTypes';

export default function SettingsView({ data, updateData, spaces, onRefreshSpaces }: Props) {
  const { settings, updateSettings, t } = useSettings();
  const { user, token } = useAuth();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [editingList, setEditingList] = useState<string | null>(null);
  // E7: Custom fields editing state
  const [editingCf, setEditingCf] = useState<{ id: string; label: string; type: 'text' | 'select'; options: string } | null>(null);
  const [newCf, setNewCf] = useState<{ label: string; type: 'text' | 'select'; options: string }>({ label: '', type: 'text', options: '' });
  const isSpaceAdmin = user?.role === 'space_admin';
  const [activeTab, setActiveTab] = useState<'identity' | 'theme' | 'lists' | 'lang' | 'users' | 'spaces'>(isSpaceAdmin ? 'lists' : 'identity');
  const [spacesList, setSpacesList] = useState<Space[]>(spaces);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(isSpaceAdmin ? (spaces[0]?.id ?? '__global__') : '__global__');
  const [selectedSpaceData, setSelectedSpaceData] = useState<any>(null);
  const [selectedSpaceLoading, setSelectedSpaceLoading] = useState(false);
  // Keep local list in sync when parent prop updates
  useEffect(() => { setSpacesList(spaces); }, [spaces]);

  // Fetch selected space data when space changes (for non-global scope)
  useEffect(() => {
    if (selectedSpaceId === '__global__') { setSelectedSpaceData(null); return; }
    setSelectedSpaceLoading(true);
    fetch(`/api/spaces/${selectedSpaceId}/data`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setSelectedSpaceData(d))
      .finally(() => setSelectedSpaceLoading(false));
  }, [selectedSpaceId, token]);

  const saveSelectedSpaceConfig = async (newSpaceConfig: any) => {
    const base = selectedSpaceData ?? {};
    const newData = { ...base, spaceConfig: newSpaceConfig };
    await fetch(`/api/spaces/${selectedSpaceId}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newData),
    });
    setSelectedSpaceData(newData);
    showSaved();
  };
  const logoRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);

  const isAdmin = user && ['superadmin', 'admin'].includes(user.role);
  const isSuperAdmin = user?.role === 'superadmin';

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512000) { setAlertMessage(String(t('max_file_size'))); return; }
    const reader = new FileReader();
    reader.onload = () => { updateSettings({ logo: reader.result as string }); showSaved(); };
    reader.readAsDataURL(file);
  };

  const handleLogoDark = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512000) { setAlertMessage(String(t('max_file_size'))); return; }
    const reader = new FileReader();
    reader.onload = () => { updateSettings({ logoDark: reader.result as string } as any); showSaved(); };
    reader.readAsDataURL(file);
  };

  const updateList = (key: ListKey, arr: string[]) => updateSettings({ [key]: arr } as Partial<AppSettings>);

  const refreshSpaces = async () => {
    const r = await fetch('/api/spaces', { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) {
      const d = await r.json();
      setSpacesList(d.spaces);
      // Also refresh parent App so SpaceSelector stays in sync
      onRefreshSpaces?.();
    }
  };

  const LISTS: { key: ListKey; labelKey: string }[] = [
    { key: 'domains',       labelKey: 'settings_domains' },
    { key: 'profiles',      labelKey: 'settings_profiles' },
    { key: 'statuses',      labelKey: 'settings_statuses' },
    { key: 'departments',   labelKey: 'settings_depts' },
    { key: 'countries',     labelKey: 'settings_countries' },
    { key: 'requestTypes',  labelKey: 'settings_request_types' },
    { key: 'sponsors',      labelKey: 'settings_sponsors' },
    { key: 'partnerTypes',  labelKey: 'settings_partner_types' },
  ];

  const ALL_TABS = [
    { id: 'identity',   label: t('settings_tab_identity'),   show: !isSpaceAdmin },
    { id: 'theme',      label: t('settings_tab_theme'),      show: !isSpaceAdmin },
    { id: 'lang',       label: t('settings_tab_lang'),       show: !isSpaceAdmin },
    { id: 'users',      label: t('settings_tab_users'),      show: !!isAdmin },
    { id: 'spaces',     label: t('settings_tab_spaces'),     show: !!isAdmin },
    { id: 'lists',      label: t('settings_tab_lists'),      show: !!isAdmin || isSpaceAdmin },
  ].filter(t => t.show);

  return (
    <div className="animate-in">
      {/* Tab bar + role badge + saved indicator */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {ALL_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13 }}>{tab.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        {saved && (
          <div style={{ background: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>
            ✓ {t('settings_saved')}
          </div>
        )}
        {user && (isAdmin || isSpaceAdmin) && (
          <div style={{ padding: '5px 10px', background: 'var(--accent-subtle)', borderRadius: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>
            {isSuperAdmin ? '⭐ ' + t('role_badge_superadmin') : isSpaceAdmin ? '📋 ' + t('role_space_admin') : '🔧 ' + t('role_badge_admin')}
          </div>
        )}
      </div>

      {/* IDENTITY TAB */}
      {activeTab === 'identity' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 800 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('settings_logo_label')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{t('settings_logo_upload_desc')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
              {/* Logo mode jour */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>☀️ {t('logo_light_mode')}</div>
                <div style={{ width: '100%', height: 80, borderRadius: 10, background: '#ffffff', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}>
                  {settings.logo
                    ? <img src={settings.logo} alt="logo" style={{ maxWidth: '80%', maxHeight: '70%', objectFit: 'contain' }} />
                    : <div style={{ textAlign: 'center', color: '#ccc' }}><div style={{ fontSize: 26 }}>🖼</div><div style={{ fontSize: 10, marginTop: 2 }}>{t('logo_light_mode')}</div></div>}
                </div>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => logoRef.current?.click()}>{t('settings_logo_btn')}</button>
                  {settings.logo && <button className="btn btn-ghost btn-sm" onClick={() => { updateSettings({ logo: null }); showSaved(); }}>{t('settings_logo_reset')}</button>}
                </div>
              </div>
              {/* Logo mode nuit */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>🌙 {t('logo_dark_mode')}</div>
                <div style={{ width: '100%', height: 80, borderRadius: 10, background: '#161b26', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 }}>
                  {(settings as any).logoDark
                    ? <img src={(settings as any).logoDark} alt="logo dark" style={{ maxWidth: '80%', maxHeight: '70%', objectFit: 'contain' }} />
                    : <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}><div style={{ fontSize: 26 }}>🖼</div><div style={{ fontSize: 10, marginTop: 2 }}>{t('logo_dark_mode')}</div></div>}
                </div>
                <input ref={logoDarkRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoDark} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => logoDarkRef.current?.click()}>{t('settings_logo_btn')}</button>
                  {(settings as any).logoDark && <button className="btn btn-ghost btn-sm" onClick={() => { updateSettings({ logoDark: null } as any); showSaved(); }}>{t('settings_logo_reset')}</button>}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '8px 10px', background: 'var(--accent-subtle)', borderRadius: 8 }}>💡 {t('logo_tip')}</div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{t('settings_org_name_label')}</div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('settings_org_name_displayed')}</label>
            <input className="input" value={settings.appName} placeholder="Ex: VEJA Project Management" onChange={e => updateSettings({ appName: e.target.value })} onBlur={showSaved} />

            {/* Budget URL */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {t('settings_budget_label')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{t('settings_budget_desc')}</div>
              <input
                className="input"
                value={(settings as any).budgetUrl ?? ''}
                placeholder="https://www.sapanalytics.cloud/..."
                onChange={e => updateSettings({ budgetUrl: e.target.value } as any)}
                onBlur={showSaved}
              />
              {(settings as any).budgetUrl && (
                <a href={(settings as any).budgetUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                  {t('settings_budget_test')}
                </a>
              )}
            </div>

            <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', background: settings.logo ? '#ffffff' : 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {settings.logo
                  ? <img src={settings.logo} alt="logo" style={{ width: 30, height: 30, objectFit: 'contain' }} />
                  : <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{(settings.appName || 'P')[0]}</span>}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{settings.appName || 'VEJA Project Management'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{t('settings_sidebar_preview')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THEME TAB */}
      {activeTab === 'theme' && (
        <div style={{ maxWidth: 900 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{t('settings_theme_desc')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {COLOR_THEMES.map(theme => {
              const isActive = settings.colorTheme === theme.id;
              return (
                <button key={theme.id} onClick={() => { updateSettings({ colorTheme: theme.id }); showSaved(); }}
                  style={{ background: 'var(--bg2)', border: `2px solid ${isActive ? theme.preview[0] : 'var(--border)'}`, borderRadius: 12, padding: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', boxShadow: isActive ? `0 4px 16px ${theme.preview[0]}30` : 'var(--shadow-sm)', transform: isActive ? 'translateY(-2px)' : 'none' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {theme.preview.slice(0, 2).map((c, i) => <div key={i} style={{ width: 28, height: 28, borderRadius: 7, background: c }} />)}
                    <div style={{ flex: 1, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]})` }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{theme.name}</div>
                  {isActive && <div style={{ fontSize: 11, color: theme.preview[0], fontWeight: 600 }}>✓ {t('active')}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LANG TAB */}
      {activeTab === 'lang' && (
        <div style={{ maxWidth: 500 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('settings_lang')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>{t('settings_lang_desc')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LOCALES.map(loc => {
                const isActive = settings.locale === loc.code;
                return (
                  <button key={loc.code} onClick={() => { updateSettings({ locale: loc.code }); showSaved(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: isActive ? 'var(--accent-subtle)' : 'var(--bg3)', border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 28 }}>{loc.flag}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? 'var(--accent)' : 'var(--text)' }}>{loc.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{loc.code.toUpperCase()}</div>
                    </div>
                    {isActive && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 700 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table font size */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('settings_table_font_size')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{t('settings_table_font_size_desc')}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[{ size: 11, label: 'XS' }, { size: 12, label: 'S' }, { size: 13, label: 'M' }, { size: 14, label: 'L' }].map(({ size, label }) => {
                const active = (settings.tableFontSize ?? 12) === size;
                return (
                  <button key={size} onClick={() => { updateSettings({ tableFontSize: size }); showSaved(); }}
                    style={{ padding: '8px 18px', borderRadius: 8, border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-subtle)' : 'var(--bg3)', color: active ? 'var(--accent)' : 'var(--text-muted)', fontWeight: active ? 700 : 500, fontSize: size, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {label} <span style={{ fontSize: 10, opacity: 0.7 }}>({size}px)</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LISTS TAB — admin and space_admin */}
      {activeTab === 'lists' && (isAdmin || isSpaceAdmin) && (() => {
        const isGlobal = selectedSpaceId === '__global__';
        const spaceConfig = isGlobal ? {} : ((selectedSpaceData as any)?.spaceConfig ?? {});

        const getValues = (key: string): string[] => {
          if (!isGlobal && spaceConfig[key] !== undefined) return spaceConfig[key];
          return (settings as any)[key] ?? [];
        };

        const updateListForScope = (key: string, vals: string[]) => {
          if (isGlobal) {
            updateList(key as any, vals);
          } else {
            const newConfig = { ...spaceConfig, [key]: vals };
            saveSelectedSpaceConfig(newConfig);
          }
        };

        const resetToGlobal = (key: string) => {
          const newConfig = { ...spaceConfig };
          delete newConfig[key];
          saveSelectedSpaceConfig(newConfig);
        };

        return (
          <div>
            {/* Space selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--accent)" strokeWidth="1.5"/><path d="M8 1.5C8 1.5 5 5 5 8s3 6.5 3 6.5M8 1.5C8 1.5 11 5 11 8s-3 6.5-3 6.5M1.5 8h13" stroke="var(--accent)" strokeWidth="1.3"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{t('scope_label')}</span>
              <select className="input" value={selectedSpaceId} onChange={e => setSelectedSpaceId(e.target.value)} style={{ maxWidth: 220, fontWeight: 600 }}>
                {!isSpaceAdmin && <option value="__global__">🌐 {t('global_values')}</option>}
                {spacesList.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              {!isGlobal && (
                <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                  {t('space_override_active')}
                </span>
              )}
              {!isSpaceAdmin && <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 8 }}>{t('space_override_hint')}</span>}
              {selectedSpaceLoading && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>⏳</span>}
            </div>

            {/* Table of lists */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('list_name' as any)}</th>
                    <th style={{ textAlign: 'center', width: 80 }}>{t('list_count' as any)}</th>
                    <th>{t('list_preview' as any)}</th>
                    <th style={{ textAlign: 'center', width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {LISTS.map(({ key, labelKey }) => {
                    const values: string[] = getValues(key);
                    const isOverridden = !isGlobal && spaceConfig[key] !== undefined;
                    const preview = values.slice(0, 4).join(' · ') + (values.length > 4 ? '…' : '');
                    return (
                      <tr key={key}>
                        <td style={{ fontWeight: 600 }}>{t(labelKey as any)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-gray">{values.length}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-faint)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isOverridden
                            ? <span className="badge badge-blue" style={{ fontSize: 10 }}>{t('overridden')}</span>
                            : preview || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn-icon" title={t('edit_btn') as string}
                            onClick={() => setEditingList(key)}
                            style={{ color: 'var(--accent)', width: 30, height: 30 }}>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                              <path d="M10.5 2.5l2 2-7 7H3.5v-2l7-7zM9 4l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>


            {/* E7: Custom fields — global and space scope */}
            {(() => {
              const customFields: { id: string; label: string; type: 'text' | 'select'; options?: string[] }[] =
                isGlobal ? ((settings as any).customFields ?? []) : (spaceConfig.customFields ?? []);
              const saveCustomFields = (fields: typeof customFields) => {
                if (isGlobal) {
                  updateSettings({ ...(settings as any), customFields: fields } as any);
                } else {
                  const newConfig = { ...spaceConfig, customFields: fields };
                  saveSelectedSpaceConfig(newConfig);
                  return;
                }
                showSaved();
              };
              return (
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{t('custom_fields' as any)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{isGlobal ? t('custom_fields_global_hint' as any) : t('custom_fields_space_hint' as any)}</span>
                  </div>
                  <table className="data-table">
                    <thead><tr>
                      <th>{t('custom_fields_label_col' as any)}</th><th>{t('type')}</th><th>{t('custom_fields_options_col' as any)}</th><th style={{ width: 80 }}></th>
                    </tr></thead>
                    <tbody>
                      {customFields.map((cf, i) => (
                        <tr key={cf.id}>
                          {editingCf?.id === cf.id ? (
                            <>
                              <td><input className="cell-input" autoFocus defaultValue={cf.label} onBlur={e => setEditingCf({ ...editingCf, label: e.target.value })} style={{ minWidth: 120 }} /></td>
                              <td><select className="cell-select" defaultValue={cf.type} onChange={e => setEditingCf({ ...editingCf, type: e.target.value as 'text' | 'select' })}><option value="text">{t('custom_fields_type_text' as any)}</option><option value="select">{t('custom_fields_type_select' as any)}</option></select></td>
                              <td style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                                {editingCf.type === 'select' ? (
                                  <span style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                                    onClick={() => setEditingList('__cf_options__' + cf.id)}>
                                    {t('custom_fields_edit_options' as any)} ({editingCf.options?.split(',').filter(Boolean).length ?? 0})
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                  const updated = customFields.map((f, j) => j !== i ? f : {
                                    ...f, label: editingCf.label ?? f.label, type: (editingCf.type ?? f.type) as 'text' | 'select',
                                    options: editingCf.options !== undefined ? editingCf.options.split(',').map((s: string) => s.trim()).filter(Boolean) : f.options,
                                  });
                                  saveCustomFields(updated); setEditingCf(null);
                                }}>✓</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingCf(null)}>✕</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ fontWeight: 600 }}>{cf.label}</td>
                              <td><span className="badge badge-gray">{cf.type === 'text' ? t('custom_fields_type_text' as any) : t('custom_fields_type_select' as any)}</span></td>
                              <td>
                                {cf.type === 'select' ? (
                                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                    onClick={() => { setEditingCf({ id: cf.id, label: cf.label, type: cf.type, options: (cf.options ?? []).join(', ') }); setEditingList('__cf_options__' + cf.id); }}>
                                    {t('custom_fields_edit_options' as any)} ({(cf.options ?? []).length})
                                  </button>
                                ) : <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>}
                              </td>
                              <td style={{ display: 'flex', gap: 4 }}>
                                <button className="btn-icon" style={{ width: 28, height: 28, color: 'var(--accent)' }} onClick={() => setEditingCf({ id: cf.id, label: cf.label, type: cf.type, options: (cf.options ?? []).join(', ') })}>✎</button>
                                <button className="btn-icon" style={{ width: 28, height: 28, color: 'var(--danger)' }} onClick={() => saveCustomFields(customFields.filter((_, j) => j !== i))}><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {/* Add new row */}
                      <tr style={{ background: 'var(--bg3)' }}>
                        <td><input className="cell-input" placeholder={t('custom_fields_name_placeholder' as any) as string} value={newCf.label} onChange={e => setNewCf({ ...newCf, label: e.target.value })} style={{ minWidth: 120 }} /></td>
                        <td><select className="cell-select" value={newCf.type} onChange={e => setNewCf({ ...newCf, type: e.target.value as 'text' | 'select' })}><option value="text">{t('custom_fields_type_text' as any)}</option><option value="select">{t('custom_fields_type_select' as any)}</option></select></td>
                        <td><span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{newCf.type === 'select' ? t('custom_fields_options_col' as any) : '—'}</span></td>
                        <td>
                          <button className="btn btn-primary btn-sm" disabled={!newCf.label.trim()} onClick={() => {
                            const field = { id: `cf_${Date.now()}`, label: newCf.label.trim(), type: newCf.type, options: newCf.type === 'select' ? [] : undefined };
                            saveCustomFields([...customFields, field]);
                            setNewCf({ label: '', type: 'text', options: '' });
                            if (field.type === 'select') {
                              setEditingCf({ id: field.id, label: field.label, type: 'select', options: '' });
                              setEditingList('__cf_options__' + field.id);
                            }
                          }}>{t('custom_fields_add' as any)}</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Popup for editing select options (ED3) */}
                  {editingList?.startsWith('__cf_options__') && (() => {
                    const cfId = editingList.replace('__cf_options__', '');
                    const cf = customFields.find(f => f.id === cfId);
                    if (!cf) return null;
                    const opts = cf.options ?? [];
                    return (
                      <>
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,30,0.5)', zIndex: 998 }} onClick={() => setEditingList(null)} />
                        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 999,
                          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
                          boxShadow: '0 12px 40px rgba(0,0,0,0.2)', width: 400, maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{cf.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{t('custom_fields_options_col' as any)}</div>
                            </div>
                            <button className="btn-icon" onClick={() => setEditingList(null)}>✕</button>
                          </div>
                          <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {opts.map((v, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input className="input" value={v} style={{ flex: 1 }}
                                  onChange={e => {
                                    const n = [...opts]; n[i] = e.target.value;
                                    const updated = customFields.map(f => f.id === cfId ? { ...f, options: n } : f);
                                    saveCustomFields(updated);
                                  }} />
                                <button className="btn-icon" style={{ flexShrink: 0, color: 'var(--danger)' }}
                                  onClick={() => {
                                    const n = opts.filter((_, j) => j !== i);
                                    const updated = customFields.map(f => f.id === cfId ? { ...f, options: n } : f);
                                    saveCustomFields(updated);
                                  }}>
                                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)' }}>
                            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
                              onClick={() => {
                                const n = [...opts, ''];
                                const updated = customFields.map(f => f.id === cfId ? { ...f, options: n } : f);
                                saveCustomFields(updated);
                              }}>{t('add_value')}</button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            })()}

            {/* ED1: Hidden nav items per space */}
            {!isGlobal && (() => {
              const NAV_TOGGLEABLE = [
                { id: 'projects', labelKey: 'nav_projects' },
                { id: 'gantt', labelKey: 'nav_planning' },
                { id: 'tasks', labelKey: 'nav_tasks' },
                { id: 'staff', labelKey: 'nav_staff' },
                { id: 'workload', labelKey: 'nav_workload' },
                { id: 'dashboard', labelKey: 'nav_dashboard' },
              ];
              const hidden: string[] = spaceConfig.hiddenNavItems ?? [];
              return (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t('settings_nav_visibility' as any)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{t('settings_nav_visibility_desc' as any)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {NAV_TOGGLEABLE.map(item => {
                      const isHidden = hidden.includes(item.id);
                      return (
                        <button key={item.id} onClick={() => {
                          const newHidden = isHidden ? hidden.filter(h => h !== item.id) : [...hidden, item.id];
                          const newConfig = { ...spaceConfig, hiddenNavItems: newHidden };
                          saveSelectedSpaceConfig(newConfig);
                        }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                          border: `2px solid ${isHidden ? 'var(--border)' : 'var(--accent)'}`,
                          background: isHidden ? 'var(--bg3)' : 'var(--accent-subtle)', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${isHidden ? 'var(--border)' : 'var(--accent)'}`,
                            background: isHidden ? 'transparent' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {!isHidden && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: isHidden ? 'var(--text-faint)' : 'var(--text)' }}>{t(item.labelKey as any)}</span>
                          {isHidden && <span className="badge badge-gray" style={{ fontSize: 10, marginLeft: 'auto' }}>Masqué</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ED4: Year range (global setting) */}
            {isGlobal && isAdmin && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t('settings_year_range' as any)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{t('settings_year_range_desc' as any)}</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('settings_year_start' as any)}</label>
                    <select className="input" value={(settings as any).startYear ?? new Date().getFullYear()}
                      onChange={e => { updateSettings({ startYear: Number(e.target.value) } as any); showSaved(); }}
                      style={{ width: 100 }}>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ color: 'var(--text-faint)', alignSelf: 'flex-end', paddingBottom: 6 }}>→</div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('settings_year_end' as any)}</label>
                    <select className="input" value={(settings as any).endYear ?? new Date().getFullYear() + 2}
                      onChange={e => { updateSettings({ endYear: Number(e.target.value) } as any); showSaved(); }}
                      style={{ width: 100 }}>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Inline edit modal for selected list */}
            {editingList && !editingList.startsWith('__cf_options__') && (() => {
              const { labelKey } = LISTS.find(l => l.key === editingList)!;
              const values: string[] = getValues(editingList);
              const isOverridden = !isGlobal && spaceConfig[editingList] !== undefined;
              const globalValues: string[] = (settings as any)[editingList] ?? [];
              return (
                <>
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,30,0.5)', zIndex: 998 }} onClick={() => setEditingList(null)} />
                  <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 999,
                    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.2)', width: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{t(labelKey as any)}</div>
                        {!isGlobal && !isOverridden && (
                          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>
                            {t('using_global_values')} —{' '}
                            <button style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}
                              onClick={() => updateListForScope(editingList, [...globalValues])}>
                              {t('customize_for_space')}
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {isOverridden && (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                            onClick={() => { resetToGlobal(editingList); }} title={t('reset_to_global') as string}>
                            ↩ {t('reset_to_global')}
                          </button>
                        )}
                        <button className="btn-icon" onClick={() => setEditingList(null)}>✕</button>
                      </div>
                    </div>
                    <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {values.map((v, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input className="input" value={v} style={{ flex: 1 }}
                            onChange={e => { const n = [...values]; n[i] = e.target.value; updateListForScope(editingList, n); }}
                            onBlur={showSaved}
                            disabled={!isGlobal && !isOverridden} />
                          {(isGlobal || isOverridden) && (
                            <button className="btn-icon" style={{ flexShrink: 0, color: 'var(--danger)' }}
                              onClick={() => setConfirmAction(() => { updateListForScope(editingList, values.filter((_, j) => j !== i)); })}>
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {(isGlobal || isOverridden) && (
                      <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)' }}>
                        <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
                          onClick={() => updateListForScope(editingList, [...values, ''])}>{t('add_value')}</button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        );
      })()}

      {/* SPACES TAB — admin only */}
      {activeTab === 'spaces' && isAdmin && (
        <SpacesManager spaces={spacesList} onRefresh={refreshSpaces} />
      )}



      {activeTab === 'users' && isAdmin && (
        <UsersManager spaces={spacesList.map(s => ({ id: s.id, name: s.name, color: s.color }))} partners={(data.partners ?? []).map(p => ({ id: p.id, name: p.name, type: p.type }))} />
      )}
      {alertMessage && <AlertDialog message={alertMessage} onClose={() => setAlertMessage(null)} />}
      {confirmAction && <ConfirmDialog onConfirm={() => { confirmAction(); setConfirmAction(null); }} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
