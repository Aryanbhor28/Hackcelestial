import Link from "next/link";

/**
 * LocalFlow mark. Lives in its own file so both the header and the auth modal
 * can use it without importing each other.
 */
export function LogoMark({ className = "h-9 w-9", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="lfpin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6b269" />
          <stop offset="100%" stopColor="#ea7a2c" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5c-5.1 0-9.2 4.1-9.2 9.2 0 6.6 8.2 17 8.5 17.4a.9.9 0 0 0 1.4 0c.3-.4 8.5-10.8 8.5-17.4 0-5.1-4.1-9.2-9.2-9.2z"
        fill="url(#lfpin)"
      />
      <circle cx="16" cy="11.5" r="3.4" fill={dark ? "#0b2422" : "#fff"} />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center">
        <LogoMark dark={dark} />
      </span>
      <span className="leading-tight">
        <span
          className={`block text-[19px] font-bold tracking-tight ${
            dark ? "text-white" : "text-[var(--color-ink)]"
          }`}
        >
          Local<span className="text-[var(--color-amber)]">Flow</span>
        </span>
        <span
          className={`block text-[10px] tracking-wide ${
            dark ? "text-white/60" : "text-[var(--color-muted)]"
          }`}
        >
          Real Places. Deeper Stories.
        </span>
      </span>
    </Link>
  );
}
