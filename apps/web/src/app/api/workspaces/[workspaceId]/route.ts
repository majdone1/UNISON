import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    const body = (await request.json()) as { name?: string; description?: string };
    if (!body.name && body.description === undefined) {
      return jsonError('Nothing to update');
    }
    const workspace = await repo.updateWorkspace(workspaceId, body);
    return jsonOk({ workspace });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    await repo.deleteWorkspace(workspaceId);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
