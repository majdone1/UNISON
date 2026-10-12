export function UnisonMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="48" height="48" rx="12" fill="#0E3D3F" />
      <path
        className="unison-mark-draw"
        d="M12 30c4-10 8-14 12-14s8 4 12 14"
        stroke="#C8F560"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="16" r="3" fill="#E8F3F1" />
    </svg>
  );
}

export function UnisonWordmark({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <UnisonMark className="h-9 w-9" />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          letterSpacing: '0.04em',
          fontSize: '1.35rem',
        }}
      >
        UNISON
      </span>
    </div>
  );
}
