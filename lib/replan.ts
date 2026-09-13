import type { Booking, TravelerRequest } from "./types";
import { fmtDuration, fmtTime } from "./engine/time";

/* ==========================================================================
   Matched-set context
   --------------------------------------------------------------------------
   When the traveler is looking at a set of engine matches, the situation they
   were matched against is remembered for this tab. A booking made for one of
   those experiences carries that situation with it, so a later provider
   cancellation can be replanned without asking the traveler to start over.
   ========================================================================== */

const MATCH_KEY = "localflow.lastMatch";

export interface MatchContext {
  request: TravelerRequest;
  experienceIds: string[];
  /** present when the set was produced by replanning a cancelled booking */
  replacesBookingId?: string;
}

export function rememberMatch(
  request: TravelerRequest,
  experienceIds: string[],
  replacesBookingId?: string
) {
  try {
    sessionStorage.setItem(
      MATCH_KEY,
      JSON.stringify({ request, experienceIds, replacesBookingId } satisfies MatchContext)
    );
  } catch {
    /* storage unavailable — the booking simply won't carry context */
  }
}

/** The remembered situation, but only if this experience was one of its matches. */
export function recallMatchFor(experienceId: string): MatchContext | null {
  try {
    const raw = sessionStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as MatchContext;
    return Array.isArray(m.experienceIds) && m.experienceIds.includes(experienceId) ? m : null;
  } catch {
    return null;
  }
}

/* ==========================================================================
   Remaining time
   ========================================================================== */

/** Minutes past midnight, in the browser's local time, for an ISO timestamp. */
export function localMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Where "now" is for the purpose of replanning:
 *  - cancellation  the real moment the provider cancelled (default)
 *  - window_start  the start of the traveler's original window
 *  - demo          an explicitly chosen time, labelled as a demo control
 */
export type PlanningFrom = "cancellation" | "window_start" | "demo";

export interface RemainingWindow {
  windowStart: number;
  windowEnd: number;
  /** planning start, clamped inside the original window */
  from: number;
  remaining: number;
  source: PlanningFrom;
  ended: boolean;
  note: string;
}

export function remainingWindow(
  req: TravelerRequest,
  booking: Booking,
  source: PlanningFrom,
  demoFrom: number | null
): RemainingWindow {
  const windowStart = req.startMin;
  const windowEnd = req.startMin + req.availableMin;
  const clamp = (m: number) => Math.min(Math.max(m, windowStart), windowEnd);

  if (source === "demo") {
    const at = demoFrom ?? windowStart;
    const from = clamp(at);
    return {
      windowStart,
      windowEnd,
      from,
      remaining: windowEnd - from,
      source,
      ended: from >= windowEnd,
      note: `Demo control: planning as if it's ${fmtTime(at)}. Your real clock and booking are unchanged.`,
    };
  }

  if (source === "cancellation" && booking.cancelledAt && localDate(booking.cancelledAt) === booking.date) {
    const at = localMinutes(booking.cancelledAt);
    const from = clamp(at);
    const remaining = windowEnd - from;
    const note =
      at < windowStart
        ? `The cancellation came in at ${fmtTime(at)}, before your ${fmtTime(windowStart)}–${fmtTime(
            windowEnd
          )} window began, so the full ${fmtDuration(remaining)} is still yours.`
        : at >= windowEnd
          ? `The cancellation came in at ${fmtTime(at)}, after your window ended at ${fmtTime(windowEnd)}.`
          : `The cancellation came in at ${fmtTime(at)}, ${fmtDuration(
              at - windowStart
            )} into your window, leaving ${fmtDuration(remaining)}.`;
    return { windowStart, windowEnd, from, remaining, source, ended: remaining <= 0, note };
  }

  return {
    windowStart,
    windowEnd,
    from: windowStart,
    remaining: windowEnd - windowStart,
    source: "window_start",
    ended: false,
    note: `Planning from the start of your original window, ${fmtTime(windowStart)}.`,
  };
}

/**
 * The traveler's original situation, re-anchored to what is left of the window.
 * Everything else — location, budget, interests, pace, walking and access
 * needs, experience preference — is carried over untouched.
 */
export function replanRequest(
  req: TravelerRequest,
  booking: Booking,
  win: RemainingWindow
): TravelerRequest {
  return {
    ...req,
    date: booking.date,
    startMin: win.from,
    availableMin: Math.max(0, win.remaining),
    // the party that was actually booked
    groupSize: booking.guests,
    // the cancelled experience no longer occupies any part of the plan
    itinerary: req.itinerary.filter(
      (i) => i.experienceId !== booking.experienceId && !i.itemId.startsWith(booking.experienceId)
    ),
  };
}
