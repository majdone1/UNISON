import { describe, expect, it } from 'vitest';
import { safeNextPath } from './auth-redirect';

describe('safeNextPath', () => {
  it('keeps same-origin app paths including query', () => {
    expect(safeNextPath('/app/boards/abc?view=1')).toBe('/app/boards/abc?view=1');
    expect(safeNextPath('/app')).toBe('/app');
  });

  it('falls back for open-redirect attempts', () => {
    for (const bad of [
      '//evil.com',
      '///evil.com',
      'https://evil.com',
      'javascript:alert(1)',
      '/\\evil.com',
      '/app\r\nSet-Cookie: x=1',
      'app/relative',
    ]) {
      expect(safeNextPath(bad)).toBe('/app');
    }
  });

  it('falls back for empty values and auth pages (loop protection)', () => {
    expect(safeNextPath(undefined)).toBe('/app');
    expect(safeNextPath('')).toBe('/app');
    expect(safeNextPath('/login?next=/app')).toBe('/app');
    expect(safeNextPath('/auth/callback')).toBe('/app');
  });
});
