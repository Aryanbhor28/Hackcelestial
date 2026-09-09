"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category, TravelerType } from "@/lib/types";
import { PROVIDERS } from "@/lib/data/providers";
import { classify } from "@/lib/ai/classify";
import { CATEGORY_LABEL, LocalMeter } from "@/components/Bits";
import { fmtTime } from "@/lib/engine/time";

const CATEGORIES: Category[] = [
  "culture",
  "food",
  "workshop",
  "nature",
  "adventure",
  "wellness",
  "shopping",
  "nightlife",
  "event",
];
const TYPES: TravelerType[] = ["solo", "couple", "family", "parents", "friends", "kids"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AddExperiencePage() {
  const [providerId, setProviderId] = useState(PROVIDERS[0].providerId);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("culture");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(400);
  const [durationMin, setDurationMin] = useState(60);
  const [area, setArea] = useState("Old Manali");
  const [capacity, setCapacity] = useState(12);
  const [fromMin, setFromMin] = useState(17 * 60);
  const [toMin, setToMin] = useState(20 * 60);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [suitableFor, setSuitableFor] = useState<TravelerType[]>(["family", "couple"]);
  const [indoor, setIndoor] = useState(true);
  const [wheelchair, setWheelchair] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Live preview of the same classifier the server runs on submit. */
  const preview = useMemo(
    () => classify(`${name}. ${description}`, category),
    [name, description, category]
  );

  const submit = async () => {
    setSaving(true);
    const res = await fetch("/api/experiences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerId,
        name,
        category,
        description,
        price,
        durationMin,
        area,
        capacity,
        fromMin,
        toMin,
        days,
        suitableFor,
        indoor,
        wheelchairAccessible: wheelchair,
      }),
    });
    const data = await res.json();
    setSaved(data.experience?.experienceId ?? null);
    setSaving(false);
  };

  if (saved)
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <div className="card fade-up p-10">
          <span className="text-4xl">✓</span>
          <h1 className="display mt-4 text-2xl font-semibold">Submitted for verification</h1>
          <p className="mt-3 leading-relaxed text-[var(--color-ink-soft)]">
            Your listing is live in the matching engine as a pending-verification provider. We
            will confirm your phone, your location and the experience details before it carries a
            verified badge — small and informal providers are welcome, we just verify differently.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href={`/experience/${saved}`} className="btn btn-brand">
              View the listing
            </Link>
            <Link href={`/provider?p=${providerId}`} className="btn btn-ghost">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <p className="label">Provider onboarding</p>
      <h1 className="display text-3xl font-semibold">List your experience</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-[var(--color-ink-soft)]">
        Nine fields. No website needed, no booking software, no formal business registration
        required — we verify small providers by identity, phone, location and a local reference.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="card space-y-6 p-6">
          <div>
            <label className="label">Provider</label>
            <select
              className="field"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.providerId} value={p.providerId}>
                  {p.name} — {p.owner}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Experience name</label>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Traditional Himachali Puppet Show"
            />
          </div>

          <div>
            <label className="label">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`chip ${category === c ? "chip-on" : ""}`}
                  onClick={() => setCategory(c)}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Describe it in your own words</label>
            <textarea
              className="field min-h-[120px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Our family has performed folk puppet stories in our courtyard for three generations. Guests sit on cushions indoors, we serve chai at the interval…"
            />
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">
              We read this to classify the experience and to score local relevance — you can see
              exactly what it produced on the right.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="label">Price per person (₹)</label>
              <input
                type="number"
                className="field"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input
                type="number"
                className="field"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input
                type="number"
                className="field"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="label">Area</label>
            <input className="field" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>

          <div>
            <label className="label">
              Sessions run between {fmtTime(fromMin)} and {fmtTime(toMin)}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="range"
                min={5 * 60}
                max={23 * 60}
                step={15}
                value={fromMin}
                onChange={(e) => setFromMin(Math.min(Number(e.target.value), toMin))}
              />
              <input
                type="range"
                min={5 * 60}
                max={23 * 60}
                step={15}
                value={toMin}
                onChange={(e) => setToMin(Math.max(Number(e.target.value), fromMin))}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={d}
                  className={`chip ${days.includes(i) ? "chip-on" : ""}`}
                  onClick={() =>
                    setDays((prev) =>
                      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                    )
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Who it suits</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  className={`chip ${suitableFor.includes(t) ? "chip-on" : ""}`}
                  onClick={() =>
                    setSuitableFor((prev) =>
                      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                    )
                  }
                >
                  {t === "parents" ? "older parents" : t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Access</label>
            <div className="flex flex-wrap gap-2">
              <button
                className={`chip ${indoor ? "chip-on" : ""}`}
                onClick={() => setIndoor((v) => !v)}
              >
                Indoors / sheltered
              </button>
              <button
                className={`chip ${wheelchair ? "chip-on" : ""}`}
                onClick={() => setWheelchair((v) => !v)}
              >
                Step-free access
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Accessibility is a hard filter, not a nice-to-have. A traveler who needs step-free
              access is never shown an experience that does not have it.
            </p>
          </div>

          <button
            className="btn btn-brand w-full"
            onClick={submit}
            disabled={!name.trim() || !description.trim() || saving}
          >
            {saving ? "Submitting…" : "Submit for verification"}
          </button>
        </div>

        {/* ------------------------------------------------ live classifier */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h3 className="font-semibold">What we read from your description</h3>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Updates as you type. Nothing here is hidden from you or the traveler.
            </p>

            <div className="mt-4">
              <p className="label mb-1">Local relevance</p>
              <LocalMeter value={preview.localRelevance} />
              <ul className="mt-3 space-y-1.5">
                {preview.breakdown.map((b) => (
                  <li key={b.factor} className="flex justify-between gap-3 text-xs">
                    <span className="text-[var(--color-ink-soft)]">{b.factor}</span>
                    <span
                      className={
                        b.points >= 0 ? "text-[var(--color-pine)]" : "text-[var(--color-brand)]"
                      }
                    >
                      {b.points > 0 ? "+" : ""}
                      {b.points}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rule my-4" />

            <p className="label mb-1">Tags derived</p>
            <div className="flex flex-wrap gap-1.5">
              {preview.tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="label mb-0.5">Effort</p>
                <p className="font-medium">{preview.mobility.replace("_", " ")}</p>
              </div>
              <div>
                <p className="label mb-0.5">Setting</p>
                <p className="font-medium">{preview.indoor ? "Indoor" : "Outdoor"}</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold">Verification, next</h3>
            <ol className="mt-3 space-y-2 text-sm text-[var(--color-ink-soft)]">
              {[
                "We call the number on file",
                "Identity and location confirmed",
                "You confirm the experience details",
                "Permits or safety notes where they apply",
                "Platform approval, then the verified badge",
              ].map((s, i) => (
                <li key={s} className="flex gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-line)] text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
