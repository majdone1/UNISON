import { z } from 'zod';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

const createSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  type: z.enum([
    'table',
    'kanban',
    'calendar',
    'timeline',
    'dashboard',
    'workload',
    'chart',
    'cards',
    'gantt',
    'files_gallery',
    'map',
    'pivot',
  ]).optional(),
  visibility: z.enum(['personal', 'shared']).optional(),
  config: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError('VALIDATION_ERROR');
    const repo = await getServerRepo() as DemoRepository;
    const view = await repo.createView({
      ...parsed.data,
      config: parsed.data.config as import('@unison/shared').ViewConfig | undefined,
    });
    return jsonOk({ view }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
