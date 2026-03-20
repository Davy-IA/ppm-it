import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Block AI training crawlers by User-Agent
  const ua = req.headers.get('user-agent') ?? '';
  const blockedBots = [
    'GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'Claude-Web',
    'Google-Extended', 'Bytespider', 'cohere-ai', 'DataForSeoBot',
    'Omgilibot', 'AhrefsBot', 'MJ12bot', 'DotBot',
  ];

  const isBot = blockedBots.some(bot =>
    ua.toLowerCase().includes(bot.toLowerCase())
  );

  if (isBot) {
    return new NextResponse('Access denied', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Security headers (non-breaking)
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
};
