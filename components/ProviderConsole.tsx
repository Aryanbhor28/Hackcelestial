"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import type { Booking, BookingStatus, Experience } from "@/lib/types";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { Art, LocalMeter } from "./Bits";

const noopSubscribe = () => () => {};

/**
 * Server and hydration render a timezone-independent UTC stamp so the HTML
 * matches; after hydration the browser switches to its local format.
 */
function CreatedAt({ iso }: { iso: string }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return <>{hydrated ? new Date(iso).toLocaleString() : `${iso.slice(0, 16).replace("T", " ")} UTC`}</>;
}

const STATUS_CHIP: Record<BookingStatus, string> = {
  pending: "chip-warn",
  confirmed: "chip-good",
  declined: "chip",
  cancelled: "chip",
};

export function BookingList({
  bookings,
  experiences,
}: {
  bookings: Booking[];
  experiences: Experience[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const nameOf = (id: string) =>
    experiences.find((e) => e.experienceId === id)?.name ?? "Experience";

  const setStatus = async (id: string, status: BookingStatus) => {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    start(() => router.refresh());
  };

  if (bookings.length === 0)
    return (
      <div className="card p-8 text-center">
        <p className="font-medium">No booking requests yet</p>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Requests from matched travelers land here.
        </p>
      </div>
    );

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div
          key={b.bookingId}
          className={`card p-4 ${b.status === "pending" ? "border-[var(--color-brand)]/40" : ""}`}
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{nameOf(b.experienceId)}</span>
                <span className={`chip ${STATUS_CHIP[b.status]}`}>{b.status}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                {b.travelerName} · {b.guests} {b.guests === 1 ? "guest" : "guests"} ·{" "}
                {fmtTime(b.startMin)} on {b.date}
              </p>
            </div>
            <div className="text-right">
              <p className="display text-lg font-semibold">₹{b.totalPrice}</p>
              <p className="text-[11px] text-[var(--color-muted)]">
                <CreatedAt iso={b.createdAt} />
              </p>
            </div>
          </div>

          {b.status === "pending" && (
            <div className="mt-3 flex gap-2 border-t border-[var(--color-line)] pt-3">
              <button
                className="btn btn-primary btn-sm"
                disabled={pending}
                onClick={() => void setStatus(b.bookingId, "confirmed")}
              >
                Accept
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={pending}
                onClick={() => void setStatus(b.bookingId, "declined")}
              >
                Decline
              </button>
              <span className="ml-auto self-center text-[11px] text-[var(--color-muted)]">
                Traveler is notified in-app. SMS and WhatsApp are the next integration.
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ExperienceManager({
  experiences,
  cancelledToday,
}: {
  experiences: Experience[];
  cancelledToday: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const toggleToday = async (id: string, cancelled: boolean) => {
    setBusy(id);
    await fetch("/api/disrupt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ experienceId: id, action: cancelled ? "restore" : "cancel" }),
    });
    router.refresh();
    setBusy(null);
  };

  const toggleActive = async (e: Experience) => {
    setBusy(e.experienceId);
    await fetch("/api/experiences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ experienceId: e.experienceId, active: !e.active }),
    });
    router.refresh();
    setBusy(null);
  };

  return (
    <div className="space-y-3">
      {experiences.map((e) => {
        const off = cancelledToday.includes(e.experienceId);
        return (
          <div key={e.experienceId} className="card flex flex-wrap gap-4 p-4">
            <Art exp={e} className="h-20 w-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/experience/${e.experienceId}`} className="font-semibold hover:underline">
                  {e.name}
                </Link>
                {!e.active && <span className="chip">Paused</span>}
                {off && <span className="chip chip-warn">Cancelled today</span>}
                {e.verification === "pending" && (
                  <span className="chip chip-warn">Verification in progress</span>
                )}
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                ₹{e.price} · {fmtDuration(e.durationMin)} · up to {e.capacity} · {e.area}
              </p>
              <div className="mt-2">
                <LocalMeter value={e.localRelevance} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className={`btn btn-sm ${off ? "btn-primary" : "btn-ghost"}`}
                disabled={busy === e.experienceId}
                onClick={() => void toggleToday(e.experienceId, off)}
              >
                {off ? "Restore today" : "Cancel today"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={busy === e.experienceId}
                onClick={() => void toggleActive(e)}
              >
                {e.active ? "Pause listing" : "Reactivate"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
