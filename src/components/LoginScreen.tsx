'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/context';

export default function LoginScreen() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const appName = settings.appName || 'VEJA Project Management';
  const logo = settings.logo;

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true); setError('');
    const err = await login(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Background decoration */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo + nom */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {logo ? (
            <img
              src={logo}
              alt={appName}
              style={{ height: 72, maxWidth: 240, objectFit: 'contain', margin: '0 auto 16px', display: 'block' }}
            />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'var(--accent-gradient)',
              margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              fontSize: 28, color: '#fff', fontWeight: 800,
            }}>
              {appName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 6 }}>
            {appName}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Connectez-vous à votre espace de travail
          </p>
        </div>

        {/* Formulaire */}
        <div className="card" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Adresse email
              </label>
              <input
                className="input" type="email" placeholder="vous@entreprise.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus style={{ fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Mot de passe
              </label>
              <input
                className="input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ fontSize: 14 }}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13, fontWeight: 500 }}>
                ⚠ {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              style={{ width: '100%', padding: '12px', fontSize: 14, marginTop: 4, opacity: (loading || !email || !password) ? 0.7 : 1 }}
            >
              {loading ? '⏳ Connexion...' : 'Se connecter →'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12, marginTop: 16 }}>
          Vous n'avez pas de compte ? Contactez votre administrateur.
        </p>
      </div>
    </div>
  );
}
