"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/experiences", label: "Experiences" },
  { href: "/discover", label: "Plan My Day" },
  { href: "/provider", label: "Local Hosts" },
  { href: "/discovery", label: "Stories" },
];

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center">
        <svg viewBox="0 0 32 32" className="h-9 w-9">
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

export function Nav() {
  const path = usePathname();
  const onDark = path === "/";

  return (
    <header
      className={
        onDark
          ? "absolute inset-x-0 top-0 z-50"
          : "sticky top-0 z-50 border-b border-[var(--color-line)] bg-[rgba(246,244,239,0.9)] backdrop-blur"
      }
    >
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-4 px-5 lg:px-8">
        <Logo dark={onDark} />

        <nav
          className={`mx-auto hidden items-center gap-1 rounded-full p-1.5 lg:flex ${
            onDark ? "bg-white/12 backdrop-blur" : "bg-[#0b2422]/6"
          }`}
        >
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  onDark
                    ? `nav-pill ${active ? "nav-pill-on" : ""}`
                    : `rounded-full px-4 py-2 text-sm transition ${
                        active
                          ? "bg-[var(--color-deep)] font-semibold text-white"
                          : "text-[var(--color-ink-soft)] hover:bg-white"
                      }`
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <button
            aria-label="Search"
            className={`grid h-9 w-9 place-items-center rounded-full transition ${
              onDark ? "text-white/85 hover:bg-white/15" : "text-[var(--color-ink-soft)] hover:bg-white"
            }`}
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="M13.5 13.5 17.5 17.5" strokeLinecap="round" />
            </svg>
          </button>

          <span className={`hidden h-6 w-px sm:block ${onDark ? "bg-white/25" : "bg-[var(--color-line)]"}`} />

          <Link href="/discover" className="flex items-center gap-2.5">
            <span
              className={`grid h-9 w-9 place-items-center rounded-full ${
                onDark ? "bg-white/15 text-white" : "bg-[var(--color-deep)] text-white"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="8.5" r="3.6" />
                <path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" strokeLinecap="round" />
              </svg>
            </span>
            <span className={`hidden leading-tight sm:block ${onDark ? "text-white" : "text-[var(--color-ink)]"}`}>
              <span className="block text-[13px] font-medium">Explore</span>
              <span className={`block text-[13px] ${onDark ? "text-white/65" : "text-[var(--color-muted)]"}`}>
                More You
              </span>
            </span>
            <svg
              viewBox="0 0 12 12"
              className={`hidden h-3 w-3 sm:block ${onDark ? "text-white/70" : "text-[var(--color-muted)]"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
