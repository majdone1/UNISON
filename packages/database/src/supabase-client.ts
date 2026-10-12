import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UnisonEnv } from '@unison/config';
import { getEnv, hasSupabaseCredentials } from '@unison/config';

export type UnisonSupabaseClient = SupabaseClient;

function requireCredentials(env: UnisonEnv): asserts env is UnisonEnv & {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
} {
  if (!hasSupabaseCredentials(env)) {
    throw new Error(
      'SUPABASE_CREDENTIALS_MISSING: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (never commit secrets).',
    );
  }
}

/** RLS-bound anon/user client. Pass accessToken from Auth session when available. */
export function createUserSupabaseClient(
  env: UnisonEnv = getEnv(),
  accessToken?: string,
): UnisonSupabaseClient {
  requireCredentials(env);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

/**
 * Service-role client for trusted server routes only (webhooks, platform ops).
 * Never import into client components or expose the key.
 */
export function createServiceSupabaseClient(env: UnisonEnv = getEnv()): UnisonSupabaseClient {
  requireCredentials(env);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_MISSING: required only for trusted server routes (webhooks/platform).',
    );
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function storageObjectPath(input: {
  orgId: string;
  kind: 'items' | 'docs' | 'images' | 'video';
  itemId?: string;
  fileName: string;
}): string {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const itemPart = input.itemId ? `items/${input.itemId}/` : '';
  return `${input.orgId}/${input.kind}/${itemPart}${Date.now()}-${safeName}`;
}
