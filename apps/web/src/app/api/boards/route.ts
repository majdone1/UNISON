import { createBoardSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function GET(request: Request) {
  try {
    const repo = await getServerRepo();
    const session = await repo.getSession();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') ?? undefined;
    return jsonOk({ boards: await repo.listBoards(session.org.id, workspaceId) });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(request: Request) {
  try {
    const repo = await getServerRepo();
    const session = await repo.getSession();
    const parsed = createBoardSchema.safeParse({
      ...(await request.json()),
      orgId: session.org.id,
    });
    if (!parsed.success) return jsonError(parsed.error.message);
    const board = await repo.createBoard(parsed.data);
    return jsonOk({ board }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
