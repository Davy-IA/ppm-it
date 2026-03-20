'use client';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/context';

interface Space { id: string; name: string; description: string; color: string; icon: string; }

interface Props {
  spaces: Space[];
  onSelect: (space: Space) => void;
  appName: string;
}

export default function SpaceSelector({ spaces, onSelect, appName }: Props) {
  const { user, logout } = useAuth();
  const { settings, t } = useSettings();

  const displayName = settings.appName || appName;
  const logo = settings.logo;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* BG decoration */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 720, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {logo ? (
              <img src={logo} alt={displayName} style={{ height: 44, maxWidth: 160, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, boxShadow: '0 4px 12px rgba(99,102,241,0.35)', flexShrink: 0 }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>{displayName}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                {t('space_greeting', { name: user?.firstName ?? '' })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user?.firstName} {user?.lastName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{user?.email}</div>
            </div>
            <button onClick={logout} className="btn btn-ghost btn-sm">{t('logout')}</button>
          </div>
        </div>

        {/* Spaces grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {spaces.map(space => (
            <button key={space.id} onClick={() => onSelect(space)}
              style={{
                background: 'var(--bg2)', border: '2px solid var(--border)',
                borderRadius: 16, padding: '24px 20px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = space.color;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${space.color}30`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.transform = 'none';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${space.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>
                {space.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{space.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{space.description || ''}</div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: space.color, fontWeight: 600 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: space.color }} />
                {t('space_access_btn')}
              </div>
            </button>
          ))}

          {/* Global portfolio */}
          {user && ['superadmin', 'admin', 'global'].includes(user.role) && (
            <button onClick={() => onSelect({ id: '__global__', name: t('global_portfolio'), description: t('global_portfolio_subtitle'), color: '#f59e0b', icon: '🌐' })}
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))',
                border: '2px dashed rgba(245,158,11,0.4)',
                borderRadius: 16, padding: '24px 20px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f59e0b'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>🌐</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{t('global_portfolio')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('global_portfolio_subtitle')}</div>
              <div style={{ marginTop: 14, fontSize: 11, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="badge badge-yellow" style={{ fontSize: 10 }}>{user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'CODIR'}</span>
              </div>
            </button>
          )}
        </div>

        {spaces.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-muted)' }}>{t('no_space_assigned')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 4 }}>Contactez votre administrateur pour obtenir accès à un espace.</div>
          </div>
        )}
      </div>
    </div>
  );
}
