'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    fetch(`/api/auth/reset-confirm?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setStatus('valid'); setUserName(d.user?.first_name || ''); }
        else setStatus('invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleSubmit = async () => {
    if (!password || password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSubmitting(true); setError('');
    const r = await fetch('/api/auth/reset-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const d = await r.json();
    if (d.ok) setStatus('success');
    else { setError(d.error || 'An error occurred'); setSubmitting(false); }
  };

  const Eye = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ cursor: 'pointer' }} onClick={() => setShowPw(!showPw)}>
      {showPw
        ? <><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/></>
        : <><path d="M2 2l12 12M6.5 6.7A2 2 0 0110 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M4 4.3C2.3 5.4 1 8 1 8s2.5 5 7 5c1.6 0 3-.5 4.2-1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M8 3c4.5 0 7 5 7 5s-.6 1.2-1.7 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>
      }
    </svg>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eef2ff 0%, #f0f4ff 40%, #f5f0ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="white" strokeWidth="1.8"/>
              <path d="M8 11V7a4 4 0 118 0v4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.02em' }}>Réinitialisation</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>PPM·IT — Sécurité du compte</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: 16, padding: 28, boxShadow: '0 2px 16px rgba(99,102,241,0.07)' }}>
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              Vérification du lien…
            </div>
          )}

          {status === 'invalid' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 8 }}>Lien invalide ou expiré</div>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Ce lien de réinitialisation est invalide ou a expiré (validité 1h).</p>
              <a href="/" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                ← Retour à la connexion
              </a>
            </div>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 8 }}>Mot de passe modifié !</div>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Votre mot de passe a été mis à jour avec succès.</p>
              <a href="/" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                Se connecter →
              </a>
            </div>
          )}

          {status === 'valid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {userName && (
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
                  Bonjour <strong>{userName}</strong>, choisissez un nouveau mot de passe.
                </p>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nouveau mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Minimum 8 caractères"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    style={{ width: '100%', padding: '9px 40px 9px 12px', border: '1.5px solid #e8e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#f5f5fb' }}
                  />
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}><Eye /></div>
                </div>
                {password && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                    {['#ef4444','#f59e0b','#10b981'].map((c, i) => (
                      <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: password.length > i * 4 + 3 ? c : '#e5e7eb', transition: 'background 0.2s' }} />
                    ))}
                    <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>
                      {password.length < 8 ? 'Trop court' : password.length < 12 ? 'Moyen' : 'Fort'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confirmer</label>
                <input
                  type="password" placeholder="••••••••"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${confirm && confirm !== password ? '#ef4444' : '#e8e8f0'}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#f5f5fb' }}
                />
                {confirm && confirm !== password && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Les mots de passe ne correspondent pas</div>}
              </div>

              {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>⚠ {error}</div>}

              <button
                onClick={handleSubmit}
                disabled={submitting || !password || password !== confirm || password.length < 8}
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (submitting || !password || password !== confirm || password.length < 8) ? 0.6 : 1, fontFamily: 'inherit' }}
              >
                {submitting ? '⏳ Mise à jour…' : 'Confirmer le nouveau mot de passe →'}
              </button>
              <a href="/" style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, textDecoration: 'none' }}>← Retour à la connexion</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif',color:'#6b7280'}}>⏳ Chargement…</div>}><ResetPasswordForm /></Suspense>;
}
