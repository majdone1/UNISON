import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';
import { z } from 'zod';

export async function GET(
  _request: Request,
  context: { params: Promise<{ channelId: string }> },
) {
  try {
    const { channelId } = await context.params;
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ messages: repo.listMessages(channelId) });
  } catch (error) {
    return mapRepoError(error);
  }
}

const postSchema = z.object({
  body: z.string().trim().min(1).max(8000),
  parentMessageId: z.string().uuid().nullable().optional(),
  linkRefs: z
    .array(
      z.object({
        type: z.enum(['board', 'item', 'file', 'dashboard', 'form']),
        id: z.string().min(1),
        href: z.string().min(1),
      }),
    )
    .optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ channelId: string }> },
) {
  try {
    const { channelId } = await context.params;
    const body = postSchema.parse(await request.json());
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({
      message: repo.postMessage({
        channelId,
        body: body.body,
        parentMessageId: body.parentMessageId,
        linkRefs: body.linkRefs,
      }),
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
