import { UnisonWordmark, buttonVariants } from '@unison/ui';

/**
 * Landing CTAs use plain anchors (not next/link) so navigation works even if
 * client-side routing fails to hydrate — native browser navigation always wins.
 */
export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-[var(--unison-mist)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--unison-hero-glow)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(232,243,241,0.25) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-8">
        <header className="flex items-center justify-between unison-rise">
          <UnisonWordmark className="text-[var(--unison-mist)]" />
          <nav className="flex items-center gap-3">
            <a href="/app" className="text-sm text-[var(--unison-mist)]/80 hover:text-white">
              Product
            </a>
            <a href="/app" className={buttonVariants({ size: 'sm' })}>
              Enter demo
            </a>
          </nav>
        </header>

        <section className="mt-auto flex max-w-3xl flex-col gap-6 pb-10 pt-24">
          <p className="unison-rise text-sm uppercase tracking-[0.28em] text-[var(--unison-chartreuse)]">
            UNISON
          </p>
          <h1 className="font-display unison-rise unison-rise-delay-1 text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-7xl">
            Work in concert.
          </h1>
          <p className="unison-rise unison-rise-delay-2 max-w-xl text-lg text-[var(--unison-mist)]/85 md:text-xl">
            Boards, ownership, and rhythm for multi-tenant teams — without the noise of a generic
            project wall.
          </p>
          <div className="unison-rise unison-rise-delay-2 flex flex-wrap gap-3">
            <a href="/app" className={buttonVariants({ size: 'lg' })} data-testid="cta-open-demo">
              Open workspace demo
            </a>
            <a
              href="/app/platform"
              className={buttonVariants({
                size: 'lg',
                variant: 'secondary',
                className: 'border-white/20 bg-white/10 text-white hover:bg-white/20',
              })}
              data-testid="cta-platform"
            >
              Platform console
            </a>
          </div>
        </section>

        <div
          className="pointer-events-none absolute bottom-0 right-0 z-0 h-[55vh] w-[55vw] max-w-3xl opacity-90 unison-rise unison-rise-delay-2"
          aria-hidden
        >
          <svg viewBox="0 0 640 480" className="h-full w-full">
            <defs>
              <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#163a36" />
                <stop offset="100%" stopColor="#0b2426" />
              </linearGradient>
            </defs>
            <rect x="80" y="60" width="480" height="340" rx="28" fill="url(#panel)" opacity="0.9" />
            <rect x="110" y="100" width="180" height="18" rx="9" fill="#C8F560" opacity="0.9" />
            <rect x="110" y="140" width="420" height="12" rx="6" fill="#E8F3F1" opacity="0.25" />
            <rect x="110" y="170" width="360" height="12" rx="6" fill="#E8F3F1" opacity="0.18" />
            <rect x="110" y="220" width="200" height="100" rx="16" fill="#1F6F6A" />
            <rect x="330" y="220" width="200" height="100" rx="16" fill="#E86F4A" opacity="0.85" />
            <circle
              cx="520"
              cy="90"
              r="18"
              fill="#C8F560"
              className="origin-center"
              style={{ animation: 'unison-pulse-soft 2.8s ease-in-out infinite' }}
            />
          </svg>
        </div>

        <p className="mt-10 text-center text-xs text-[var(--unison-mist)]/50">
          UNISON · By Majd Asali
        </p>
      </div>
    </main>
  );
}
