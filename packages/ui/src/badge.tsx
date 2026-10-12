import type { ReactNode } from 'react';
import { cn } from './cn';

export function Badge({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'accent';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'bg-[var(--unison-mist)] text-[var(--unison-slate)]',
        tone === 'success' && 'bg-[#d9f5e5] text-[#14532d]',
        tone === 'warn' && 'bg-[#fff1c2] text-[#7a4e00]',
        tone === 'danger' && 'bg-[#ffe0d6] text-[#7a2710]',
        tone === 'accent' && 'bg-[var(--unison-chartreuse)] text-[var(--unison-ink)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
