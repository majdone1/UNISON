import Link from 'next/link';
import { Badge, buttonVariants } from '@unison/ui';
import { getServerRepo, requireSession } from '@/lib/repo';

export default async function AppHomePage() {
  const repo = await getServerRepo();
  const session = await requireSession(repo);
  const boards = await repo.listBoards(session.org.id);
  const stats = await repo.dashboardStats(session.org.id);
  const notifications = await repo.listNotifications(session.user.id);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--unison-teal)]">Workspace</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {session.org.name}
        </h1>
        <p className="max-w-2xl text-[var(--unison-muted)]">
          Signed in as {session.user.displayName} ({session.membership.role}). Local demo stays
          available; set DEMO_MODE=false with Supabase env to use unison-production.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Items', stats.totalItems],
          ['Working', stats.working],
          ['Stuck', stats.stuck],
          ['Boards', stats.boards],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4"
          >
            <div className="text-sm text-[var(--unison-muted)]">{label}</div>
            <div className="font-display mt-2 text-3xl font-bold">{value}</div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Boards</h2>
          <Link href="/app/boards" className={buttonVariants({ variant: 'secondary' })}>
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/app/boards/${board.id}`}
              className="flex items-center justify-between rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3 transition hover:border-[var(--unison-teal)]"
            >
              <div>
                <div className="font-medium">{board.name}</div>
                <div className="text-sm text-[var(--unison-muted)]">{board.description}</div>
              </div>
              <Badge>{board.visibility}</Badge>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Notifications</h2>
        {notifications.length === 0 ? (
          <p className="text-[var(--unison-muted)]">No notifications.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <div className="font-medium">{n.title}</div>
                {!n.readAt && <Badge tone="accent">Unread</Badge>}
              </div>
              <p className="text-sm text-[var(--unison-muted)]">{n.body}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
