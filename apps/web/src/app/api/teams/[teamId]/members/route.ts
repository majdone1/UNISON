import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    const body = (await request.json()) as { userId?: string };
    if (!body.userId) return jsonError('userId required');
    await repo.addTeamMember(teamId, body.userId);
    return jsonOk({ ok: true }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return jsonError('userId required');
    await repo.removeTeamMember(teamId, userId);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
