import * as React from 'react';
import { cn } from './cn';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-3 text-sm text-[var(--unison-text)] placeholder:text-[var(--unison-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--unison-ring)]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
