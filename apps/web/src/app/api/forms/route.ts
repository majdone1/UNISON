import { z } from 'zod';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

const createSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional(),
  fieldKeys: z.array(z.string().min(1)).min(1),
  visibility: z.enum(['private', 'public']).optional(),
});

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    return jsonOk({ forms: await repo.listForms(session.org.id) });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError('VALIDATION_ERROR');
    const repo = await getServerRepo() as DemoRepository;
    const form = await repo.createForm(parsed.data);
    return jsonOk({ form }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
