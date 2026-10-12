import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';
import { z } from 'zod';

export async function GET(
  _request: Request,
  context: { params: Promise<{ docId: string }> },
) {
  try {
    const { docId } = await context.params;
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ doc: repo.getWorkdoc(docId) });
  } catch (error) {
    return mapRepoError(error);
  }
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z
    .object({
      blocks: z.array(
        z.object({
          id: z.string().min(1),
          type: z.string().min(1),
          text: z.string(),
        }),
      ),
    })
    .optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ docId: string }> },
) {
  try {
    const { docId } = await context.params;
    const body = patchSchema.parse(await request.json());
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ doc: repo.updateWorkdoc(docId, body) });
  } catch (error) {
    return mapRepoError(error);
  }
}
