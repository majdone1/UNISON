import { describe, expect, it } from 'vitest';
import { resolveMentions } from './mentions';

describe('resolveMentions', () => {
  const members = [
    { userId: '11111111-1111-4111-a111-111111111111', displayName: 'Jordan Lee' },
    { userId: '22222222-2222-4222-a222-222222222222', displayName: 'Ava Chen' },
  ];

  it('resolves @DisplayName mentions', () => {
    const ids = resolveMentions('Hey @Jordan Lee please review', members);
    expect(ids).toEqual(['11111111-1111-4111-a111-111111111111']);
  });

  it('resolves uuid form and multiple mentions', () => {
    const ids = resolveMentions(
      'cc @[22222222-2222-4222-a222-222222222222] and @Jordan Lee',
      members,
    );
    expect(ids.sort()).toEqual(
      [
        '11111111-1111-4111-a111-111111111111',
        '22222222-2222-4222-a222-222222222222',
      ].sort(),
    );
  });
});
