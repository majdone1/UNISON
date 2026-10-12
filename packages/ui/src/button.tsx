import * as React from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export function buttonVariants(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const variant = opts?.variant ?? 'primary';
  const size = opts?.size ?? 'md';
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--unison-ring)] disabled:pointer-events-none disabled:opacity-50',
    variant === 'primary' &&
      'bg-[var(--unison-chartreuse)] text-[var(--unison-ink)] hover:brightness-95',
    variant === 'secondary' &&
      'bg-[var(--unison-surface-elevated)] text-[var(--unison-text)] border border-[var(--unison-border)] hover:bg-[var(--unison-mist)]',
    variant === 'ghost' && 'bg-transparent text-[var(--unison-text)] hover:bg-[var(--unison-mist)]',
    variant === 'danger' && 'bg-[var(--unison-coral)] text-white hover:brightness-95',
    size === 'sm' && 'h-8 px-3 text-sm',
    size === 'md' && 'h-10 px-4 text-sm',
    size === 'lg' && 'h-12 px-6 text-base',
    opts?.className,
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
