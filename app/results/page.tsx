"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { RecommendationResult, TravelerRequest } from "@/lib/types";
import { decodeRequest, encodeRequest } from "@/lib/clientState";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { MiniMap } from "@/components/MiniMap";
import { RecRow, TopRecommendation } from "@/components/RecCard";
import { CATEGORY_LABEL } from "@/components/Bits";

interface Change {
  headline: string;
  detail: string;
}

function ResultsInner() {
  const params = useSearchParams();
  const [req, setReq] = useState<TravelerRequest | null>(null);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [change, setChange] = useState<Change | null>(null);
  const [hover, setHover] = useState<string | undefined>();
  const [showRejected, setShowRejected] = useState(false);

  useEffect(() => {
    setReq(decodeRequest(params.get("q")));
  }, [params]);

  const run = useCallback(async (r: TravelerRequest) => {
    setLoading(true);
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request: r }),
    });
    setResult(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (req) void run(req);
  }, [req, run]);

  const top = result?.recommendations[0];
  const rest = result?.recommendations.slice(1) ?? [];

  /** The dynamic re-recommendation path: mutate the request, rescore, explain. */
  const replan = async (mutate: (r: TravelerRequest) => TravelerRequest, headline: string) => {
    if (!req) return;
    const previousTop = top?.experience.name;
    const next = mutate(req);
    setReq(next);
    setLoading(true);
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request: next }),
    });
    const data: RecommendationResult = await res.json();
    setResult(data);
    setLoading(false);
    const newTop = data.recommendations[0];
    setChange({
      headline,
      detail: newTop
        ? `Re-scored ${data.consideredCount} experiences against your remaining time, budget and preferences. ${
            previousTop && previousTop !== newTop.experience.name
              ? `${newTop.experience.name} now leads at ${newTop.matchScore}%.`
              : `${newTop.experience.name} still leads at ${newTop.matchScore}%.`
          }`
        : "Nothing clears every constraint now — try widening your time or budget below.",
    });
  };

  const markUnavailable = async () => {
    if (!top || !req) return;
    await fetch("/api/disrupt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ experienceId: top.experience.experienceId, action: "cancel" }),
    });
    await replan(
      (r) => ({ ...r, excludedIds: [...r.excludedIds, top.experience.experienceId] }),
      `${top.experience.name} has been cancelled by the provider.`
    );
  };

  const summary = useMemo(() => {
    if (!req) return null;
    return [
      `${fmtDuration(req.availableMin)} from ${fmtTime(req.startMin)}`,
      `₹${req.budgetPerPerson} pp`,
      `${req.groupSize} · ${req.travelerType}`,
      req.interests.length ? req.interests.map((i) => CATEGORY_LABEL[i]).join(", ") : "open to anything",
      req.preference.replace("_", " "),
    ];
  }, [req]);

  if (!req)
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="display text-2xl font-semibold">No request to match against</h1>
        <Link href="/discover" className="btn btn-brand mt-6">
          Describe your situation
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* --------------------------------------------------------- summary */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="label mb-1">Matching for</p>
          <div className="flex flex-wrap gap-2">
            {summary?.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </div>
        <Link href={`/discover`} className="btn btn-ghost btn-sm">
          Change my details
        </Link>
      </div>

      {/* ---------------------------------------------------- change banner */}
      {change && (
        <div className="fade-up mt-6 rounded-2xl border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">⟳</span>
            <div>
              <p className="font-semibold text-[var(--color-brand)]">{change.headline}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                {change.detail}
              </p>
            </div>
            <button
              className="ml-auto text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              onClick={() => setChange(null)}
            >
              dismiss
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-8 space-y-4">
          <div className="shimmer h-56 rounded-2xl" />
          <div className="shimmer h-28 rounded-2xl" />
        </div>
      )}

      {!loading && result && (
        <>
          <div className="mt-6 flex items-baseline justify-between">
            <h1 className="display text-2xl font-semibold">
              {result.recommendations.length} of {result.consideredCount} experiences fit
            </h1>
            <span className="text-xs text-[var(--color-muted)]">
              {result.rejected.length} ruled out by hard constraints
            </span>
          </div>

          {top ? (
            <div className="mt-4">
              <TopRecommendation rec={top} onNotAvailable={markUnavailable} />
            </div>
          ) : (
            <div className="card mt-4 p-8 text-center">
              <p className="display text-xl font-semibold">Nothing clears every constraint</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)]">
                We would rather show you nothing than something you cannot actually do. Loosen
                one constraint below and we will re-run the match.
              </p>
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
            <div>
              <h2 className="label">Other experiences that fit</h2>
              <div className="space-y-3">
                {rest.map((r, i) => (
                  <RecRow
                    key={r.experience.experienceId}
                    rec={r}
                    rank={i + 2}
                    active={hover === r.experience.experienceId}
                    onHover={setHover}
                  />
                ))}
                {rest.length === 0 && (
                  <p className="text-sm text-[var(--color-muted)]">
                    Nothing else clears your constraints right now.
                  </p>
                )}
              </div>

              {/* ------------------------------------------- rejected panel */}
              <div className="card mt-6 p-5">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setShowRejected((s) => !s)}
                >
                  <span className="font-semibold">
                    Why {result.rejected.length} others were not shown
                  </span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {showRejected ? "hide" : "show"}
                  </span>
                </button>
                {showRejected && (
                  <ul className="fade-up mt-4 space-y-2.5">
                    {result.rejected.slice(0, 18).map((r) => (
                      <li
                        key={r.experience.experienceId}
                        className="grid grid-cols-[1fr_auto] items-start gap-3 border-b border-[var(--color-line)] pb-2.5 text-sm last:border-0"
                      >
                        <div>
                          <p className="font-medium">{r.experience.name}</p>
                          <p className="text-xs text-[var(--color-muted)]">{r.detail}</p>
                        </div>
                        <span className="chip chip-warn">{r.rule}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* ------------------------------------------------- right rail */}
            <aside className="space-y-6">
              <MiniMap
                recs={result.recommendations}
                origin={{ lat: req.lat, lng: req.lng }}
                selectedId={hover ?? top?.experience.experienceId}
                onSelect={setHover}
              />

              <div className="card p-5">
                <h3 className="font-semibold">Something changed?</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                  Plans break. Tell us what happened and the match is recomputed against what is
                  actually left.
                </p>
                <div className="mt-4 grid gap-2">
                  <button
                    className="btn btn-ghost btn-sm justify-start"
                    onClick={markUnavailable}
                    disabled={!top}
                  >
                    ✕ My top pick was cancelled
                  </button>
                  <button
                    className="btn btn-ghost btn-sm justify-start"
                    onClick={() =>
                      void replan(
                        (r) => ({ ...r, availableMin: Math.max(45, r.availableMin - 60) }),
                        "You have an hour less than you thought."
                      )
                    }
                  >
                    ⏱ I have an hour less
                  </button>
                  <button
                    className="btn btn-ghost btn-sm justify-start"
                    onClick={() =>
                      void replan(
                        (r) => ({
                          ...r,
                          budgetPerPerson: Math.max(100, Math.round(r.budgetPerPerson * 0.5)),
                        }),
                        "Your budget has halved."
                      )
                    }
                  >
                    ₹ My budget dropped
                  </button>
                  <button
                    className="btn btn-ghost btn-sm justify-start"
                    onClick={() =>
                      void replan(
                        (r) => ({
                          ...r,
                          excludedIds: [
                            ...r.excludedIds,
                            ...(result?.recommendations.slice(0, 3).map((x) => x.experience.experienceId) ??
                              []),
                          ],
                        }),
                        "Showing you something different."
                      )
                    }
                  >
                    ↻ Show me something else
                  </button>
                  <button
                    className="btn btn-ghost btn-sm justify-start"
                    onClick={() =>
                      void replan(
                        (r) => ({ ...r, mobility: "low_walking", pace: "relaxing" }),
                        "It has started raining — moving you indoors and off your feet."
                      )
                    }
                  >
                    ☂ The weather turned
                  </button>
                </div>
                <div className="rule my-4" />
                <button
                  className="btn btn-ghost btn-sm w-full"
                  onClick={() => {
                    const fresh = { ...req, excludedIds: [] };
                    setReq(fresh);
                    setChange(null);
                    window.history.replaceState(null, "", `/results?q=${encodeRequest(fresh)}`);
                  }}
                >
                  Reset exclusions
                </button>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold">How the score works</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                  Every experience first passes hard constraints — budget, capacity, opening
                  hours, accessibility and whether the round trip physically fits your window.
                  What survives is scored on ten weighted factors and the weights are published
                  on every card. It is a match score, not a confidence measure.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-16">Loading…</div>}>
      <ResultsInner />
    </Suspense>
  );
}
