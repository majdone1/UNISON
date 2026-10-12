import { commentReactionSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function POST(
  request: Request,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await context.params;
    const parsed = commentReactionSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError('VALIDATION_ERROR');
    const repo = await getServerRepo() as DemoRepository;
    const comment = await repo.toggleCommentReaction(commentId, parsed.data.emoji);
    return jsonOk({ comment });
  } catch (error) {
    return mapRepoError(error);
  }
}
