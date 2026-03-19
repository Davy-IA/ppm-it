'use client';
import { useState, useRef } from 'react';
import { AppData } from '@/types';
import { useSettings } from '@/lib/context';
import { COLOR_THEMES, AppSettings } from '@/lib/settings';
import { LOCALES } from '@/lib/i18n';

interface Props { data: AppData; updateData: (d: AppData) => void; }

type ListKey = 'domains' | 'profiles' | 'statuses' | 'departments' | 'countries' | 'requestTypes' | 'sponsors';

export default function SettingsView({ data, updateData }: Props) {
  const { settings, updateSettings, t } = useSettings();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'theme' | 'lists' | 'lang'>('identity');
  const logoRef = useRef<HTMLInputElement>(null);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512000) { alert('Fichier trop lourd (max 500kb)'); return; }
    const reader = new FileReader();
    reader.onload = () => { updateSettings({ logo: reader.result as string }); showSaved(); };
    reader.readAsDataURL(file);
  };

  const updateList = (key: ListKey, newArr: string[]) => {
    updateSettings({ [key]: newArr } as Partial<AppSettings>);
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

  const TABS = [
    { id: 'identity', label: '🏷 ' + t('settings_logo') },
    { id: 'theme', label: '🎨 ' + t('settings_theme') },
    { id: 'lists', label: '📋 ' + t('settings_lists') },
    { id: 'lang', label: '🌐 ' + t('settings_lang') },
  ] as const;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('settings_title')}</h1>
          <p className="page-subtitle">{t('settings_subtitle')}</p>
        </div>
        {saved && (
          <div style={{ background: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ {t('settings_saved')}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13 }}
          >{tab.label}</button>
        ))}
      </div>

      {/* IDENTITY TAB */}
      {activeTab === 'identity' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 800 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('settings_logo')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{t('settings_logo_desc')}</div>

            {/* Logo preview */}
            <div style={{ width: 120, height: 120, borderRadius: 12, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, background: 'var(--bg3)', overflow: 'hidden' }}>
              {settings.logo
                ? <img src={settings.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <div style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
                    <div style={{ fontSize: 32 }}>🖼</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Logo</div>
                  </div>
              }
            </div>
            <input ref={logoRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleLogo} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => logoRef.current?.click()}>{t('settings_logo_btn')}</button>
              {settings.logo && <button className="btn btn-ghost btn-sm" onClick={() => { updateSettings({ logo: null }); showSaved(); }}>{t('settings_logo_reset')}</button>}
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('app_name')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Nom affiché dans la sidebar</div>
            <input className="input" value={settings.appName} placeholder={t('app_name_ph')}
              onChange={e => updateSettings({ appName: e.target.value })}
              onBlur={showSaved}
            />
            <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--bg3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', background: settings.logo ? 'transparent' : 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {settings.logo
                  ? <img src={settings.logo} alt="logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                  : <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>P</span>
                }
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{settings.appName || 'PPM·IT'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Capacity Planning</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THEME TAB */}
      {activeTab === 'theme' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{t('settings_theme_desc')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, maxWidth: 900 }}>
            {COLOR_THEMES.map(theme => {
              const isActive = settings.colorTheme === theme.id;
              return (
                <button key={theme.id}
                  onClick={() => { updateSettings({ colorTheme: theme.id }); showSaved(); }}
                  style={{
                    background: 'var(--bg2)', border: `2px solid ${isActive ? theme.preview[0] : 'var(--border)'}`,
                    borderRadius: 12, padding: 16, cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s', boxShadow: isActive ? `0 4px 16px ${theme.preview[0]}30` : 'var(--shadow-sm)',
                    transform: isActive ? 'translateY(-2px)' : 'none',
                  }}
                >
                  {/* Color swatches */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {theme.preview.slice(0, 2).map((c, i) => (
                      <div key={i} style={{ width: 32, height: 32, borderRadius: 8, background: c }} />
                    ))}
                    <div style={{ flex: 1, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, ' + theme.preview[0] + ', ' + theme.preview[1] + ')' }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{theme.name}</div>
                  {isActive && <div style={{ fontSize: 11, color: theme.preview[0], fontWeight: 600 }}>✓ Actif</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LISTS TAB */}
      {activeTab === 'lists' && (
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
                        onChange={e => {
                          const next = [...values];
                          next[i] = e.target.value;
                          updateList(key, next);
                        }}
                        onBlur={showSaved}
                      />
                      <button className="btn-icon" style={{ flexShrink: 0, color: 'var(--danger)' }}
                        onClick={() => { updateList(key, values.filter((_, j) => j !== i)); showSaved(); }}>✕</button>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
                  onClick={() => { updateList(key, [...values, '']); }}>
                  {t('add_value')}
                </button>
              </div>
            );
          })}
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
                  <button key={loc.code}
                    onClick={() => { updateSettings({ locale: loc.code }); showSaved(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                      background: isActive ? 'var(--accent-subtle)' : 'var(--bg3)',
                      border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
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
    </div>
  );
}
