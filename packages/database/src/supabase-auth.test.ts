import { describe, expect, it, vi } from 'vitest';
import { getEnv } from '@unison/config';
import {
  AuthRequiredError,
  SupabaseRepository,
  isAuthRequiredError,
  type UnisonSupabaseClient,
} from './index';

const env = getEnv({
  DEMO_MODE: 'false',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
});

function fakeClient(getUser: ReturnType<typeof vi.fn>) {
  return { auth: { getUser }, from: vi.fn() } as unknown as UnisonSupabaseClient;
}

describe('SupabaseRepository.getSession without a session', () => {
  it('throws AuthRequiredError (not a generic AUTH_GET_USER fault) when no access token is present', async () => {
    const getUser = vi.fn();
    const repo = new SupabaseRepository(fakeClient(getUser), env);
    const error = await repo.getSession().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthRequiredError);
    expect(isAuthRequiredError(error)).toBe(true);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('verifies the supplied access token explicitly and maps "Auth session missing" to AuthRequiredError', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('Auth session missing!'), {
        name: 'AuthSessionMissingError',
        status: 400,
      }),
    });
    const repo = new SupabaseRepository(fakeClient(getUser), env, 'expired.jwt.token');
    await expect(repo.getSession()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(getUser).toHaveBeenCalledWith('expired.jwt.token');
  });

  it('treats an invalid/rejected token (4xx) as unauthenticated but still surfaces upstream 5xx faults', async () => {
    const rejected = vi.fn().mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('invalid JWT'), { name: 'AuthApiError', status: 401 }),
    });
    await expect(
      new SupabaseRepository(fakeClient(rejected), env, 'bad.jwt').getSession(),
    ).rejects.toBeInstanceOf(AuthRequiredError);

    const outage = vi.fn().mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('upstream down'), {
        name: 'AuthRetryableFetchError',
        status: 503,
      }),
    });
    const error = await new SupabaseRepository(fakeClient(outage), env, 'tok')
      .getSession()
      .catch((e: unknown) => e);
    expect(isAuthRequiredError(error)).toBe(false);
    expect((error as Error).message).toContain('AUTH_GET_USER');
  });
});
