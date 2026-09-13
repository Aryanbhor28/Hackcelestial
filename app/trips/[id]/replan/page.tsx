"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Booking, Experience, RecommendationResult, TravelerRequest } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { AccountGate } from "@/components/account/AccountGate";
import { encodeRequest } from "@/lib/clientState";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { photoFor } from "@/lib/data/media";
import { AlternativeRow, ReEvaluating } from "@/components/replan/Parts";
import { weakestLines } from "@/components/results/Parts";
import { dominantBlocker, relaxations } from "@/lib/blockers";
import {
  localMinutes,
  remainingWindow,
  rememberMatch,
  replanRequest,
  type PlanningFrom,
} from "@/lib/replan";
import { AdaptTimeline, PriorityChips, ReplacementCard } from "@/components/replan/Adapt";

const REBUILD_CHECKS = [
  "Checking availability",
  "Checking your remaining time",
  "Checking budget",
  "Checking group fit",
  "Finding nearby alternatives",
];

interface Adjustment {
  headline: string;
  mutate: (r: TravelerRequest) => TravelerRequest;
}

function ReplanFromTrip() {
  const params = useParams<{ id: string }>();
  const bookingId = params?.id;
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [stage, setStage] = useState<"changed" | "working" | "result">("changed");
  const [source, setSource] = useState<PlanningFrom>("cancellation");
  const [demoFrom, setDemoFrom] = useState<number | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | undefined>();

  /* the booking and catalogue, from the same APIs My Trips uses */
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/experiences").then((r) => r.json()),
    ])
      .then(([b, e]: [{ bookings: Booking[] }, { experiences: Experience[] }]) => {
        if (!alive) return;
        const found = b.bookings.find((x) => x.bookingId === bookingId) ?? null;
        setBooking(found);
        setExperiences(e.experiences);
        if (found && !found.cancelledAt) setSource("window_start");
      })
      .catch(() => alive && setBooking(null));
    return () => {
      alive = false;
    };
  }, [bookingId]);

  const exp = useMemo(
    () => experiences.find((e) => e.experienceId === booking?.experienceId),
    [experiences, booking]
  );

  const win = useMemo(
    () => (booking?.request ? remainingWindow(booking.request, booking, source, demoFrom) : null),
    [booking, source, demoFrom]
  );

  /* the preserved situation, re-anchored to the remaining window, plus any
     relaxations the traveler explicitly chose */
  const request = useMemo(() => {
    if (!booking?.request || !win) return null;
    let r = replanRequest(booking.request, booking, win);
    for (const a of adjustments) r = a.mutate(r);
    return r;
  }, [booking, win, adjustments]);

  const run = useCallback(async (r: TravelerRequest) => {
    setStage("working");
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request: r }),
      });
      if (!res.ok) throw new Error(`The matching service returned ${res.status}.`);
      setResult(await res.json());
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't reach the matching service.");
      setStage("changed");
    }
  }, []);

  // once a result is showing, any change to the planning window re-runs the engine
  const requestKey = request ? JSON.stringify(request) : "";
  useEffect(() => {
    if (stage === "result" && request) void run(request);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  // a booking made from these results is recorded as replacing the cancelled one
  useEffect(() => {
    if (result && request && booking)
      rememberMatch(
        request,
        result.recommendations.map((r) => r.experience.experienceId),
        booking.bookingId
      );
  }, [result, request, booking]);

  /* ------------------------------------------------------------- guards */

  if (booking === undefined)
    return (
      <div className="rp-page ad-page">
        <div className="shimmer" style={{ height: 220, borderRadius: 22 }} />
      </div>
    );

  const owned =
    booking &&
    user &&
    (booking.userId === user.id || booking.travelerName.toLowerCase() === user.name.toLowerCase());

  if (!booking || !owned)
    return (
      <div className="rp-page ad-page">
        <section className="rs-empty">
          <p className="rs-empty-title">We couldn&apos;t find that trip</p>
          <p className="rs-empty-body">It may belong to another account, or the link is out of date.</p>
          <div className="rs-empty-actions">
            <Link href="/trips" className="btn btn-brand btn-sm">
              Back to My Trips
            </Link>
          </div>
        </section>
      </div>
    );

  if (booking.status !== "cancelled")
    return (
      <div className="rp-page ad-page">
        <section className="rs-empty">
          <p className="rs-empty-title">This plan hasn&apos;t changed</p>
          <p className="rs-empty-body">
            {exp?.name ?? "This booking"} is still {booking.status}, so there&apos;s nothing to
            replan.
          </p>
          <div className="rs-empty-actions">
            <Link href="/trips" className="btn btn-brand btn-sm">
              Back to My Trips
            </Link>
          </div>
        </section>
      </div>
    );

  if (!booking.request || !win || !request)
    return (
      <div className="rp-page ad-page">
        <section className="rs-empty">
          <p className="rs-empty-title">No saved situation for this booking</p>
          <p className="rs-empty-body">
            It wasn&apos;t made from a LocalFlow match, so there&apos;s nothing to replan from. Tell us
            your situation and we&apos;ll match again.
          </p>
          <div className="rs-empty-actions">
            <Link href="/discover" className="btn btn-brand btn-sm">
              Plan a new match
            </Link>
          </div>
        </section>
      </div>
    );

  /* ------------------------------------------------------------- derived */

  const originalName = exp?.name ?? "Your experience";
  const photo = exp ? photoFor(exp.experienceId, exp.category) : null;
  const cancelledAt = booking.cancelledAt ? localMinutes(booking.cancelledAt) : null;

  // the engine's own verdict on the original experience
  const originalRule =
    result?.rejected.find((r) => r.experience.experienceId === booking.experienceId)?.rule ?? null;
  const originalBack =
    result?.recommendations.some((r) => r.experience.experienceId === booking.experienceId) ?? false;
  const ranked = (result?.recommendations ?? []).filter(
    (r) => r.experience.experienceId !== booking.experienceId
  );
  const replacement = ranked[0] ?? null;
  const alternatives = ranked.slice(1, 4);

  const demoOptions: number[] = [];
  for (let t = win.windowStart; t < win.windowEnd; t += 15) demoOptions.push(t);

  /* -------------------------------------------------------------- render */

  return (
    <div className="rp-page ad-page">
      {/* ------------------------------------------------- what changed */}
      <header className="rp-head">
        <div className="min-w-0">
          <p className="rp-eyebrow">
            <span className="ad-dot" aria-hidden />
            Plan changed
          </p>
          <h1 className="rp-title">Your plan changed.</h1>
          <p className="rp-sub">
            {originalName} is no longer available today — the provider cancelled today&apos;s
            session{cancelledAt !== null ? ` at ${fmtTime(cancelledAt)}` : ""}. LocalFlow still
            knows what you need, so you won&apos;t have to start over.
          </p>
        </div>
        <div className="rp-original">
          <div className="rp-original-media is-gone" aria-hidden>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" />
            ) : exp ? (
              <span
                className="rp-original-fallback"
                style={{ backgroundImage: `linear-gradient(140deg, ${exp.art[0]}, ${exp.art[1]})` }}
              >
                {exp.glyph}
              </span>
            ) : null}
            <span className="rp-original-strike" />
          </div>
          <div className="min-w-0">
            <p className="rp-original-label">Previously planned</p>
            <p className="rp-original-name">{originalName}</p>
            <p className="rp-original-meta">
              {fmtTime(booking.startMin)} · {booking.guests}{" "}
              {booking.guests === 1 ? "guest" : "guests"} · ₹{booking.totalPrice}
            </p>
            <span className="rp-original-flag">Cancelled by provider</span>
          </div>
        </div>
      </header>

      {/* --------------------------------------------- what we preserved */}
      <section className="ad-kept" aria-labelledby="ad-kept-title">
        <h2 className="ad-kept-title" id="ad-kept-title">
          We kept your priorities
        </h2>
        <p className="ad-kept-sub">
          From the situation you booked with — you don&apos;t need to type anything again.
        </p>
        <PriorityChips req={request} omitTime />

        <div className="ad-planning">
          <p className="ad-planning-label">Your remaining window</p>
          <p className="ad-planning-value">
            {win.ended
              ? `Your ${fmtTime(win.windowStart)}–${fmtTime(win.windowEnd)} window has ended`
              : `${fmtDuration(request.availableMin)} · from ${fmtTime(request.startMin)}`}
          </p>
          <div className="ad-seg" role="radiogroup" aria-label="Plan from">
            {booking.cancelledAt && (
              <button
                type="button"
                role="radio"
                aria-checked={source === "cancellation"}
                onClick={() => setSource("cancellation")}
              >
                When it was cancelled · {fmtTime(cancelledAt ?? 0)}
              </button>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={source === "window_start"}
              onClick={() => setSource("window_start")}
            >
              Start of your window · {fmtTime(win.windowStart)}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={source === "demo"}
              onClick={() => {
                setSource("demo");
                setDemoFrom((d) => d ?? win.windowStart);
              }}
            >
              Demo time
            </button>
          </div>
          {source === "demo" && (
            <label className="ad-demo">
              <span>Demo control — plan as if it&apos;s</span>
              <select
                value={demoFrom ?? win.windowStart}
                onChange={(e) => setDemoFrom(Number(e.target.value))}
              >
                {demoOptions.map((t) => (
                  <option key={t} value={t}>
                    {fmtTime(t)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="ad-note">{win.note}</p>
        </div>

        {adjustments.length > 0 && (
          <p className="ad-adjusted">
            You chose to relax: {adjustments.map((a) => a.headline).join(" ")}{" "}
            <button type="button" onClick={() => setAdjustments([])}>
              Undo
            </button>
          </p>
        )}

        {stage === "changed" && (
          <div className="ad-cta">
            <button
              className="btn btn-brand"
              onClick={() => void run(request)}
              disabled={win.ended}
            >
              Find another match →
            </button>
            <Link href="/trips" className="btn btn-ghost">
              Back to My Trips
            </Link>
          </div>
        )}
        {win.ended && (
          <p className="ad-ended">
            Your original window has already passed. Choose &ldquo;Start of your window&rdquo; to
            replan it as planned, or plan a new day.
          </p>
        )}
      </section>

      {error && (
        <div className="rs-error">
          <p className="rs-error-title">We couldn&apos;t rebuild your plan</p>
          <p className="rs-error-body">{error}</p>
          <button className="btn btn-brand btn-sm mt-4" onClick={() => void run(request)}>
            Try again
          </button>
        </div>
      )}

      {/* ----------------------------------------------- rebuilding */}
      {stage !== "changed" && (
        <ReEvaluating
          done={stage === "result"}
          title="Rebuilding your plan"
          doneTitle="Plan rebuilt"
          lede="Your original preferences are still in place."
          items={REBUILD_CHECKS}
          foot="Finding the best feasible alternative…"
          doneFoot={
            result
              ? `Re-ran matching across ${result.consideredCount} experiences for your remaining ${fmtDuration(
                  request.availableMin
                )}.`
              : undefined
          }
        />
      )}

      {/* -------------------------------------------------- the result */}
      {stage === "result" && result && (
        <>
          {replacement ? (
            <>
              <div className="ad-success fade-up">
                <p className="ad-success-eyebrow">LocalFlow adapted your plan</p>
                <h2 className="ad-success-title">Your day still works.</h2>
                <p className="ad-success-sub">
                  {originalName} is unavailable, but {replacement.experience.name} still fits your
                  remaining {fmtDuration(request.availableMin)}, budget and preferences.
                </p>
              </div>

              {originalBack && (
                <p className="ad-restored">
                  The provider has since restored {originalName}, so it appears in the matches again.
                </p>
              )}

              <AdaptTimeline
                originalName={originalName}
                originalStart={booking.startMin}
                cancelledAtIso={booking.cancelledAt}
                engineRule={originalRule}
                replacementName={replacement.experience.name}
                replacementStart={replacement.feasibility.earliestStartMin}
              />

              <ReplacementCard rec={replacement} remainingMin={request.availableMin} />

              {alternatives.length > 0 && (
                <section>
                  <div className="ad-alts-head">
                    <h3 className="rp-section-title">Other experiences that still fit</h3>
                    <Link
                      href={`/results?q=${encodeRequest(request)}&replaces=${booking.bookingId}`}
                      className="rs-ghost-link"
                    >
                      See all matches →
                    </Link>
                  </div>
                  <div className="rp-alts">
                    {alternatives.map((a) => (
                      <AlternativeRow
                        key={a.experience.experienceId}
                        rec={a}
                        availableMin={request.availableMin}
                        onHover={setHover}
                        active={hover === a.experience.experienceId}
                      />
                    ))}
                  </div>
                  <details className="rp-whynot">
                    <summary>Why these ranked lower</summary>
                    <ul>
                      {alternatives.map((a) => (
                        <li key={a.experience.experienceId}>
                          <span className="rp-whynot-name">
                            {a.experience.name} — {a.matchScore}%
                          </span>
                          <ul>
                            {weakestLines(a, 2).map((l) => (
                              <li key={l.key}>
                                <strong>{l.label}:</strong> {l.detail}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </details>
                </section>
              )}
            </>
          ) : (
            (() => {
              const { text: blocker, bucket } = dominantBlocker(result, request, { remaining: true });
              const actions = relaxations(request, bucket).filter((a) => a.key !== "reset");
              return (
                <section className="rs-empty fade-up">
                  <p className="rs-empty-title">
                    We couldn&apos;t find another experience that fits everything.
                  </p>
                  <p className="rs-empty-body">
                    Your priorities are unchanged — nothing else available today clears all of them in
                    the {fmtDuration(request.availableMin)} you have left.
                  </p>
                  {blocker && (
                    <p className="rs-empty-blocker">
                      <strong>What&apos;s in the way</strong>
                      {blocker}
                      <span className="rs-empty-footnote">
                        Each experience is counted against the first constraint it failed.
                      </span>
                    </p>
                  )}
                  <div className="rs-empty-actions">
                    {actions.map((a, i) => (
                      <button
                        key={a.key}
                        className={`btn btn-sm ${i === 0 ? "btn-brand" : "btn-ghost"}`}
                        onClick={() =>
                          setAdjustments((prev) => [...prev, { headline: a.headline, mutate: a.mutate }])
                        }
                      >
                        {a.label}
                      </button>
                    ))}
                    <Link href="/discover" className="btn btn-ghost btn-sm">
                      Plan a new day
                    </Link>
                  </div>
                </section>
              );
            })()
          )}
        </>
      )}
    </div>
  );
}

export default function ReplanFromTripPage() {
  return (
    <AccountGate>
      <ReplanFromTrip />
    </AccountGate>
  );
}
