"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AccountGate } from "@/components/account/AccountGate";
import { AccountCard, EmptyState } from "@/components/account/Ui";
import { TripAdaptCard } from "@/components/replan/Adapt";
import { fmtDuration, fmtTime, todayIso } from "@/lib/engine/time";
import type { Booking, Experience } from "@/lib/types";
import { photoFor } from "@/lib/data/media";

const STATUS_CHIP: Record<string, string> = {
  pending: "chip-warn",
  confirmed: "chip-good",
  declined: "chip",
  cancelled: "chip",
};

function TripRow({
  booking,
  exp,
  replacesName,
}: {
  booking: Booking;
  exp?: Experience;
  /** set when this booking replaced one the provider cancelled */
  replacesName?: string;
}) {
  const photo = exp ? photoFor(exp.experienceId, exp.category) : null;
  return (
    <article className="trip">
      <span className="trip-art">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : exp ? (
          <span
            className="trip-art-fallback"
            style={{ backgroundImage: `linear-gradient(140deg, ${exp.art[0]}, ${exp.art[1]})` }}
          >
            {exp.glyph}
          </span>
        ) : null}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="trip-title">{exp?.name ?? "Experience"}</h3>
          <span className={`chip ${STATUS_CHIP[booking.status] ?? "chip"}`}>{booking.status}</span>
        </div>
        <p className="trip-meta">
          {booking.date} · {fmtTime(booking.startMin)}
          {exp && <> · {fmtDuration(exp.durationMin)}</>}
          {exp && <> · {exp.area}</>}
        </p>
        <p className="trip-meta">
          {booking.guests} {booking.guests === 1 ? "guest" : "guests"} · ₹{booking.totalPrice} total
        </p>
        {replacesName && <p className="adapt-replaces">Replaces {replacesName}</p>}
      </div>

      {exp && (
        <Link href={`/experience/${exp.experienceId}`} className="btn btn-ghost btn-sm shrink-0">
          View
        </Link>
      )}
    </article>
  );
}

function TripsInner() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/experiences").then((r) => r.json()),
    ])
      .then(([b, e]: [{ bookings: Booking[] }, { experiences: Experience[] }]) => {
        if (!alive) return;
        // match on account id, falling back to name for bookings made before sign-in
        setBookings(
          b.bookings.filter(
            (x) =>
              x.userId === user.id ||
              x.travelerName.toLowerCase() === user.name.toLowerCase()
          )
        );
        setExperiences(e.experiences);
      })
      .catch(() => alive && setBookings([]));
    return () => {
      alive = false;
    };
  }, [user]);

  const byId = useMemo(
    () => new Map(experiences.map((e) => [e.experienceId, e])),
    [experiences]
  );

  const today = todayIso();
  const all = bookings ?? [];

  // a provider cancelled something still ahead of the traveler: the plan changed
  const changed = all
    .filter((b) => b.status === "cancelled" && b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
  const replacementFor = new Map(
    all.filter((b) => b.replacesBookingId).map((b) => [b.replacesBookingId as string, b])
  );

  const upcoming = all
    .filter((b) => b.date >= today && b.status !== "declined" && b.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
  const past = all
    .filter((b) => !upcoming.includes(b) && !changed.includes(b))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (bookings === null)
    return (
      <div className="acc-single">
        <div className="shimmer h-24 rounded-2xl" />
        <div className="shimmer mt-3 h-24 rounded-2xl" />
      </div>
    );

  return (
    <div className="acc-single">
      <header className="acc-page-head">
        <h1 className="acc-page-title">My Trips</h1>
        <p className="acc-page-sub">
          Everything you&apos;ve booked through LocalFlow, newest first.
        </p>
      </header>

      {changed.length > 0 && (
        <section className="adapt-list" aria-label="Plans that changed">
          {changed.map((b) => {
            const replacement = replacementFor.get(b.bookingId);
            return (
              <TripAdaptCard
                key={b.bookingId}
                booking={b}
                exp={byId.get(b.experienceId)}
                replacement={replacement}
                replacementExp={replacement ? byId.get(replacement.experienceId) : undefined}
              />
            );
          })}
        </section>
      )}

      <AccountCard title={`Upcoming (${upcoming.length})`}>
        {upcoming.length === 0 && changed.length > 0 ? (
          // the changed plan above is the traveler's day — don't claim nothing has started
          <p className="adapt-none">No other upcoming experiences — your changed plan is above.</p>
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3.6" y="5.4" width="16.8" height="14" rx="2.6" />
                <path d="M3.6 10h16.8M8.4 3.4V7M15.6 3.4V7" strokeLinecap="round" />
              </svg>
            }
            title="Your journey hasn't started yet"
            body="Once you book an experience, your trip will appear here with the time, place and who's hosting."
            ctaLabel="Plan my day"
            ctaHref="/discover"
          />
        ) : (
          <div className="acc-trips">
            {upcoming.map((b) => {
              const original = b.replacesBookingId
                ? all.find((x) => x.bookingId === b.replacesBookingId)
                : undefined;
              return (
                <TripRow
                  key={b.bookingId}
                  booking={b}
                  exp={byId.get(b.experienceId)}
                  replacesName={original ? byId.get(original.experienceId)?.name : undefined}
                />
              );
            })}
          </div>
        )}
      </AccountCard>

      {past.length > 0 && (
        <AccountCard title={`Past (${past.length})`}>
          <div className="acc-trips">
            {past.map((b) => (
              <TripRow key={b.bookingId} booking={b} exp={byId.get(b.experienceId)} />
            ))}
          </div>
        </AccountCard>
      )}
    </div>
  );
}

export default function TripsPage() {
  return (
    <div className="acc-page">
      <AccountGate>
        <TripsInner />
      </AccountGate>
    </div>
  );
}
