import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    const attachment = await repo.getAttachment(id);
    return jsonOk({
      attachment: {
        id: attachment.id,
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        storagePath: attachment.storagePath,
        dataBase64: attachment.dataBase64,
      },
    });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    await repo.deleteAttachment(id);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
