"use client";

import { useState } from "react";
import Link from "next/link";
import type { Experience } from "@/lib/types";
import { fmtTime, todayIso } from "@/lib/engine/time";

export function BookingBox({
  exp,
  slots,
}: {
  exp: Experience;
  /** startable times today, minutes from midnight */
  slots: number[];
}) {
  const [guests, setGuests] = useState(2);
  const [startMin, setStartMin] = useState(slots[0] ?? 10 * 60);
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [ref, setRef] = useState<string | null>(null);

  const book = async () => {
    setState("sending");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        experienceId: exp.experienceId,
        guests,
        startMin,
        date: todayIso(),
        travelerName: name,
      }),
    });
    if (!res.ok) return setState("error");
    const data = await res.json();
    setRef(data.booking.bookingId);
    setState("sent");
  };

  if (state === "sent")
    return (
      <div className="card fade-up border-[var(--color-pine)]/30 bg-[var(--color-pine-soft)] p-6">
        <p className="display text-xl font-semibold text-[var(--color-pine)]">
          Request sent to {exp.name.split(" ").slice(0, 3).join(" ")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
          {guests} {guests === 1 ? "guest" : "guests"} at {fmtTime(startMin)} today · ₹
          {exp.price * guests} total. The provider sees this on their dashboard now and accepts
          or declines. Reference {ref}.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/provider" className="btn btn-primary btn-sm">
            See it land on the provider dashboard →
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={() => setState("idle")}>
            Book another time
          </button>
        </div>
      </div>
    );

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <span className="display text-2xl font-semibold">
          {exp.price === 0 ? "Free" : `₹${exp.price}`}
        </span>
        <span className="text-sm text-[var(--color-muted)]">per person</span>
      </div>

      <div className="rule my-5" />

      <label className="label">Guests</label>
      <div className="flex items-center gap-3">
        <button
          className="btn btn-ghost btn-sm h-9 w-9 p-0"
          onClick={() => setGuests((g) => Math.max(1, g - 1))}
        >
          −
        </button>
        <span className="w-8 text-center font-semibold">{guests}</span>
        <button
          className="btn btn-ghost btn-sm h-9 w-9 p-0"
          onClick={() => setGuests((g) => Math.min(exp.capacity, g + 1))}
        >
          +
        </button>
        <span className="ml-auto text-xs text-[var(--color-muted)]">
          {exp.capacity} capacity
        </span>
      </div>

      <label className="label mt-5">Start time today</label>
      {slots.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No sessions today — check other dates.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slots.slice(0, 12).map((s) => (
            <button
              key={s}
              className={`chip ${startMin === s ? "chip-on" : ""}`}
              onClick={() => setStartMin(s)}
            >
              {fmtTime(s)}
            </button>
          ))}
        </div>
      )}

      <label className="label mt-5">Your name</label>
      <input
        className="field"
        value={name}
        placeholder="So the provider knows who to expect"
        onChange={(e) => setName(e.target.value)}
      />

      <div className="rule my-5" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-ink-soft)]">
          {guests} × ₹{exp.price}
        </span>
        <span className="display text-lg font-semibold">₹{exp.price * guests}</span>
      </div>

      <button
        className="btn btn-brand mt-4 w-full"
        onClick={book}
        disabled={state === "sending" || slots.length === 0}
      >
        {state === "sending" ? "Sending request…" : "Request this booking"}
      </button>
      {state === "error" && (
        <p className="mt-2 text-xs text-[var(--color-brand)]">
          Could not send that request. Try a smaller group.
        </p>
      )}
      <p className="mt-3 text-center text-[11px] leading-snug text-[var(--color-muted)]">
        No payment taken in this prototype. The provider confirms before anything is owed.
      </p>
    </div>
  );
}
