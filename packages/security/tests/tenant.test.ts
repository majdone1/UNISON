import { describe, expect, it } from 'vitest';
import { assertSameTenant, MemoryRateLimiter, redactSecrets } from '../src/index';

describe('tenant isolation helpers', () => {
  it('denies cross-tenant access', () => {
    expect(() => assertSameTenant('org-a', 'org-b')).toThrow('CROSS_TENANT_DENIED');
    expect(() => assertSameTenant('org-a', 'org-a')).not.toThrow();
  });

  it('redacts secrets', () => {
    const redacted = redactSecrets({
      email: 'a@b.com',
      passwordHash: 'x',
      stripeSecret: 'sk_test',
    });
    expect(redacted.email).toBe('a@b.com');
    expect(redacted.passwordHash).toBe('[REDACTED]');
    expect(redacted.stripeSecret).toBe('[REDACTED]');
  });

  it('rate limits bursts', () => {
    const limiter = new MemoryRateLimiter(2, 1000);
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(false);
  });
});
