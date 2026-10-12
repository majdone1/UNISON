import { commentSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function POST(request: Request) {
  try {
    const parsed = commentSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.message);
    const comment = await (await getServerRepo()).addComment(
      parsed.data.itemId,
      parsed.data.body,
      parsed.data.mentionUserIds,
      parsed.data.parentCommentId,
    );
    return jsonOk({ comment }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
