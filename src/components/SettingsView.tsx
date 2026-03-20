'use client';
import { useState, useRef, useEffect } from 'react';
import { AppData } from '@/types';
import { useSettings } from '@/lib/context';
import { useAuth } from '@/lib/auth-context';
import { COLOR_THEMES, AppSettings } from '@/lib/settings';
import { LOCALES } from '@/lib/i18n';
import UsersManager from './UsersManager';
import SpacesManager from './SpacesManager';

interface Space { id: string; name: string; description: string; color: string; icon: string; active: boolean; }
interface Props { data: AppData; updateData: (d: AppData) => void; spaces: Space[]; onRefreshSpaces?: () => void; }

type ListKey = 'domains' | 'profiles' | 'statuses' | 'departments' | 'countries' | 'requestTypes' | 'sponsors';

export default function SettingsView({ data, updateData, spaces, onRefreshSpaces }: Props) {
  const { settings, updateSettings, t } = useSettings();
  const { user, token } = useAuth();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'theme' | 'lists' | 'lang' | 'users' | 'spaces'>('identity');
  const [spacesList, setSpacesList] = useState<Space[]>(spaces);
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
    { key: 'domains', labelKey: 'settings_domains' },
    { key: 'profiles', labelKey: 'settings_profiles' },
    { key: 'statuses', labelKey: 'settings_statuses' },
    { key: 'departments', labelKey: 'settings_depts' },
    { key: 'countries', labelKey: 'settings_countries' },
    { key: 'requestTypes', labelKey: 'settings_request_types' },
    { key: 'sponsors', labelKey: 'settings_sponsors' },
  ];

  const ALL_TABS = [
    { id: 'identity', label: t('settings_tab_identity'), show: true },
    { id: 'theme', label: t('settings_tab_theme'), show: true },
    { id: 'lang', label: t('settings_tab_lang'), show: true },
    { id: 'lists', label: t('settings_tab_lists'), show: !!isAdmin },
    { id: 'spaces', label: t('settings_tab_spaces'), show: !!isAdmin },
    { id: 'users', label: t('settings_tab_users'), show: !!isAdmin },
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
      {activeTab === 'lists' && isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
          {LISTS.map(({ key, labelKey }) => {
            const values: string[] = (settings as any)[key] ?? [];
            return (
              <div key={key} className="card">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t(labelKey as any)}</span>
                  <span className="badge badge-gray">{values.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 220, overflowY: 'auto' }}>
                  {values.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input className="input" value={v} style={{ flex: 1 }}
                        onChange={e => { const n = [...values]; n[i] = e.target.value; updateList(key, n); }}
                        onBlur={showSaved} />
                      <button className="btn-icon" style={{ flexShrink: 0, color: 'var(--danger)' }}
                        onClick={() => { updateList(key, values.filter((_, j) => j !== i)); showSaved(); }}>✕</button>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => updateList(key, [...values, ''])}>{t('add_value')}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* SPACES TAB — admin only */}
      {activeTab === 'spaces' && isAdmin && (
        <SpacesManager spaces={spacesList} onRefresh={refreshSpaces} />
      )}

      {/* USERS TAB — admin only */}
      {activeTab === 'users' && isAdmin && (
        <UsersManager spaces={spacesList.map(s => ({ id: s.id, name: s.name, color: s.color }))} />
      )}
    </div>
  );
}
