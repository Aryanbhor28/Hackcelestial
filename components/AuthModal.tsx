"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_LOGINS, homeFor, useAuth, type Role } from "@/lib/auth";
import { LogoMark } from "./Logo";

export type AuthMode = "login" | "signup";

const ROLES: { value: Role; title: string; blurb: string; icon: React.ReactNode }[] = [
  {
    value: "traveler",
    title: "Traveler",
    blurb: "Discover experiences that fit your trip.",
    icon: (
      <>
        <path d="M12 21s7-5.9 7-10.6A7 7 0 1 0 5 10.4C5 15.1 12 21 12 21z" />
        <circle cx="12" cy="10.2" r="2.6" />
      </>
    ),
  },
  {
    value: "provider",
    title: "Experience Provider",
    blurb: "Share your experience with the right travelers.",
    icon: (
      <>
        <path d="M4 10.5 12 4l8 6.5" strokeLinejoin="round" />
        <path d="M6 9.8V20h12V9.8" strokeLinejoin="round" />
        <path d="M10 20v-5.2h4V20" strokeLinejoin="round" />
      </>
    ),
  },
];

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 22 22" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M1.8 11S5 4.8 11 4.8 20.2 11 20.2 11 17 17.2 11 17.2 1.8 11 1.8 11z" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="3" />
      {off && <path d="M3.5 3.5 18.5 18.5" strokeLinecap="round" />}
    </svg>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="auth-label">{label}</span>
      {children}
      {error && <span className="auth-error">{error}</span>}
    </label>
  );
}

