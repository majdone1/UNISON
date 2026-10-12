import { createTeamSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    return jsonOk({ teams: await repo.listTeams(session.org.id) });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(request: Request) {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    const parsed = createTeamSchema.safeParse({
      ...(await request.json()),
      orgId: session.org.id,
    });
    if (!parsed.success) return jsonError(parsed.error.message);
    const team = await repo.createTeam(parsed.data);
    return jsonOk({ team }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
