import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import { z } from 'zod';
import { itemStatusSchema, prioritySchema } from '@unison/validation';

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  action: z.enum(['archive', 'restore', 'set_status', 'set_priority']),
  status: itemStatusSchema.optional(),
  priority: prioritySchema.optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = bulkSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.message);
    const repo = await getServerRepo();
    for (const id of parsed.data.ids) {
      switch (parsed.data.action) {
        case 'archive':
          await repo.archiveItem(id);
          break;
        case 'restore':
          await repo.restoreItem(id);
          break;
        case 'set_status':
          if (!parsed.data.status) return jsonError('status required');
          await repo.updateItem(id, { status: parsed.data.status });
          break;
        case 'set_priority':
          if (!parsed.data.priority) return jsonError('priority required');
          await repo.updateItem(id, { priority: parsed.data.priority });
          break;
        default:
          break;
      }
    }
    return jsonOk({ ok: true, count: parsed.data.ids.length });
  } catch (error) {
    return mapRepoError(error);
  }
}
