import { createWorkspaceSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    return jsonOk({ workspaces: await repo.listWorkspaces(session.org.id) });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(request: Request) {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse({
      ...body,
      orgId: session.org.id,
    });
    if (!parsed.success) return jsonError(parsed.error.message);
    const workspace = await repo.createWorkspace(
      session.org.id,
      parsed.data.name,
      parsed.data.description,
    );
    return jsonOk({ workspace }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
