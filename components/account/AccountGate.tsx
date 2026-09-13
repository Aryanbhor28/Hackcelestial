"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

/**
 * Account pages need a signed-in user. Rather than bouncing to a route that
 * doesn't exist, show a calm prompt — the header's Login button opens the modal.
 */
export function AccountGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();

  if (!ready)
    return (
      <div className="mx-auto max-w-[1180px] px-5 py-16 lg:px-8">
        <div className="shimmer h-10 w-56 rounded-xl" />
        <div className="shimmer mt-6 h-64 rounded-2xl" />
      </div>
    );

  if (!user)
    return (
      <div className="mx-auto max-w-[620px] px-5 py-24 text-center lg:px-8">
        <span className="acc-empty-icon mx-auto" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="8.6" r="3.6" />
            <path d="M4.6 20c1.5-3.8 4.3-5.7 7.4-5.7s5.9 1.9 7.4 5.7" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="mt-4 text-[26px] font-extrabold tracking-tight">
          Sign in to see your account
        </h1>
        <p className="mx-auto mt-2 max-w-sm leading-relaxed text-[var(--color-ink-soft)]">
          Your profile, trips, saved experiences and travel preferences live here. Use{" "}
          <strong>Login</strong> in the header — or the demo traveler account.
        </p>
        <Link href="/experiences" className="btn btn-ghost mt-6">
          Browse experiences instead
        </Link>
      </div>
    );

  return <>{children}</>;
}
