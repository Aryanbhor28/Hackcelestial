"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthModal, type AuthMode } from "./AuthModal";
import { AccountMenu } from "./AccountMenu";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/experiences", label: "Experiences" },
  { href: "/discover", label: "Plan My Day" },
  { href: "/provider", label: "Local Hosts" },
  { href: "/discovery", label: "Stories" },
];

// re-exported so existing imports (`import { Logo } from "@/components/Nav"`) keep working
export { Logo, LogoMark } from "./Logo";

export function Nav() {
  const path = usePathname();
  const onDark = path === "/";
  const { user, ready } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const openAuth = (m: AuthMode) => {
    setAuthMode(m);
    setAuthOpen(true);
  };

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
            className={`hidden h-9 w-9 place-items-center rounded-full transition sm:grid ${
              onDark ? "text-white/85 hover:bg-white/15" : "text-[var(--color-ink-soft)] hover:bg-white"
            }`}
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="M13.5 13.5 17.5 17.5" strokeLinecap="round" />
            </svg>
          </button>

          <span className={`hidden h-6 w-px sm:block ${onDark ? "bg-white/25" : "bg-[var(--color-line)]"}`} />

          {/* auth slot — reserves width while localStorage is read so the header never jumps */}
          {!ready ? (
            <span className="auth-slot-skeleton" aria-hidden />
          ) : user ? (
            <AccountMenu onDark={onDark} />
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAuth("login")}
                className={`nav-login ${onDark ? "on-dark" : ""}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="nav-signup"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      {/* mounted only while open so every launch starts from a clean form */}
      {authOpen && (
        <AuthModal
          open
          mode={authMode}
          onMode={setAuthMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </header>
  );
}
