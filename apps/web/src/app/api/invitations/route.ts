import { inviteMemberSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    return jsonOk({ invitations: await repo.listInvitations(session.org.id) });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(request: Request) {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    const parsed = inviteMemberSchema.safeParse({
      ...(await request.json()),
      orgId: session.org.id,
    });
    if (!parsed.success) return jsonError(parsed.error.message);
    const invitation = await repo.createInvitation(parsed.data);
    return jsonOk(
      {
        invitation,
        acceptUrl: `/app/invitations/accept?token=${invitation.token}`,
        note: 'Email delivery uses mock adapter until SMTP/provider credentials exist',
      },
      { status: 201 },
    );
  } catch (error) {
    return mapRepoError(error);
  }
}
