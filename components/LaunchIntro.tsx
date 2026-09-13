"use client";

import { useEffect, useState } from "react";

/**
 * First-visit brand intro.
 *
 * The sequence is the product in miniature: a traveler point, a context point,
 * a matching point, an experience point — joined by a drawn route with a pin
 * travelling along it, resolving into the wordmark.
 *
 * It never blocks the app: the real page is rendered underneath the whole time
 * and this is only an overlay that fades out. It runs once per browser session
 * (sessionStorage).
 *
 * Nothing is rendered on the server — the overlay only appears once the client
 * has decided it should — so a repeat visit can never flash it. Reduced-motion
 * users get a near-instant fade instead of the animation.
 */

const SESSION_KEY = "localflow.intro.seen";
const TOTAL_MS = 2000;

const STOPS = [
  { x: 78, cy: 150, label: "Traveler" },
  { x: 250, cy: 96, label: "Context" },
  { x: 430, cy: 168, label: "AI match" },
  { x: 610, cy: 92, label: "Experience" },
];

/**
 * Module scope on purpose: React's dev StrictMode invokes effects twice. If the
 * decision lived only in the effect, the second pass would read the session key
 * the first pass just wrote and skip the intro entirely. This survives that,
 * and the timers are deliberately not cleared on cleanup so the simulated
 * unmount does not abort the sequence.
 */
let scheduled = false;

export function LaunchIntro() {
  const [state, setState] = useState<"idle" | "running" | "leaving" | "done">("idle");

  useEffect(() => {
    if (scheduled) return;
    scheduled = true;

    let seen = false;
    try {
      seen = Boolean(sessionStorage.getItem(SESSION_KEY));
    } catch {
      seen = true; // storage blocked — don't risk replaying it every navigation
    }

    if (seen) {
      setState("done");
      return;
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }

    setState("running");
    const hold = reduced ? 260 : TOTAL_MS;
    window.setTimeout(() => setState("leaving"), hold);
    window.setTimeout(() => setState("done"), hold + 420);
  }, []);

  // "idle" is the server/first-paint state: render nothing at all, so a repeat
  // visit never flashes the overlay and the page is visible immediately.
  if (state === "idle" || state === "done") return null;

  return (
    <div
      className={`intro ${state === "running" ? "is-running" : ""} ${
        state === "leaving" ? "is-leaving" : ""
      }`}
      aria-hidden
      // the page beneath is the real content; this is decoration only
      role="presentation"
    >
      <div className="intro-glow" />

      <div className="intro-stage">
        <svg viewBox="0 0 688 240" className="intro-svg">
          <defs>
            <linearGradient id="introRoute" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f6b269" stopOpacity="0.25" />
              <stop offset="55%" stopColor="#f0913f" />
              <stop offset="100%" stopColor="#f6b269" />
            </linearGradient>
          </defs>

          {/* the journey */}
          <path
            className="intro-route"
            d="M78 150 C 150 150, 180 96, 250 96 S 360 168, 430 168 S 540 92, 610 92"
            fill="none"
            stroke="url(#introRoute)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {STOPS.map((s, i) => (
            <g key={s.label} className="intro-stop" style={{ animationDelay: `${360 + i * 200}ms` }}>
              <circle cx={s.x} cy={s.cy} r="5.5" fill="#0b2422" stroke="#f0913f" strokeWidth="2" />
              <text x={s.x} y={s.cy - 18} textAnchor="middle" className="intro-stop-label">
                {s.label}
              </text>
            </g>
          ))}

          {/* pin riding the route */}
          <g className="intro-pin">
            <animateMotion
              dur="1.25s"
              begin="0.32s"
              fill="freeze"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.4 0 0.2 1"
              path="M78 150 C 150 150, 180 96, 250 96 S 360 168, 430 168 S 540 92, 610 92"
            />
            <path
              d="M0 -22c-5.4 0-9.8 4.4-9.8 9.8 0 7 8.7 18.2 9.1 18.7a.9.9 0 0 0 1.4 0c.4-.5 9.1-11.7 9.1-18.7 0-5.4-4.4-9.8-9.8-9.8z"
              fill="#f0913f"
            />
            <circle cx="0" cy="-12.4" r="3.6" fill="#0b2422" />
          </g>
        </svg>

        <div className="intro-word">
          <span className="intro-word-text">
            Local<span className="text-[var(--color-amber)]">Flow</span>
          </span>
          <span className="intro-tagline">Right Experience. Right Traveler. Right Time.</span>
        </div>
      </div>
    </div>
  );
}
