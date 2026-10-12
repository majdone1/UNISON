import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getEnv, hasSupabaseCredentials, isDemoMode } from '@unison/config';
import {
  getRepository,
  resolveBackend,
  type RepositoryOptions,
  type UnisonRepository,
} from '@unison/database';

/** Prefer this over DemoRepository directly — swaps to Supabase when wired. */
export function getRepo(options: RepositoryOptions = {}): UnisonRepository {
  return getRepository(getEnv(), options);
}

/**
 * Server-side repository with Auth cookie JWT when live Supabase is configured.
 * In DEMO_MODE (default/CI) returns the in-memory demo repository.
 */
export async function getServerRepo(): Promise<UnisonRepository> {
  const env = getEnv();
  if (resolveBackend(env) === 'demo' || isDemoMode(env) || !hasSupabaseCredentials(env)) {
    return getRepository(env);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
          // Called from a Server Component without mutable cookies — ignore.
        }
      },
    },
  });

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  return getRepository(env, { accessToken });
}
