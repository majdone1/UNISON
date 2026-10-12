import type { TimeEntry, TimeEntryKind } from '@unison/types';

export interface TimeTotals {
  workMinutes: number;
  travelMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  totalMinutes: number;
  /** Present only when caller has time:read_financial */
  costCents?: number;
  billableCents?: number;
}

export function emptyTimeTotals(): TimeTotals {
  return {
    workMinutes: 0,
    travelMinutes: 0,
    breakMinutes: 0,
    overtimeMinutes: 0,
    totalMinutes: 0,
  };
}

export function accumulateTimeEntries(
  entries: TimeEntry[],
  opts?: { includeFinancial?: boolean },
): TimeTotals {
  const totals = emptyTimeTotals();
  for (const e of entries) {
    const kind: TimeEntryKind = e.kind ?? 'work';
    if (kind === 'work') totals.workMinutes += e.minutes;
    else if (kind === 'travel') totals.travelMinutes += e.minutes;
    else if (kind === 'break') totals.breakMinutes += e.minutes;
    else if (kind === 'overtime') totals.overtimeMinutes += e.minutes;
    totals.totalMinutes += e.minutes;
    if (opts?.includeFinancial) {
      totals.costCents = (totals.costCents ?? 0) + (e.costCents ?? 0);
      totals.billableCents = (totals.billableCents ?? 0) + (e.billableCents ?? 0);
    }
  }
  return totals;
}

/** Strip financial fields when caller lacks time:read_financial. */
export function redactTimeEntryFinancial<T extends TimeEntry>(
  entry: T,
  canReadFinancial: boolean,
): T {
  if (canReadFinancial) return entry;
  const { costCents: _c, billableCents: _b, ...rest } = entry;
  return { ...rest, costCents: null, billableCents: null } as T;
}

/**
 * Validate minutes and optional overnight / TZ-safe workedOn (ISO date YYYY-MM-DD).
 */
export function validateTimeEntryInput(input: {
  minutes: number;
  workedOn: string;
  kind?: TimeEntryKind;
}): void {
  if (!Number.isFinite(input.minutes) || input.minutes <= 0 || input.minutes > 24 * 60) {
    throw new Error('INVALID_TIME_MINUTES');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.workedOn)) {
    throw new Error('INVALID_WORKED_ON');
  }
}
