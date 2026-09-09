"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Category,
  ExperiencePreference,
  Mobility,
  Pace,
  TravelerRequest,
  TravelerType,
} from "@/lib/types";
import type { Extraction } from "@/lib/ai/intent";
import { encodeRequest } from "@/lib/clientState";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { CATEGORY_LABEL } from "@/components/Bits";

const EXAMPLES = [
  "I'm in Manali with my parents. We have 2 hours before dinner, budget ₹800 each. Something cultural and relaxing, and not much walking.",
  "Solo, three hours free this afternoon, ₹1500. I want something hands-on and genuinely local — no tourist traps.",
  "Four friends, whole day tomorrow, ₹3000 each. We want adventure and a proper thrill.",
  "Family with two kids, 4 hours, ₹600 each. Food and something the children can actually do.",
];

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

const PREFS: { v: ExperiencePreference; l: string; d: string }[] = [
  { v: "local_only", l: "Local only", d: "Only experiences scoring 75+ on local relevance" },
  { v: "prefer_local", l: "Prefer local", d: "Local character weighted up, not required" },
  { v: "no_preference", l: "No preference", d: "Rank on fit alone" },
  { v: "popular", l: "Popular attractions", d: "Favour well-established, high-volume choices" },
];

const MOBILITIES: { v: Mobility; l: string }[] = [
  { v: "low_walking", l: "Very little walking" },
  { v: "moderate", l: "Some walking is fine" },
  { v: "high", l: "Happy to be active" },
  { v: "wheelchair", l: "Step-free access needed" },
];

