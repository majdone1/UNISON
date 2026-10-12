export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/** In-memory sliding window rate limiter (per-process). Replace with Redis in production. */
export class MemoryRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const prev = this.hits.get(key) ?? [];
    const recent = prev.filter((t) => t > windowStart);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return {
        allowed: false,
        remaining: 0,
        resetAt: (recent[0] ?? now) + this.windowMs,
      };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return {
      allowed: true,
      remaining: Math.max(0, this.limit - recent.length),
      resetAt: now + this.windowMs,
    };
  }
}

export function securityHeaders(options: { cspEnabled?: boolean; appUrl?: string } = {}): Record<string, string> {
  const appUrl = options.appUrl ?? 'http://127.0.0.1:43127';
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection': '0',
  };

  if (options.cspEnabled !== false) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' ${appUrl} https://*.supabase.co wss://*.supabase.co`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
  }

  return headers;
}

export function assertSameTenant(resourceOrgId: string, actorOrgId: string): void {
  if (resourceOrgId !== actorOrgId) {
    throw new Error('CROSS_TENANT_DENIED');
  }
}

export function redactSecrets<T extends Record<string, unknown>>(obj: T): T {
  const secretKeys = /password|secret|token|apikey|service_role|private_key/i;
  const out: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(out)) {
    if (secretKeys.test(key)) out[key] = '[REDACTED]';
  }
  return out as T;
}
