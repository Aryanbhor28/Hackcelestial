"use client";

import Link from "next/link";
import type { Booking, Experience, Recommendation, TravelerRequest } from "@/lib/types";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { photoFor } from "@/lib/data/media";
import { localMinutes } from "@/lib/replan";
import { CATEGORY_LABEL } from "@/components/Bits";
import { SaveButton } from "@/components/SaveButton";
import {
  FeasibilityBreakdown,
  LocalRelevance,
  MatchFactors,
  ScoreRing,
  TrustPanel,
} from "@/components/results/Parts";

/* ============================================================ priorities */

/** The traveler's preserved priorities, read straight from the request. */
export function PriorityChips({ req, omitTime = false }: { req: TravelerRequest; omitTime?: boolean }) {
  const chips: { icon: string; text: string }[] = [
    { icon: "📍", text: req.location },
    {
      icon: "👥",
      text: `${
        req.travelerType === "parents"
          ? "With parents"
          : req.travelerType.charAt(0).toUpperCase() + req.travelerType.slice(1)
      } · ${req.groupSize}`,
    },
  ];
  if (!omitTime)
    chips.push({ icon: "⏱", text: `${fmtDuration(req.availableMin)} from ${fmtTime(req.startMin)}` });
  chips.push({ icon: "₹", text: `${req.budgetPerPerson} / person` });
  if (req.interests.length)
    chips.push({ icon: "✦", text: req.interests.map((i) => CATEGORY_LABEL[i]).join(", ") });
  chips.push({
    icon: "◌",
    text: req.pace === "relaxing" ? "Relaxed" : req.pace === "energetic" ? "Energetic" : "Balanced",
  });
  chips.push({
    icon: "🚶",
    text:
      req.mobility === "low_walking"
        ? "Very little walking"
        : req.mobility === "wheelchair"
          ? "Step-free access"
          : req.mobility === "high"
            ? "Happy to be active"
            : "Some walking is fine",
  });
  if (req.preference === "local_only") chips.push({ icon: "◆", text: "Local only" });
  if (req.preference === "popular") chips.push({ icon: "◆", text: "Popular attractions" });

  return (
    <ul className="ad-chips" aria-label="Your priorities">
      {chips.map((c) => (
        <li key={c.text} className="ad-chip">
          <span className="ad-chip-icon" aria-hidden>
            {c.icon}
          </span>
          {c.text}
        </li>
      ))}
    </ul>
  );
}

/* ====================================================== my trips card */

const STATUS_CHIP: Record<string, string> = {
  pending: "chip-warn",
  confirmed: "chip-good",
  declined: "chip",
  cancelled: "chip",
};

/**
 * A cancelled booking on My Trips. Reads as a plan that changed, not a failure,
 * and turns into "plan adapted" once a replacement has been requested.
 */
