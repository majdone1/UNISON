import { describe, expect, it } from 'vitest';
import { COLUMN_REGISTRY, columnSupports, listAddableColumnTypes } from './column-registry';
import { accumulateTimeEntries, validateTimeEntryInput } from './time-engine';
import { INTEGRATION_REGISTRY, mockConnectProvider } from './integrations';
import { createMockSignedFileUrl, isSignedFileUrlExpired } from './signed-files';

describe('column registry', () => {
  it('registers Phase 3 types', () => {
    expect(COLUMN_REGISTRY.currency.addable).toBe(true);
    expect(COLUMN_REGISTRY.percentage.defaultSummary).toBe('avg');
    expect(COLUMN_REGISTRY.formula.readonly).toBe(true);
    expect(columnSupports('vote', 'sort')).toBe(true);
    expect(listAddableColumnTypes().some((t) => t.type === 'time_tracking')).toBe(true);
  });
});

describe('time engine', () => {
  it('accumulates kinds and validates input', () => {
    const totals = accumulateTimeEntries(
      [
        {
          id: '1',
          orgId: 'o',
          itemId: 'i',
          userId: 'u',
          kind: 'work',
          minutes: 60,
          workedOn: '2026-10-06',
          createdAt: '',
          costCents: 100,
        },
        {
          id: '2',
          orgId: 'o',
          itemId: 'i',
          userId: 'u',
          kind: 'travel',
          minutes: 30,
          workedOn: '2026-10-06',
          createdAt: '',
        },
      ],
      { includeFinancial: true },
    );
    expect(totals.workMinutes).toBe(60);
    expect(totals.travelMinutes).toBe(30);
    expect(totals.totalMinutes).toBe(90);
    expect(totals.costCents).toBe(100);
    expect(() => validateTimeEntryInput({ minutes: 0, workedOn: '2026-10-06' })).toThrow();
  });
});

describe('integrations registry', () => {
  it('includes Slack first and mock-connects without secrets', () => {
    expect(INTEGRATION_REGISTRY[0]?.id).toBe('slack');
    const mock = mockConnectProvider('slack');
    expect(mock.status).toBe('connected_mock');
    expect(mock.credentialRef.startsWith('cred_ref_')).toBe(true);
  });
});

describe('signed files', () => {
  it('never marks protected URLs public', () => {
    const signed = createMockSignedFileUrl({ attachmentId: 'a1', orgId: 'o1', ttlSeconds: 60 });
    expect(signed.public).toBe(false);
    expect(isSignedFileUrlExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
  });
});
