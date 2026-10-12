import Link from 'next/link';
import { buttonVariants } from '@unison/ui';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <h1 className="font-display text-4xl font-bold">Not found</h1>
      <p className="text-[var(--unison-muted)]">That page is outside this workspace.</p>
      <Link href="/" className={buttonVariants()}>
        Back to UNISON
      </Link>
    </main>
  );
}
