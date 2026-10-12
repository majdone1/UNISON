import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    const body = (await request.json()) as { name?: string; workspaceId?: string | null };
    if (!body.name && body.workspaceId === undefined) return jsonError('Nothing to update');
    const team = await repo.updateTeam(teamId, body);
    return jsonOk({ team });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    await repo.deleteTeam(teamId);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