export function TripAdaptCard({
  booking,
  exp,
  replacement,
  replacementExp,
}: {
  booking: Booking;
  exp?: Experience;
  replacement?: Booking;
  replacementExp?: Experience;
}) {
  const photo = exp ? photoFor(exp.experienceId, exp.category) : null;
  const cancelledAt = booking.cancelledAt ? fmtTime(localMinutes(booking.cancelledAt)) : null;

  if (replacement)
    return (
      <article className="adapt-card is-resolved">
        <div className="min-w-0 flex-1">
          <p className="adapt-eyebrow is-done">Plan adapted</p>
          <p className="adapt-line">
            <s>{exp?.name ?? "Original experience"}</s>
            <span className="chip">cancelled</span>
          </p>
          <p className="adapt-line">
            <span aria-hidden>→</span>
            <span className="sr-only">Replaced by</span>
            <strong>{replacementExp?.name ?? "Replacement"}</strong>
            <span className={`chip ${STATUS_CHIP[replacement.status] ?? "chip"}`}>
              {replacement.status}
            </span>
            <span className="adapt-meta">
              {fmtTime(replacement.startMin)} · {replacement.guests}{" "}
              {replacement.guests === 1 ? "guest" : "guests"}
            </span>
          </p>
        </div>
        <Link
          href={`/experience/${replacement.experienceId}`}
          className="btn btn-ghost btn-sm shrink-0"
        >
          View
        </Link>
      </article>
    );

  return (
    <article className="adapt-card">
      <div className="adapt-top">
        <span className="adapt-thumb" aria-hidden>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" />
          ) : exp ? (
            <span
              className="adapt-thumb-fallback"
              style={{ backgroundImage: `linear-gradient(140deg, ${exp.art[0]}, ${exp.art[1]})` }}
            >
              {exp.glyph}
            </span>
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="adapt-eyebrow">
            <span className="adapt-dot" aria-hidden />
            Your plan changed
          </p>
          <h3 className="adapt-title">
            {exp?.name ?? "Your experience"} is no longer available today.
          </h3>
          <p className="adapt-meta">
            Booked for {booking.date} · {fmtTime(booking.startMin)} · {booking.guests}{" "}
            {booking.guests === 1 ? "guest" : "guests"} · ₹{booking.totalPrice} total
          </p>
          <p className="adapt-reason">
            The provider cancelled today&apos;s session{cancelledAt ? ` at ${cancelledAt}` : ""}.
            <span className="chip">cancelled</span>
          </p>
        </div>
      </div>

      {booking.request ? (
        <>
          <p className="adapt-kept-label">We kept your priorities</p>
          <PriorityChips req={{ ...booking.request, groupSize: booking.guests }} />
          <div className="adapt-actions">
            <Link href={`/trips/${booking.bookingId}/replan`} className="btn btn-brand btn-sm">
              Find another match →
            </Link>
            {exp && (
              <Link href={`/experience/${exp.experienceId}`} className="rs-ghost-link">
                View original
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="adapt-nocontext">
            This booking wasn&apos;t made from a LocalFlow match, so there&apos;s no saved situation to
            replan from.
          </p>
          <div className="adapt-actions">
            <Link href="/discover" className="btn btn-brand btn-sm">
              Plan a new match
            </Link>
          </div>
        </>
      )}
    </article>
  );
}

/* ============================================================ timeline */

export function AdaptTimeline({
  originalName,
  originalStart,
  cancelledAtIso,
  engineRule,
  replacementName,
  replacementStart,
}: {
  originalName: string;
  originalStart: number;
  cancelledAtIso?: string;
  engineRule: string | null;
  replacementName: string | null;
  replacementStart: number | null;
}) {
  const cancelledAt = cancelledAtIso ? fmtTime(localMinutes(cancelledAtIso)) : null;
  return (
    <ol className="ad-timeline" aria-label="How your plan changed">
      <li className="is-original">
        <span className="ad-tl-marker" aria-hidden>
          ✓
        </span>
        <span className="ad-tl-label">Your original plan</span>
        <span className="ad-tl-name">{originalName}</span>
        <span className="ad-tl-meta">{fmtTime(originalStart)}</span>
      </li>
      <li className="is-change">
        <span className="ad-tl-marker" aria-hidden>
          !
        </span>
        <span className="ad-tl-label">No longer available</span>
        <span className="ad-tl-name">Provider cancelled today&apos;s session</span>
        <span className="ad-tl-meta">
          {cancelledAt ? `at ${cancelledAt}` : "today"}
          {engineRule ? ` · engine rule “${engineRule}”` : ""}
        </span>
      </li>
      <li className={replacementName ? "is-new" : ""}>
        <span className="ad-tl-marker" aria-hidden>
          ○
        </span>
        <span className="ad-tl-label">Your new plan</span>
        <span className="ad-tl-name">{replacementName ?? "Not chosen yet"}</span>
        <span className="ad-tl-meta">
          {replacementStart !== null ? `next session ${fmtTime(replacementStart)}` : "—"}
        </span>
      </li>
    </ol>
  );
}

/* ==================================================== replacement card */

/**
 * The engine's best remaining match. Built from the same explainability pieces
 * as the match screen; the choose action is placed right after the reasons so
 * it stays within reach on a phone.
 */
export function ReplacementCard({ rec, remainingMin }: { rec: Recommendation; remainingMin: number }) {
  const e = rec.experience;
  const f = rec.feasibility;
  const photo = photoFor(e.experienceId, e.category);

  return (
    <section className="rs-best ad-card fade-up" aria-labelledby="ad-new-title">
      <div className="rs-best-media">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <span
            className="rs-best-fallback"
            style={{ backgroundImage: `linear-gradient(140deg, ${e.art[0]}, ${e.art[1]})` }}
          >
            {e.glyph}
          </span>
        )}
        <span className="rs-best-scrim" aria-hidden />
        <span className="rs-best-badge ad-badge">New match</span>
        <span className="rs-best-save">
          <SaveButton experienceId={e.experienceId} onDark />
        </span>
        <div className="rs-best-overlay">
          <p className="rs-best-cat">
            {CATEGORY_LABEL[e.category]} · {e.area} · {f.distanceKm} km
          </p>
          <h2 className="rs-best-title" id="ad-new-title">
            <Link href={`/experience/${e.experienceId}`}>{e.name}</Link>
          </h2>
          <p className="rs-best-host">Hosted by {rec.provider.name}</p>
        </div>
      </div>

      <div className="rs-best-body">
        <div className="rs-best-headline">
          <ScoreRing score={rec.matchScore} size={88} />
          <div className="rs-best-facts">
            <div>
              <span className="rs-fact-value">{e.price === 0 ? "Free" : `₹${e.price}`}</span>
              <span className="rs-fact-label">per person</span>
            </div>
            <div>
              <span className="rs-fact-value">{fmtDuration(e.durationMin)}</span>
              <span className="rs-fact-label">experience</span>
            </div>
            <div>
              <span className="rs-fact-value">{f.distanceKm} km</span>
              <span className="rs-fact-label">away</span>
            </div>
            <div>
              <span className="rs-fact-value is-time">{fmtTime(f.earliestStartMin ?? 0)}</span>
              <span className="rs-fact-label">next session</span>
            </div>
          </div>
        </div>

        <div className="rs-best-section">
          <h3 className="rs-best-h">Why this fits</h3>
          <ul className="rs-reasons-list">
            {rec.reasons.map((r, i) => (
              <li key={r} style={{ animationDelay: `${i * 60}ms` }}>
                <span className="rs-tick" aria-hidden>
                  ✓
                </span>
                {r}
              </li>
            ))}
            {rec.warnings.map((w, i) => (
              <li key={w} className="is-warn" style={{ animationDelay: `${(rec.reasons.length + i) * 60}ms` }}>
                <span className="rs-tick" aria-hidden>
                  !
                </span>
                <span>
                  <span className="sr-only">Note: </span>
                  {w}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rs-best-actions">
          <Link href={`/experience/${e.experienceId}#book`} className="btn btn-brand">
            Choose this experience
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href={`/experience/${e.experienceId}`} className="btn btn-ghost">
            View experience
          </Link>
        </div>

        <div className="rs-best-section">
          <h3 className="rs-best-h">Fits your remaining window</h3>
          <FeasibilityBreakdown rec={rec} availableMin={remainingMin} />
        </div>

        <div className="rs-best-section">
          <h3 className="rs-best-h">Match factors</h3>
          <MatchFactors rec={rec} />
        </div>

        <div className="rs-best-meta">
          <LocalRelevance rec={rec} />
          <TrustPanel rec={rec} />
        </div>
      </div>
    </section>
  );
}
