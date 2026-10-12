import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const { attachmentId } = await context.params;
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ signed: repo.getSignedAttachmentUrl(attachmentId) });
  } catch (error) {
    return mapRepoError(error);
  }
}
