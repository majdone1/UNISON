import { describe, expect, it } from 'vitest';
import { createBoardSchema, createOrgSchema, localeSchema, orgRoleSchema } from './index';

describe('validation schemas', () => {
  it('accepts a valid org payload', () => {
    const parsed = createOrgSchema.parse({ name: 'Acme', slug: 'acme-co' });
    expect(parsed.slug).toBe('acme-co');
  });

  it('rejects invalid org slug', () => {
    expect(() => createOrgSchema.parse({ name: 'Acme', slug: 'Acme!' })).toThrow();
  });

  it('defaults board visibility', () => {
    const parsed = createBoardSchema.parse({
      orgId: '11111111-1111-4111-8111-111111111111',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      name: 'Launch',
    });
    expect(parsed.visibility).toBe('workspace');
  });

  it('exposes locale and role enums', () => {
    expect(localeSchema.parse('ar')).toBe('ar');
    expect(orgRoleSchema.parse('guest')).toBe('guest');
  });
});