export function AuthModal({
  open,
  mode,
  onMode,
  onClose,
}: {
  open: boolean;
  mode: AuthMode;
  onMode: (m: AuthMode) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const { login, signup } = useAuth();
  const uid = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const lastFocused = useRef<Element | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("traveler");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);

  const reset = useCallback(() => {
    setErrors({});
    setFormError(null);
    setBusy(false);
  }, []);

  /** Animate out, then tell the parent to unmount. */
  const dismiss = useCallback(() => {
    if (busy) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 170);
  }, [busy, onClose]);

  // escape to close, and keep focus inside the dialog
  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement;
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 90);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const nodes = cardRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      (lastFocused.current as HTMLElement | null)?.focus?.();
    };
  }, [open, dismiss]);

  useEffect(() => {
    reset();
  }, [mode, reset]);

  if (!open) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "signup" && name.trim().length < 2) e.name = "Tell us what to call you.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "That doesn't look like an email address.";
    if (password.length < 6) e.password = "Use at least 6 characters.";
    if (mode === "signup" && confirm !== password) e.confirm = "Passwords don't match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const user =
        mode === "login"
          ? await login(email, password)
          : await signup({ name, email, password, role });
      setClosing(true);
      window.setTimeout(() => {
        setClosing(false);
        onClose();
        router.push(homeFor(user.role));
      }, 160);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const useDemo = (which: Role) => {
    const d = DEMO_LOGINS.find((x) => x.role === which);
    if (!d) return;
    setEmail(d.email);
    setPassword(d.password);
    setErrors({});
    setFormError(null);
  };

  const isLogin = mode === "login";

  return (
    <div
      className={`auth-overlay ${closing ? "is-closing" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        className={`auth-card ${closing ? "is-closing" : ""}`}
      >
        <button className="auth-close" onClick={dismiss} aria-label="Close" type="button">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
          </svg>
        </button>

        <div className="auth-head">
          <span className="auth-brand">
            <LogoMark className="h-8 w-8" dark />
            <span className="auth-brand-name">
              Local<span className="text-[var(--color-amber)]">Flow</span>
            </span>
          </span>
          <h2 id={`${uid}-title`} className="auth-title">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="auth-sub">
            {isLogin
              ? "Pick up your trip where you left off."
              : "Right experience. Right traveler. Right time."}
          </p>
        </div>

        <div className="auth-body">
          {/* mode switch */}
          <div className="auth-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={`auth-switch-btn ${isLogin ? "is-on" : ""}`}
              onClick={() => onMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={`auth-switch-btn ${!isLogin ? "is-on" : ""}`}
              onClick={() => onMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            {!isLogin && (
              <Field label="Name" error={errors.name}>
                <input
                  ref={isLogin ? undefined : firstFieldRef}
                  className={`auth-input ${errors.name ? "has-error" : ""}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ananya Rao"
                  autoComplete="name"
                />
              </Field>
            )}

            <Field label="Email" error={errors.email}>
              <input
                ref={isLogin ? firstFieldRef : undefined}
                className={`auth-input ${errors.email ? "has-error" : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </Field>

            <Field label="Password" error={errors.password}>
              <span className="auth-input-wrap">
                <input
                  className={`auth-input has-affix ${errors.password ? "has-error" : ""}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Your password" : "At least 6 characters"}
                  type={showPw ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="auth-affix"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <EyeIcon off={showPw} />
                </button>
              </span>
            </Field>

            {!isLogin && (
              <Field label="Confirm password" error={errors.confirm}>
                <input
                  className={`auth-input ${errors.confirm ? "has-error" : ""}`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type it once more"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                />
              </Field>
            )}

            {!isLogin && (
              <div>
                <span className="auth-label">I&apos;m joining as</span>
                <div className="auth-roles">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`auth-role ${role === r.value ? "is-on" : ""}`}
                      onClick={() => setRole(r.value)}
                      aria-pressed={role === r.value}
                    >
                      <span className="auth-role-icon">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                          {r.icon}
                        </svg>
                      </span>
                      <span className="auth-role-title">{r.title}</span>
                      <span className="auth-role-blurb">{r.blurb}</span>
                      <span className="auth-role-tick" aria-hidden>
                        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="M3.5 8.4 6.5 11.3 12.5 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className="auth-check-box" aria-hidden>
                    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.6">
                      <path d="M3.5 8.4 6.5 11.3 12.5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  Remember me
                </label>
                <button
                  type="button"
                  className="auth-link"
                  onClick={() =>
                    setFormError(
                      "Password recovery isn't wired up in this prototype — use a demo login below."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}

            {formError && (
              <p className="auth-form-error" role="alert">
                {formError}
              </p>
            )}

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? (
                <>
                  <span className="auth-spinner" aria-hidden />
                  {isLogin ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                <>
                  {isLogin ? "Login" : "Create Account"}
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>

            <div className="auth-or">
              <span>or</span>
            </div>

            <button type="button" className="auth-social" disabled title="Not available in this prototype">
              <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden>
                <path fill="#4285F4" d="M19.6 10.2c0-.7-.1-1.4-.2-2H10v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z" />
                <path fill="#34A853" d="M10 20c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H1.1v2.6A10 10 0 0 0 10 20z" />
                <path fill="#FBBC05" d="M4.4 12c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V5.4H1.1a10 10 0 0 0 0 9.2L4.4 12z" />
                <path fill="#EA4335" d="M10 4c1.5 0 2.8.5 3.8 1.5l2.8-2.8C14.9 1 12.7 0 10 0A10 10 0 0 0 1.1 5.4L4.4 8C5.2 5.6 7.4 4 10 4z" />
              </svg>
              Continue with Google
              <span className="auth-soon">Soon</span>
            </button>

            <p className="auth-foot">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                className="auth-link is-strong"
                onClick={() => onMode(isLogin ? "signup" : "login")}
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </p>

            {isLogin && (
              <div className="auth-demo">
                <span>Demo logins</span>
                <button type="button" onClick={() => useDemo("traveler")}>
                  Traveler
                </button>
                <button type="button" onClick={() => useDemo("provider")}>
                  Provider
                </button>
              </div>
            )}

            <p className="auth-note">
              Demo authentication — accounts stay in this browser and no real credentials
              should be used.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
