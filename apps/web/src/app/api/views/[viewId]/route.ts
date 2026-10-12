import { z } from 'zod';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
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
  config: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ viewId: string }> },
) {
  try {
    const { viewId } = await context.params;
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError('VALIDATION_ERROR');
    const repo = await getServerRepo() as DemoRepository;
    const view = await repo.updateView(viewId, parsed.data);
    return jsonOk({ view });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ viewId: string }> },
) {
  try {
    const { viewId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    await repo.deleteView(viewId);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
