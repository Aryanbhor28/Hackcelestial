"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { initialsOf, useAuth } from "@/lib/auth";

interface Item {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const TRAVELER: Item[] = [
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <>
        <circle cx="10" cy="7.4" r="3.1" />
        <path d="M3.8 16.6c1.2-3 3.5-4.5 6.2-4.5s5 1.5 6.2 4.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "My Trips",
    href: "/trips",
    icon: (
      <>
        <rect x="3.2" y="5.6" width="13.6" height="11" rx="2.2" />
        <path d="M7.2 5.6V3.4M12.8 5.6V3.4M3.2 9h13.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Saved Experiences",
    href: "/saved",
    icon: (
      <path
        d="M10 16.4s-5.6-3.6-5.6-7.4A3.2 3.2 0 0 1 10 6.6a3.2 3.2 0 0 1 5.6 2.4c0 3.8-5.6 7.4-5.6 7.4z"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <>
        <circle cx="10" cy="10" r="2.6" />
        <path d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9" strokeLinecap="round" />
      </>
    ),
  },
];

const PROVIDER: Item[] = [
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <>
        <circle cx="10" cy="7.4" r="3.1" />
        <path d="M3.8 16.6c1.2-3 3.5-4.5 6.2-4.5s5 1.5 6.2 4.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Provider Dashboard",
    href: "/provider",
    icon: (
      <>
        <rect x="3" y="3.4" width="6" height="6" rx="1.6" />
        <rect x="11" y="3.4" width="6" height="6" rx="1.6" />
        <rect x="3" y="11" width="6" height="6" rx="1.6" />
        <rect x="11" y="11" width="6" height="6" rx="1.6" />
      </>
    ),
  },
  {
    label: "My Experiences",
    href: "/provider",
    icon: (
      <>
        <path d="M3 10.5 10 5l7 5.5" strokeLinejoin="round" />
        <path d="M4.8 9.6V17h10.4V9.6" strokeLinejoin="round" />
      </>
    ),
  },
  {
    label: "Bookings",
    href: "/provider",
    icon: (
      <>
        <rect x="3.2" y="4.4" width="13.6" height="12" rx="2.2" />
        <path d="M3.2 8h13.6M7 4.4V2.6M13 4.4V2.6M7.6 11.6h4.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Availability",
    href: "/provider",
    icon: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="M10 5.8V10l2.8 1.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Add Experience",
    href: "/provider/new",
    icon: <path d="M10 4.6v10.8M4.6 10h10.8" strokeLinecap="round" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <>
        <circle cx="10" cy="10" r="2.6" />
        <path d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9" strokeLinecap="round" />
      </>
    ),
  },
];

export function AccountMenu({ onDark }: { onDark: boolean }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const items = user.role === "provider" ? PROVIDER : TRAVELER;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`acct-trigger ${onDark ? "on-dark" : ""}`}
      >
        <span className="acct-avatar">{initialsOf(user.name)}</span>
        <span className="acct-id">
          <span className="acct-name">{user.name.split(" ")[0]}</span>
          <span className="acct-role">
            {user.role === "provider" ? "Local Host" : "Traveler"}
          </span>
        </span>
        <svg
          viewBox="0 0 12 12"
          className={`acct-caret ${open ? "is-open" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-menu-head">
            <span className="acct-avatar lg">{initialsOf(user.name)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block truncate text-xs text-[var(--color-muted)]">
                {user.email}
              </span>
            </span>
          </div>

          <div className="acct-menu-list">
            {items.map((it) => (
              <Link
                key={it.label}
                href={it.href}
                role="menuitem"
                className="acct-item"
                onClick={() => setOpen(false)}
              >
                <svg viewBox="0 0 20 20" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.6">
                  {it.icon}
                </svg>
                {it.label}
              </Link>
            ))}
          </div>

          <button
            className="acct-item is-logout"
            role="menuitem"
            onClick={() => {
              logout();
              setOpen(false);
              router.push("/");
            }}
          >
            <svg viewBox="0 0 20 20" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12.4 6.2V4.4a1.6 1.6 0 0 0-1.6-1.6H4.6A1.6 1.6 0 0 0 3 4.4v11.2a1.6 1.6 0 0 0 1.6 1.6h6.2a1.6 1.6 0 0 0 1.6-1.6v-1.8" strokeLinecap="round" />
              <path d="M8 10h9M14.2 7.2 17 10l-2.8 2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
