import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import { getEnv, isDemoMode } from '@unison/config';
import { getDemoStore, resolveBackend } from '@unison/database';

export async function GET() {
  try {
    const env = getEnv();
    const demo = resolveBackend(env) === 'demo' || isDemoMode(env);
    const repo = await getServerRepo();
    const session = await repo.getSession();
    const entitlements = await repo.getEntitlements();
    if (demo) {
      const store = getDemoStore();
      return jsonOk({
        session,
        entitlements,
        demoMode: true,
        backend: 'demo' as const,
        impersonating: Boolean(store.impersonatorUserId),
        users: store.users.map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          platformRole: store.platformRoles[u.id] ?? 'none',
        })),
      });
    }
    return jsonOk({
      session,
      entitlements,
      demoMode: false,
      backend: 'supabase' as const,
      impersonating: false,
      users: [
        {
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.displayName,
          platformRole: session.platformRole,
        },
      ],
    });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string; action?: string };
    const repo = await getServerRepo();
    if (body.action === 'stop_impersonation') {
      repo.stopImpersonation();
    } else if (body.userId) {
      repo.switchUser(body.userId);
    }
    return jsonOk({ session: await repo.getSession() });
  } catch (error) {
    return mapRepoError(error);
  }
}
