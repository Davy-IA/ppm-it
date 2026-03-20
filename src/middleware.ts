import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ── Security headers ────────────────────────────────────────
  // Prevent embedding in iframes (clickjacking)
  res.headers.set('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.headers.set('X-Content-Type-Options', 'nosniff');
  // Block referrer leaking
  res.headers.set('Referrer-Policy', 'no-referrer');
  // Prevent caching of sensitive pages
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  // Content Security Policy — only allow our own resources
  res.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js needs these
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://*.supabase.co https://api.resend.com https://api.anthropic.com",
    "frame-ancestors 'none'",
  ].join('; '));

  // ── Bot / crawler detection ──────────────────────────────────
  const ua = req.headers.get('user-agent') ?? '';
  const blockedBots = [
    'GPTBot', 'ChatGPT', 'CCBot', 'anthropic-ai', 'Claude-Web',
    'Google-Extended', 'Bytespider', 'cohere-ai', 'DataForSeo',
    'Omgilibot', 'SemrushBot', 'AhrefsBot', 'MJ12bot',
    'DotBot', 'BLEXBot', 'serpstatbot', 'PetalBot',
  ];

  const isBot = blockedBots.some(bot => ua.toLowerCase().includes(bot.toLowerCase()));

  if (isBot) {
    return new NextResponse('Access denied', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return res;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and Next internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