const PACES: { v: Pace; l: string }[] = [
  { v: "relaxing", l: "Relaxing" },
  { v: "balanced", l: "Balanced" },
  { v: "energetic", l: "Energetic" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

export default function DiscoverPage() {
  const router = useRouter();
  const [text, setText] = useState(EXAMPLES[0]);
  const [req, setReq] = useState<TravelerRequest | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [engine, setEngine] = useState<"rules" | "claude">("rules");
  const [reading, setReading] = useState(false);

  const set = <K extends keyof TravelerRequest>(k: K, v: TravelerRequest[K]) =>
    setReq((r) => (r ? { ...r, [k]: v } : r));

  const read = useCallback(async (value: string) => {
    setReading(true);
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: value }),
    });
    const data = await res.json();
    setExtraction(data.extraction);
    setReq(data.request);
    setEngine(data.engine);
    setReading(false);
  }, []);

  useEffect(() => {
    void read(EXAMPLES[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = () => {
    if (!req) return;
    router.push(`/results?q=${encodeRequest(req)}`);
  };

  const evidence = (k: keyof Extraction) => extraction?.[k];

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="label">Step 1 · Tell us your situation</p>
      <h1 className="display text-4xl leading-tight font-semibold">
        What does your next few hours actually look like?
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-[var(--color-ink-soft)]">
        Write it the way you would say it out loud. We pull out the constraints, show you
        exactly what we understood, and let you correct anything we got wrong.
      </p>

      {/* --------------------------------------------------- free text input */}
      <div className="card mt-8 p-5">
        <textarea
          className="field min-h-[110px] resize-y border-0 p-0 text-base leading-relaxed focus:shadow-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. I have 3 hours in Manali with my parents and ₹1,000 each. We want something cultural and relaxing."
        />
        <div className="rule my-4" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--color-muted)]">Try:</span>
          {EXAMPLES.map((e, i) => (
            <button
              key={i}
              className="chip hover:border-[var(--color-brand)]"
              onClick={() => {
                setText(e);
                void read(e);
              }}
            >
              {["Parents, 2 hrs", "Solo, hands-on", "Friends, adventure", "Kids, food"][i]}
            </button>
          ))}
          <button
            className="btn btn-primary btn-sm ml-auto"
            onClick={() => void read(text)}
            disabled={reading}
          >
            {reading ? "Reading…" : "Read my request"}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------- extraction */}
      {extraction && req && (
        <div className="fade-up mt-8">
          <div className="flex items-center gap-3">
            <p className="label mb-0">Step 2 · What we understood</p>
            <span className="chip chip-brand">
              {engine === "claude" ? "Claude + rules" : "Rule-based extraction"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["Time available", fmtDuration(req.availableMin), "availableMin"],
                ["Free from", fmtTime(req.startMin), "startMin"],
                ["Budget", `₹${req.budgetPerPerson} per person`, "budgetPerPerson"],
                ["Group", `${req.groupSize} · ${req.travelerType}`, "groupSize"],
                [
                  "Interests",
                  req.interests.length
                    ? req.interests.map((i) => CATEGORY_LABEL[i]).join(", ")
                    : "Open to anything",
                  "interests",
                ],
                [
                  "Mobility",
                  MOBILITIES.find((m) => m.v === req.mobility)?.l ?? req.mobility,
                  "mobility",
                ],
              ] as [string, string, keyof Extraction][]
            ).map(([label, value, key]) => {
              const f = evidence(key);
              return (
                <div key={label} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="label mb-0">{label}</span>
                    <span
                      className={`chip ${
                        f?.confidence === "explicit"
                          ? "chip-good"
                          : f?.confidence === "inferred"
                            ? "chip-warn"
                            : ""
                      }`}
                      style={{ fontSize: "0.62rem", padding: "0.1rem 0.45rem" }}
                    >
                      {f?.confidence ?? "default"}
                    </span>
                  </div>
                  <p className="mt-1.5 font-medium">{value}</p>
                  {f?.evidence && (
                    <p className="mt-1 text-xs text-[var(--color-muted)] italic">
                      from “{f.evidence}”
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- controls */}
      {req && (
        <div className="fade-up mt-10">
          <p className="label">Step 3 · Adjust anything</p>
          <div className="card p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Row label={`Time available — ${fmtDuration(req.availableMin)}`}>
                <input
                  type="range"
                  min={30}
                  max={600}
                  step={15}
                  value={req.availableMin}
                  onChange={(e) => set("availableMin", Number(e.target.value))}
                />
              </Row>

              <Row label={`Free from — ${fmtTime(req.startMin)}`}>
                <input
                  type="range"
                  min={5 * 60}
                  max={22 * 60}
                  step={15}
                  value={req.startMin}
                  onChange={(e) => set("startMin", Number(e.target.value))}
                />
              </Row>

              <Row label={`Budget per person — ₹${req.budgetPerPerson}`}>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={req.budgetPerPerson}
                  onChange={(e) => set("budgetPerPerson", Number(e.target.value))}
                />
              </Row>

              <Row label={`Group size — ${req.groupSize}`}>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={req.groupSize}
                  onChange={(e) => set("groupSize", Number(e.target.value))}
                />
              </Row>

              <Row label="Travelling as">
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      className={`chip ${req.travelerType === t ? "chip-on" : ""}`}
                      onClick={() => set("travelerType", t)}
                    >
                      {t === "parents" ? "with parents" : t}
                    </button>
                  ))}
                </div>
              </Row>

              <Row label="Pace">
                <div className="flex flex-wrap gap-2">
                  {PACES.map((p) => (
                    <button
                      key={p.v}
                      className={`chip ${req.pace === p.v ? "chip-on" : ""}`}
                      onClick={() => set("pace", p.v)}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              </Row>

              <Row label="Interests">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      className={`chip ${req.interests.includes(c) ? "chip-on" : ""}`}
                      onClick={() =>
                        set(
                          "interests",
                          req.interests.includes(c)
                            ? req.interests.filter((x) => x !== c)
                            : [...req.interests, c]
                        )
                      }
                    >
                      {CATEGORY_LABEL[c]}
                    </button>
                  ))}
                </div>
              </Row>

              <Row label="Accessibility & mobility">
                <div className="flex flex-wrap gap-2">
                  {MOBILITIES.map((m) => (
                    <button
                      key={m.v}
                      className={`chip ${req.mobility === m.v ? "chip-on" : ""}`}
                      onClick={() => set("mobility", m.v)}
                    >
                      {m.l}
                    </button>
                  ))}
                </div>
              </Row>
            </div>

            <div className="rule my-6" />

            <Row label="Experience preference">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {PREFS.map((p) => (
                  <button
                    key={p.v}
                    onClick={() => set("preference", p.v)}
                    className={`rounded-xl border p-3 text-left transition ${
                      req.preference === p.v
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                        : "border-[var(--color-line)] bg-white hover:border-[#cfc4b6]"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{p.l}</span>
                    <span className="mt-1 block text-xs leading-snug text-[var(--color-ink-soft)]">
                      {p.d}
                    </span>
                  </button>
                ))}
              </div>
            </Row>
          </div>

          <div className="sticky bottom-4 mt-6 flex justify-center">
            <button className="btn btn-brand pulse-ring shadow-lg" onClick={go}>
              Find what fits — {fmtDuration(req.availableMin)}, ₹{req.budgetPerPerson}, {req.groupSize}{" "}
              {req.groupSize === 1 ? "person" : "people"} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
