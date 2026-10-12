import { z } from 'zod';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

const uploadSchema = z.object({
  itemId: z.string().uuid(),
  fileName: z.string().min(1).max(180),
  contentType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
  dataBase64: z.string().min(1).max(8_000_000),
});

export async function GET(request: Request) {
  try {
    const itemId = new URL(request.url).searchParams.get('itemId');
    if (!itemId) return jsonError('itemId required');
    const repo = await getServerRepo() as DemoRepository;
    return jsonOk({ attachments: await repo.listAttachments(itemId) });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = uploadSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.message);
    const repo = await getServerRepo() as DemoRepository;
    const attachment = await repo.addAttachment(parsed.data);
    return jsonOk({ attachment }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
