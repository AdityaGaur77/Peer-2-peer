export function Logo({ size = 26 }: { size?: number }) {
  // an open track with the baton at the gap — mid-handoff
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="logoBaton" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2a03d" />
          <stop offset="1" stopColor="#e4572e" />
        </linearGradient>
      </defs>
      <path
        d="M 26.4 8.9 A 12.5 12.5 0 1 0 29 16"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="27.5" cy="5.8" r="4.2" fill="url(#logoBaton)" />
    </svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="brand">
      <Logo size={size} />
      relay<span className="brand-dot">.</span>
    </span>
  );
}
