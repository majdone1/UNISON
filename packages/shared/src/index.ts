import type { Locale } from '@unison/types';

export * from './i18n';
export * from './notifications';
export * from './mentions';
export * from './column-values';
export * from './formula';
export * from './filters';
export * from './webhook';
export * from './csv';
export * from './column-registry';
export * from './integrations';
export * from './time-engine';
export * from './signed-files';


export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix = ''): string {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return prefix ? `${prefix}_${id}` : id;
}

/** Deterministic UUIDv4 ids for demo seed stability (always Zod-valid). */
export function demoUuid(seed: string): string {
  let h1 = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
  }
  let h2 = 2166136261;
  for (let i = seed.length - 1; i >= 0; i -= 1) {
    h2 ^= seed.charCodeAt(i);
    h2 = Math.imul(h2, 16777619);
  }
  const bytes = new Array<number>(16);
  for (let i = 0; i < 8; i += 1) {
    bytes[i] = (h1 >>> (i * 4)) & 0xff;
    bytes[i + 8] = (h2 >>> (i * 4)) & 0xff;
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function parseMentions(body: string): string[] {
  const matches = body.match(/@\[([0-9a-f-]{36})\]/gi) ?? [];
  return matches.map((m) => m.slice(2, -1));
}

export function localeFromHeader(value?: string | null): Locale {
  if (!value) return 'en';
  if (value.toLowerCase().startsWith('ar')) return 'ar';
  if (value.toLowerCase().startsWith('he')) return 'he';
  return 'en';
}

export function sortByPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
