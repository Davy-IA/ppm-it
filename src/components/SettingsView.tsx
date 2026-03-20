'use client';
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
  const [saved, setSaved] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<'identity' | 'theme' | 'lists' | 'lang' | 'users' | 'spaces' | 'partners' | 'milestones'>('identity');
  const [spacesList, setSpacesList] = useState<Space[]>(spaces);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('__global__');
  // Keep local list in sync when parent prop updates
  useEffect(() => { setSpacesList(spaces); }, [spaces]);
  const logoRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);

  const isAdmin = user && ['superadmin', 'admin'].includes(user.role);
  const isSuperAdmin = user?.role === 'superadmin';

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512000) { alert(String(t('max_file_size'))); return; }
    const reader = new FileReader();
    reader.onload = () => { updateSettings({ logo: reader.result as string }); showSaved(); };
    reader.readAsDataURL(file);
  };

  const handleLogoDark = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512000) { alert(String(t('max_file_size'))); return; }
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
    { key: 'milestoneTypes', labelKey: 'settings_milestones' },
    { key: 'partnerTypes', labelKey: 'settings_partner_types' },
    { key: 'domains', labelKey: 'settings_domains' },
    { key: 'profiles', labelKey: 'settings_profiles' },
    { key: 'statuses', labelKey: 'settings_statuses' },
    { key: 'departments', labelKey: 'settings_depts' },
    { key: 'countries', labelKey: 'settings_countries' },
    { key: 'requestTypes', labelKey: 'settings_request_types' },
    { key: 'sponsors', labelKey: 'settings_sponsors' },
  ];

  const ALL_TABS = [
    { id: 'identity',   label: t('settings_tab_identity'),   show: true },
    { id: 'theme',      label: t('settings_tab_theme'),      show: true },
    { id: 'lang',       label: t('settings_tab_lang'),       show: true },
    { id: 'users',      label: t('settings_tab_users'),      show: !!isAdmin },
    { id: 'spaces',     label: t('settings_tab_spaces'),     show: !!isAdmin },
    { id: 'partners',   label: t('settings_tab_partners'),   show: !!isAdmin },
    { id: 'lists',      label: t('settings_tab_lists'),      show: !!isAdmin },
    { id: 'milestones', label: t('settings_tab_milestones'), show: !!isAdmin },
  ].filter(t => t.show);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('settings_title')}</h1>
          <p className="page-subtitle">{t('settings_subtitle_full')}</p>
        </div>
        {saved && (
          <div style={{ background: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ {t('settings_saved')}
          </div>
        )}
      </div>

      {/* Role badge */}
      {user && (
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin ? (
            <div style={{ padding: '6px 12px', background: 'var(--accent-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              {isSuperAdmin ? '⭐ ' + t('role_badge_superadmin') : '🔧 ' + t('role_badge_admin')}
            </div>
          ) : (
            <div style={{ padding: '6px 12px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              {t('member_settings_hint')}
            </div>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
        {ALL_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13 }}>{tab.label}</button>
        ))}
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
        </div>
      )}

      {/* LISTS TAB — admin only */}
      {activeTab === 'lists' && isAdmin && (() => {
        const isGlobal = selectedSpaceId === '__global__';
        const spaceData = !isGlobal ? data : null;
        const spaceConfig = (spaceData as any)?.spaceConfig ?? {};

        const getValues = (key: string): string[] => {
          if (!isGlobal && spaceConfig[key] !== undefined) return spaceConfig[key];
          return (settings as any)[key] ?? [];
        };

        const updateListForScope = (key: string, vals: string[]) => {
          if (isGlobal) {
            updateList(key as any, vals);
          } else {
            const newConfig = { ...spaceConfig, [key]: vals };
            updateData({ ...data, spaceConfig: newConfig } as any);
            showSaved();
          }
        };

        const resetToGlobal = (key: string) => {
          const newConfig = { ...spaceConfig };
          delete newConfig[key];
          updateData({ ...data, spaceConfig: newConfig } as any);
          showSaved();
        };

        return (
          <div>
            {/* Space selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--accent)" strokeWidth="1.5"/><path d="M8 1.5C8 1.5 5 5 5 8s3 6.5 3 6.5M8 1.5C8 1.5 11 5 11 8s-3 6.5-3 6.5M1.5 8h13" stroke="var(--accent)" strokeWidth="1.3"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{t('scope_label')}</span>
              <select className="input" value={selectedSpaceId} onChange={e => setSelectedSpaceId(e.target.value)} style={{ maxWidth: 220, fontWeight: 600 }}>
                <option value="__global__">🌐 {t('global_values')}</option>
                {spacesList.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              {!isGlobal && (
                <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                  {t('space_override_active')}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 8 }}>{t('space_override_hint')}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
              {LISTS.map(({ key, labelKey }) => {
                const values: string[] = getValues(key);
                const isOverridden = !isGlobal && spaceConfig[key] !== undefined;
                const globalValues: string[] = (settings as any)[key] ?? [];
                return (
                  <div key={key} className="card" style={{ borderColor: isOverridden ? 'var(--accent)' : undefined }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t(labelKey as any)}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {isOverridden && <span className="badge badge-blue" style={{ fontSize: 10 }}>{t('overridden')}</span>}
                        {isOverridden && (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                            onClick={() => resetToGlobal(key)} title={t('reset_to_global') as string}>
                            ↩ {t('reset_to_global')}
                          </button>
                        )}
                        <span className="badge badge-gray">{values.length}</span>
                      </div>
                    </div>
                    {!isGlobal && !isOverridden && (
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10, padding: '6px 10px', background: 'var(--bg3)', borderRadius: 6 }}>
                        {t('using_global_values')} — <button style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}
                          onClick={() => updateListForScope(key, [...globalValues])}>
                          {t('customize_for_space')}
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 220, overflowY: 'auto' }}>
                      {values.map((v, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input className="input" value={v} style={{ flex: 1 }}
                            onChange={e => { const n = [...values]; n[i] = e.target.value; updateListForScope(key, n); }}
                            onBlur={showSaved}
                            disabled={!isGlobal && !isOverridden} />
                          {(isGlobal || isOverridden) && (
                            <button className="btn-icon" style={{ flexShrink: 0, color: 'var(--danger)' }}
                              onClick={() => setConfirmAction(() => { updateListForScope(key, values.filter((_, j) => j !== i)); })}><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                          )}
                        </div>
                      ))}
                    </div>
                    {(isGlobal || isOverridden) && (
                      <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
                        onClick={() => updateListForScope(key, [...values, ''])}>{t('add_value')}</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* SPACES TAB — admin only */}
      {activeTab === 'spaces' && isAdmin && (
        <SpacesManager spaces={spacesList} onRefresh={refreshSpaces} />
      )}

      {/* PARTNERS TAB */}
      {activeTab === 'partners' && isAdmin && (
        <PartnersManager data={data} updateData={updateData} />
      )}

      {activeTab === 'milestones' && isAdmin && (() => {
        const isGlobal = selectedSpaceId === '__global__';
        const spaceConfig = (data as any)?.spaceConfig ?? {};
        const globalTypes: string[] = settings.milestoneTypes ?? [];
        const spaceTypes: string[] | undefined = !isGlobal ? spaceConfig['milestoneTypes'] : undefined;
        const types: string[] = spaceTypes ?? globalTypes;
        const isOverridden = !isGlobal && spaceTypes !== undefined;

        const updateTypes = (newTypes: string[]) => {
          if (isGlobal) {
            updateSettings({ milestoneTypes: newTypes } as any);
          } else {
            updateData({ ...data, spaceConfig: { ...spaceConfig, milestoneTypes: newTypes } } as any);
          }
          showSaved();
        };

        return (
          <div style={{ maxWidth: 600 }}>
            {/* Space selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--accent)" strokeWidth="1.5"/><path d="M8 1.5C8 1.5 5 5 5 8s3 6.5 3 6.5M8 1.5C8 1.5 11 5 11 8s-3 6.5-3 6.5M1.5 8h13" stroke="var(--accent)" strokeWidth="1.3"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{t('scope_label')}</span>
              <select className="input" value={selectedSpaceId} onChange={e => setSelectedSpaceId(e.target.value)} style={{ maxWidth: 220, fontWeight: 600 }}>
                <option value="__global__">🌐 {t('global_values')}</option>
                {spacesList.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              {isOverridden && <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{t('space_override_active')}</span>}
            </div>

            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('settings_tab_milestones')}</span>
                {isOverridden && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                    onClick={() => { const c2 = { ...spaceConfig }; delete c2['milestoneTypes']; updateData({ ...data, spaceConfig: c2 } as any); showSaved(); }}>
                    ↩ {t('reset_to_global')}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{t('milestone_type')}</div>
              {!isGlobal && !isOverridden && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12, padding: '6px 10px', background: 'var(--bg3)', borderRadius: 6 }}>
                  {t('using_global_values')} — <button style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}
                    onClick={() => updateTypes([...globalTypes])}>
                    {t('customize_for_space')}
                  </button>
                </div>
              )}
              {types.map((mt: string, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 10, height: 10, background: 'var(--accent2)', transform: 'rotate(45deg)', display: 'inline-block', borderRadius: 1, flexShrink: 0 }} />
                  <input className="input" value={mt} style={{ flex: 1 }}
                    onChange={e => { const n = [...types]; n[idx] = e.target.value; updateTypes(n); }}
                    onBlur={showSaved}
                    disabled={!isGlobal && !isOverridden} />
                  {(isGlobal || isOverridden) && (
                    <button className="btn btn-danger btn-sm" onClick={() => updateTypes(types.filter((_: string, i: number) => i !== idx))}><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10.5 3.5l-.7 7H3.2l-.7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                  )}
                </div>
              ))}
              {(isGlobal || isOverridden) && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                  onClick={() => updateTypes([...types, ''])}>
                  + {t('add_milestone_type')}
                </button>
              )}
            </div>
          </div>
        );
      })()}
      {activeTab === 'users' && isAdmin && (
        <UsersManager spaces={spacesList.map(s => ({ id: s.id, name: s.name, color: s.color }))} partners={(data.partners ?? []).map(p => ({ id: p.id, name: p.name, type: p.type }))} />
      )}
      {confirmAction && <ConfirmDialog onConfirm={() => { confirmAction(); setConfirmAction(null); }} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
