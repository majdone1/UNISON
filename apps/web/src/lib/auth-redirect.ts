/**
 * Validates a post-login redirect target. Only same-origin absolute paths are allowed:
 * rejects protocol-relative ("//evil.com"), backslash tricks ("/\evil.com"), absolute URLs,
 * control characters, and the auth pages themselves (avoids redirect loops).
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/app'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  if (raw.length > 2048) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  const pathOnly = raw.split(/[?#]/)[0] ?? '';
  if (pathOnly === '/login' || pathOnly.startsWith('/login/') || pathOnly.startsWith('/auth/')) {
    return fallback;
  }
  return raw;
}
