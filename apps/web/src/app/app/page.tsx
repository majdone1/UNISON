import Link from 'next/link';
import { Badge } from '@unison/ui';
import { getServerRepo, requireSession } from '@/lib/repo';

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-5"
      style={{
        background: '#FFFFFF',
        borderColor: '#E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: '#9CA3AF' }}
      >
        {label}
      </span>
      <span
        className="text-4xl font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

export default async function AppHomePage() {
  const repo = await getServerRepo();
  const session = await requireSession(repo);
  const boards = await repo.listBoards(session.org.id);
  const stats = await repo.dashboardStats(session.org.id);
  const notifications = await repo.listNotifications(session.user.id);

  const unread = notifications.filter((n) => !n.readAt);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <header className="flex items-start justify-between">
        <div>
          <p
            className="mb-1 text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#6C47FF' }}
          >
            Workspace
          </p>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: '#1A1A2E' }}
          >
            {session.org.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
            Welcome back, {session.user.displayName}
          </p>
        </div>
        <Link
          href="/app/boards"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: '#6C47FF' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New board
        </Link>
      </header>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total items" value={stats.totalItems} color="#1A1A2E" />
        <StatCard label="In progress"  value={stats.working}    color="#6C47FF" />
        <StatCard label="Stuck"         value={stats.stuck}      color="#EF4444" />
        <StatCard label="Boards"        value={stats.boards}     color="#10B981" />
      </section>

      {/* Boards */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: '#1A1A2E' }}>
            Boards
          </h2>
          <Link
            href="/app/boards"
            className="text-sm font-medium"
            style={{ color: '#6C47FF' }}
          >
            View all →
          </Link>
        </div>

        {boards.length === 0 ? (
          <div
            className="rounded-xl border border-dashed p-12 text-center"
            style={{ borderColor: '#E5E7EB' }}
          >
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              No boards yet.{' '}
              <Link href="/app/boards" style={{ color: '#6C47FF' }}>
                Create your first board →
              </Link>
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/app/boards/${board.id}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-[#F9FAFB]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ background: '#6C47FF' }}
                  >
                    {board.name[0]?.toUpperCase() ?? 'B'}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#1A1A2E' }}>
                      {board.name}
                    </p>
                    {board.description && (
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>
                        {board.description}
                      </p>
                    )}
                  </div>
                </div>
                <Badge>{board.visibility}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Notifications */}
      {unread.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold" style={{ color: '#1A1A2E' }}>
              Notifications
              <span
                className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: '#EF4444' }}
              >
                {unread.length}
              </span>
            </h2>
            <Link
              href="/app/notifications"
              className="text-sm font-medium"
              style={{ color: '#6C47FF' }}
            >
              See all →
            </Link>
          </div>

          <div
            className="divide-y rounded-xl border"
            style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
          >
            {unread.slice(0, 5).map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-5 py-4">
                <div
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: '#6C47FF' }}
                />
                <div>
                  <p className="font-medium" style={{ color: '#1A1A2E' }}>
                    {n.title}
                  </p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    {n.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
