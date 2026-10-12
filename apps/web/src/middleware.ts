import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getEnv, isDemoMode, type UnisonEnv } from '@unison/config';
import { MemoryRateLimiter, securityHeaders } from '@unison/security';

const apiLimiter = new MemoryRateLimiter(120, 60_000);
const mutateLimiter = new MemoryRateLimiter(40, 60_000);
/** Stricter buckets for public form landing abuse */
const formSubmitLimiter = new MemoryRateLimiter(10, 60_000);
const formViewLimiter = new MemoryRateLimiter(30, 60_000);
const searchLimiter = new MemoryRateLimiter(60, 60_000);

function isProtectedPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/');
}

function redirectToLogin(request: NextRequest, reason?: string): NextResponse {
  const url = request.nextUrl.clone();
  const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', target);
  if (reason) url.searchParams.set('error', reason);
  return NextResponse.redirect(url);
}

/**
 * Auth gate for /app/** in live Supabase mode: refreshes the session cookies and sends
 * unauthenticated visitors to /login. Fails closed (never lets anonymous traffic through).
 * Demo mode (DEMO_MODE=true or no Supabase credentials) is unchanged: no auth, in-memory data.
 */
async function authGate(request: NextRequest): Promise<NextResponse> {
  let env: UnisonEnv;
  try {
    env = getEnv();
  } catch {
    return redirectToLogin(request, 'config');
  }
  if (isDemoMode(env)) return NextResponse.next();

  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
            response = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );
    // getUser() verifies the JWT against Supabase Auth (and refreshes it); getSession() would not.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return response;
  } catch {
    return redirectToLogin(request, 'config');
  }

  const redirect = redirectToLogin(request);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export async function middleware(request: NextRequest) {
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

  const response = isProtectedPath(pathname) ? await authGate(request) : NextResponse.next();
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
