import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getEnv, hasSupabaseCredentials, isDemoMode } from '@unison/config';
import { safeNextPath } from '@/lib/auth-redirect';

/**
 * Supabase Auth redirect target (Site URL / Additional Redirect URLs).
 * Exchanges the PKCE `code` for a session cookie, then sends the user into the app.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const safeNext = safeNextPath(url.searchParams.get('next'));
  const env = getEnv();

  if (code && !isDemoMode(env) && hasSupabaseCredentials(env)) {
    const cookieStore = await cookies();
    const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=callback', url.origin));
}
