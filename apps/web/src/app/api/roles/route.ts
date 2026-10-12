import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';
import { z } from 'zod';

export async function GET() {
  try {
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ roles: repo.listCustomRoles() });
  } catch (error) {
    return mapRepoError(error);
  }
}

const createSchema = z.object({
  orgId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(400).optional(),
  baseRole: z.enum(['owner', 'admin', 'workspace_admin', 'member', 'viewer', 'guest']),
  grants: z.array(z.string()).optional(),
  denies: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const repo = (await getServerRepo()) as DemoRepository;
    const session = await repo.getSession();
    const role = repo.createCustomRole({
      orgId: body.orgId ?? session.org.id,
      name: body.name,
      description: body.description,
      baseRole: body.baseRole,
      grants: body.grants,
      denies: body.denies,
    });
    return jsonOk({ role });
  } catch (error) {
    return mapRepoError(error);
  }
}
