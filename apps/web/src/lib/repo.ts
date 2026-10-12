import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { getEnv, hasSupabaseCredentials, isDemoMode, type UnisonEnv } from '@unison/config';
import {
  getRepository,
  isAuthRequiredError,
  resolveBackend,
  type RepositoryOptions,
  type UnisonRepository,
} from '@unison/database';
import type { DemoSession } from '@unison/types';

/** Prefer this over DemoRepository directly — swaps to Supabase when wired. */
export function getRepo(options: RepositoryOptions = {}): UnisonRepository {
  return getRepository(getEnv(), options);
}

/** True when the app talks to a live Supabase project (as opposed to the in-memory demo). */
export function isLiveSupabase(env: UnisonEnv = getEnv()): boolean {
  return !(resolveBackend(env) === 'demo' || isDemoMode(env) || !hasSupabaseCredentials(env));
}

/** Cookie-bound Supabase SSR client (anon key). Only call when `isLiveSupabase(env)` is true. */
export async function createSupabaseServerClient(env: UnisonEnv = getEnv()) {
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component without mutable cookies — ignore (middleware refreshes).
        }
      },
    },
  });
}

/**
 * Server-side repository with Auth cookie JWT when live Supabase is configured.
 * In DEMO_MODE (default/CI) returns the in-memory demo repository.
 *
 * Without a valid signed-in user the repository carries no token, so `getSession()` throws
 * `AuthRequiredError` (mapped to 401 by API routes / redirect to /login by pages).
 */
export async function getServerRepo(): Promise<UnisonRepository> {
  const env = getEnv();
  if (!isLiveSupabase(env)) {
    return getRepository(env);
  }

  const supabase = await createSupabaseServerClient(env);
  // getUser() validates the JWT with Supabase Auth (getSession() alone only trusts the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return getRepository(env);

  const { data } = await supabase.auth.getSession();
  return getRepository(env, { accessToken: data.session?.access_token });
}

/**
 * For Server Components: resolve the session or redirect to /login instead of throwing (HTTP 500).
 */
export async function requireSession(repo: UnisonRepository): Promise<DemoSession> {
  try {
    return await repo.getSession();
  } catch (error) {
    if (isAuthRequiredError(error)) redirect('/login');
    if (error instanceof Error && error.message.startsWith('ORG_MEMBERSHIP_REQUIRED')) {
      redirect('/login?error=no_org');
    }
    throw error;
  }
}
