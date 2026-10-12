import { NextResponse, type NextRequest } from 'next/server';
import { MemoryRateLimiter, securityHeaders } from '@unison/security';

const apiLimiter = new MemoryRateLimiter(120, 60_000);
const mutateLimiter = new MemoryRateLimiter(40, 60_000);
/** Stricter buckets for public form landing abuse */
const formSubmitLimiter = new MemoryRateLimiter(10, 60_000);
const formViewLimiter = new MemoryRateLimiter(30, 60_000);
const searchLimiter = new MemoryRateLimiter(60, 60_000);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local';

  if (pathname.startsWith('/api/') && process.env.RATE_LIMIT_ENABLED !== 'false') {
    const isMutating = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const isFormApi = /^\/api\/forms\/[^/]+\/?$/.test(pathname);
    const isFormSubmit = isFormApi && request.method === 'POST';
    const isFormView = isFormApi && request.method === 'GET';
    const isSearch = pathname === '/api/search' && request.method === 'GET';
    const limiter = isFormSubmit
      ? formSubmitLimiter
      : isFormView
        ? formViewLimiter
        : isSearch
          ? searchLimiter
          : isMutating
            ? mutateLimiter
            : apiLimiter;
    const result = limiter.check(`${ip}:${pathname}`);
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', resetAt: result.resetAt },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }
  }

  const response = NextResponse.next();
  const headers = securityHeaders({
    cspEnabled: process.env.CSP_ENABLED !== 'false',
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:43127',
  });
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  response.headers.set('x-unison-path', pathname);

  const locale = request.cookies.get('unison_locale')?.value;
  if (locale === 'ar' || locale === 'he' || locale === 'en') {
    response.headers.set('x-unison-locale', locale);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
