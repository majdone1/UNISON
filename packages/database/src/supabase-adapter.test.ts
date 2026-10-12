import { afterEach, describe, expect, it } from 'vitest';
import type { UnisonEnv } from '@unison/config';
import { DemoRepository, resolveBackend, getRepository, createSupabaseRepository } from './index';

function env(partial: Partial<UnisonEnv>): UnisonEnv {
  return {
    NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:43127',
    NEXT_PUBLIC_APP_NAME: 'UNISON',
    DEMO_MODE: true,
    NEXT_PUBLIC_SUPABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    DATABASE_URL: '',
    BILLING_PROVIDER: 'mock',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: '',
    STORAGE_BUCKET: 'attachments',
    RATE_LIMIT_ENABLED: true,
    CSP_ENABLED: true,
    DESKTOP_DEEP_LINK_SCHEME: 'unison',
    ...partial,
  };
}

describe('resolveBackend / DEMO_MODE', () => {
  afterEach(() => {
    // no globals mutated
  });

  it('uses demo when DEMO_MODE=true even if credentials present', () => {
    const e = env({
      DEMO_MODE: true,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key-not-secret',
    });
    expect(resolveBackend(e)).toBe('demo');
    expect(getRepository(e)).toBeInstanceOf(DemoRepository);
  });

  it('uses demo when credentials missing', () => {
    const e = env({ DEMO_MODE: false });
    expect(resolveBackend(e)).toBe('demo');
  });

  it('selects supabase backend when DEMO_MODE=false and credentials present', () => {
    const e = env({
      DEMO_MODE: false,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key-not-secret',
    });
    expect(resolveBackend(e)).toBe('supabase');
    const repo = getRepository(e);
    expect(repo.constructor.name).toBe('SupabaseRepository');
  });

  it('createSupabaseRepository rejects demo mode', async () => {
    await expect(createSupabaseRepository(env({ DEMO_MODE: true }))).rejects.toThrow(
      /SUPABASE_ADAPTER_DEMO_ACTIVE/,
    );
  });
});
