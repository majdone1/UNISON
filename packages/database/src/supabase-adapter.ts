import type { UnisonEnv } from '@unison/config';
import { getEnv, hasSupabaseCredentials, isDemoMode } from '@unison/config';
import type { UnisonRepository } from './repository';
import { DemoRepository, getDemoStore } from './demo-store';
import { SupabaseRepository } from './supabase-repository';

/**
 * Supabase adapter hook points (production).
 *
 * When credentials exist and DEMO_MODE=false:
 * 1. Create a Supabase JS client with anon key (user JWT) for RLS-bound reads/writes
 * 2. Use service role only in trusted server routes (webhooks, platform ops)
 * 3. Map PostgREST rows ↔ `@unison/types` domain models
 * 4. Keep the same `UnisonRepository` method surface so apps/web Route Handlers stay unchanged
 *
 * DEMO_MODE=true (default for local/CI) always uses the in-memory demo repository.
 */

export type DataBackend = 'demo' | 'supabase';

let warnedPartialCredentials = false;

export function resolveBackend(env: UnisonEnv = getEnv()): DataBackend {
  if (env.DEMO_MODE) return 'demo';
  if (!hasSupabaseCredentials(env)) return 'demo';
  return 'supabase';
}

export type RepositoryOptions = {
  /** Supabase Auth JWT for RLS. Required in live mode for user-scoped queries. */
  accessToken?: string;
};

export function getRepository(
  env: UnisonEnv = getEnv(),
  options: RepositoryOptions = {},
): UnisonRepository {
  const backend = resolveBackend(env);
  if (backend === 'demo') {
    if (!env.DEMO_MODE && !hasSupabaseCredentials(env) && !warnedPartialCredentials) {
      warnedPartialCredentials = true;
      console.warn(
        '[unison] DEMO_MODE=false but Supabase URL/anon key missing; using demo adapter. See docs/DATABASE.md.',
      );
    }
    return new DemoRepository(getDemoStore());
  }
  return SupabaseRepository.fromEnv(env, options.accessToken);
}

/**
 * Async factory — preferred entry for live mode (loads nothing until awaited).
 */
export async function createSupabaseRepository(
  env: UnisonEnv = getEnv(),
  accessToken?: string,
): Promise<UnisonRepository> {
  if (isDemoMode(env) || !hasSupabaseCredentials(env)) {
    throw new Error(
      'SUPABASE_ADAPTER_DEMO_ACTIVE: set DEMO_MODE=false and provide NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return SupabaseRepository.fromEnv(env, accessToken);
}

export const ADAPTER_HOOKS = [
  'getSession → auth.getUser() + org_memberships + platform_roles',
  'listBoards / getBoardBundle → boards + related tables filtered by RLS',
  'create/update/archive items → board_items with org_id checks',
  'comments/notifications → comments + notifications tables',
  'attachments → storage.from(bucket).upload with org-prefixed paths',
  'realtime → channel(`board:${boardId}`) postgres_changes',
  'billing webhooks → service-role updates to subscriptions',
] as const;

export { SupabaseRepository } from './supabase-repository';
export {
  createUserSupabaseClient,
  createServiceSupabaseClient,
  storageObjectPath,
} from './supabase-client';
