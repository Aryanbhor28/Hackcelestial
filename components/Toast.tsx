"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * The one feedback channel for the app. Deliberately tiny — no dependency, no
 * competing notification system.
 */

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastValue {
  toast: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Tone = "success") => {
    const id = ++seq;
    setItems((t) => [...t, { id, tone, message }]);
    window.setTimeout(() => {
      setItems((t) => t.filter((x) => x.id !== id));
    }, 3400);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast is-${t.tone}`}>
            <span className="toast-icon" aria-hidden>
              {t.tone === "error" ? (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 6v5M10 14h.01" strokeLinecap="round" />
                  <circle cx="10" cy="10" r="7.5" strokeWidth="1.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M4.5 10.4 8.3 14l7.2-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  // a missing provider should never break a page — fall back to a no-op
  return ctx ?? { toast: () => {} };
}
