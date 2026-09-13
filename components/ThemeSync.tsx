"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

/**
 * Applies the signed-in account's appearance settings to <html>.
 *
 * Two attributes drive everything:
 *   data-theme="light|dark"   — token overrides in account.css
 *   data-motion="reduced"     — honoured alongside prefers-reduced-motion
 *
 * A blocking script (THEME_GUARD) sets the same attributes before first paint
 * so there is no flash, and this keeps them in sync when the user changes the
 * setting or signs out.
 */

const KEY = "localflow.appearance";

export interface StoredAppearance {
  theme: "system" | "light" | "dark";
  reducedMotion: boolean;
}

/** Runs before paint. Kept in sync with the component below. */
export const THEME_GUARD = `(function(){try{var a=JSON.parse(localStorage.getItem('${KEY}')||'{}');var t=a.theme||'light';var d=document.documentElement;if(t==='system'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.setAttribute('data-theme',t);if(a.reducedMotion){d.setAttribute('data-motion','reduced')}}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`;

export function applyAppearance(a: StoredAppearance) {
  const el = document.documentElement;
  const resolved =
    a.theme === "system"
      ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : a.theme;
  el.setAttribute("data-theme", resolved);
  if (a.reducedMotion) el.setAttribute("data-motion", "reduced");
  else el.removeAttribute("data-motion");
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

export function ThemeSync() {
  const { user, ready } = useAuth();
  const theme = user?.settings.appearance.theme ?? "light";
  const reduced = user?.settings.appearance.reducedMotion ?? false;

  useEffect(() => {
    if (!ready) return;
    applyAppearance({ theme, reducedMotion: reduced });
  }, [ready, theme, reduced]);

  // follow the OS when the account is set to "system"
  useEffect(() => {
    if (theme !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance({ theme: "system", reducedMotion: reduced });
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, reduced]);

  return null;
}
