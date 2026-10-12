import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const itemId = url.searchParams.get('itemId') ?? undefined;
    const userId = url.searchParams.get('userId') ?? undefined;
    const repo = (await getServerRepo()) as DemoRepository;
    const entries = repo.listTimeEntries({ itemId, userId });
    const totals = itemId ? repo.timeTotalsForItem(itemId) : null;
    return jsonOk({ entries, totals });
  } catch (error) {
    return mapRepoError(error);
  }
}

const createSchema = z.object({
  itemId: z.string().uuid(),
  minutes: z.number().int().positive().max(24 * 60),
  workedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['work', 'travel', 'break', 'overtime']).optional(),
  note: z.string().max(500).optional(),
  costCents: z.number().int().nonnegative().optional(),
  billableCents: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ entry: repo.createTimeEntry(body) });
  } catch (error) {
    return mapRepoError(error);
  }
}
