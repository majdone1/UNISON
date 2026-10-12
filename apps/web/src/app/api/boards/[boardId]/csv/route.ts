import { z } from 'zod';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  try {
    const { boardId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    const csv = await repo.exportBoardCsv(boardId);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="board-${boardId}.csv"`,
      },
    });
  } catch (error) {
    return mapRepoError(error);
  }
}

const importSchema = z.object({
  csv: z.string().min(1).max(500_000),
  groupId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  try {
    const { boardId } = await context.params;
    const parsed = importSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError('VALIDATION_ERROR');
    const repo = await getServerRepo() as DemoRepository;
    const result = await repo.importBoardCsv(boardId, parsed.data.csv, parsed.data.groupId);
    return jsonOk(result, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
