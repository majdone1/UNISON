import { acceptInvitationSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function POST(request: Request) {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const parsed = acceptInvitationSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.message);
    const result = await repo.acceptInvitation(parsed.data.token);
    return jsonOk({
      invitation: result.invitation,
      membership: result.membership,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
      session: await repo.getSession(),
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
