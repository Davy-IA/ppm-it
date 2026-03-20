import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Find user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, active')
      .eq('email', email.toLowerCase().trim())
      .eq('active', true)
      .single();

    // Always return success to avoid user enumeration
    if (!user) {
      return NextResponse.json({ ok: true, message: 'If this email exists, a reset link was sent.' });
    }

    // Generate secure token (1h expiry)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Invalidate any existing tokens for this user
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Store new token
    await supabaseAdmin.from('password_reset_tokens').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    // Send email via Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ppm-it.vercel.app';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PPM·IT <noreply@ppm-it.app>',
          to: [user.email],
          subject: 'Réinitialisation de votre mot de passe — PPM·IT',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
              <h2 style="font-size: 20px; color: #1a1a2e; margin-bottom: 8px;">Réinitialisation du mot de passe</h2>
              <p style="color: #6b7280; margin-bottom: 24px;">Bonjour ${user.first_name},<br/>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">
                Réinitialiser mon mot de passe →
              </a>
              <p style="color: #9ca3af; font-size: 12px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
              <p style="color: #d1d5db; font-size: 11px; margin-top: 16px;">Lien direct : ${resetUrl}</p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.json();
        console.error('Resend error:', err);
      }
    } else {
      // No email service configured — log the reset link for dev
      console.log(`[DEV] Password reset link for ${user.email}: ${resetUrl}`);
    }

    return NextResponse.json({ ok: true, message: 'If this email exists, a reset link was sent.' });
  } catch (err) {
    console.error('Reset request error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
