"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ItineraryItem,
  Recommendation,
  RecommendationResult,
  TravelerRequest,
} from "@/lib/types";
import { decodeMeta, decodeRequest, encodeRequest } from "@/lib/clientState";
import { fmtDuration, fmtTime } from "@/lib/engine/time";
import { CATEGORY_LABEL } from "@/components/Bits";
import { useToast } from "@/components/Toast";
import { BestMatch } from "@/components/results/BestMatch";
import {
  ResultCard,
  ScoreRing,
  TripContext,
  weakestLines,
} from "@/components/results/Parts";
import { ChangePanel, Insight, MapPanel, PlanPanel } from "@/components/results/Rail";
import { dominantBlocker, relaxations } from "@/lib/blockers";
import { rememberMatch } from "@/lib/replan";

interface Change {
  headline: string;
  detail: string;
}

interface Filters {
  maxPrice: number | null;
  maxDuration: number | null;
  maxDistance: number | null;
  category: string | null;
  localOnly: boolean;
}

const EMPTY_FILTERS: Filters = {
  maxPrice: null,
  maxDuration: null,
  maxDistance: null,
  category: null,
  localOnly: false,
};

/* ---------------------------------------------------------------- adjust */

/** One-tap adjustments. Each mutates the real request and re-runs the engine. */
const ADJUSTS: {
  key: string;
  label: string;
  headline: string;
  isOn: (r: TravelerRequest) => boolean;
  /** true when the adjustment cannot go any further; disables without implying a choice */
  atLimit?: (r: TravelerRequest) => boolean;
  mutate: (r: TravelerRequest) => TravelerRequest;
}[] = [
  {
    key: "walk",
    label: "Less walking",
    headline: "Showing options with very little walking.",
    isOn: (r) => r.mobility === "low_walking" || r.mobility === "wheelchair",
    mutate: (r) => ({ ...r, mobility: "low_walking" }),
  },
  {
    key: "budget",
    label: "Lower budget",
    headline: "Lowered your budget by about a quarter.",
    isOn: () => false,
    atLimit: (r) => r.budgetPerPerson <= 100,
    mutate: (r) => ({
      ...r,
      budgetPerPerson: Math.max(100, Math.round((r.budgetPerPerson * 0.75) / 50) * 50),
    }),
  },
  {
    key: "local",
    label: "More local",
    headline: "Only experiences scoring 75+ on local relevance.",
    isOn: (r) => r.preference === "local_only",
    mutate: (r) => ({ ...r, preference: "local_only" }),
  },
  {
    key: "adventure",
    label: "More adventurous",
    headline: "Weighted toward energetic experiences.",
    isOn: (r) => r.pace === "energetic",
    mutate: (r) => ({ ...r, pace: "energetic" }),
  },
  {
    key: "relax",
    label: "More relaxing",
    headline: "Weighted toward relaxed, sit-down experiences.",
    isOn: (r) => r.pace === "relaxing",
    mutate: (r) => ({ ...r, pace: "relaxing" }),
  },
];

/* ---------------------------------------------------------------- no fit */

function NoFit({
  result,
  req,
  filtersActive,
  onClearFilters,
  onReplan,
}: {
  result: RecommendationResult;
  req: TravelerRequest;
  filtersActive: boolean;
  onClearFilters: () => void;
  onReplan: (mutate: (r: TravelerRequest) => TravelerRequest, headline: string) => void;
}) {
  const fitting = result.consideredCount - result.rejected.length;

  // the engine found matches; only the display filters are hiding them
  if (filtersActive && result.recommendations.length > 0)
    return (
      <section className="rs-empty">
        <p className="rs-empty-title">No match survives those filters</p>
        <p className="rs-empty-body">
          {fitting} experience{fitting === 1 ? "" : "s"} fit your situation — your filters are
          hiding all of them.
        </p>
        <div className="rs-empty-actions">
          <button className="btn btn-brand btn-sm" onClick={onClearFilters}>
            Clear filters
          </button>
        </div>
      </section>
    );

  // the same blocker reasoning the replanning flow uses
  const { text: blocker, bucket } = dominantBlocker(result, req);
  const actions = relaxations(req, bucket).map((a) => ({
    ...a,
    run: () => onReplan(a.mutate, a.headline),
  }));

  return (
    <section className="rs-empty">
      <p className="rs-empty-title">Nothing fits all of your constraints right now.</p>
      <p className="rs-empty-body">
        LocalFlow would rather show you nothing than something you can&apos;t actually do.
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
            onClick={a.run}
          >
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function ResultsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [req, setReq] = useState<TravelerRequest | null>(null);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [change, setChange] = useState<Change | null>(null);
  const [hover, setHover] = useState<string | undefined>();
  const [showNotRanked, setShowNotRanked] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [plan, setPlan] = useState<{ rec: Recommendation; items: ItineraryItem[] }[]>([]);

  // loading copy moves from reading to checking while the real request is in
  // flight; results still render the moment the engine responds
  const [loadStage, setLoadStage] = useState<"read" | "check">("read");
  useEffect(() => {
    if (!loading) return;
    setLoadStage("read");
    const t = window.setTimeout(() => setLoadStage("check"), 380);
    return () => window.clearTimeout(t);
  }, [loading]);

  const openFiltered = () => {
    setShowNotRanked(true);
    const reduced =
      document.documentElement.getAttribute("data-motion") === "reduced" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () =>
        document
          .getElementById("rs-filtered")
          ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }),
      60
    );
  };

  const meta = useMemo(() => decodeMeta(params.get("m")), [params]);

  useEffect(() => {
    setReq(decodeRequest(params.get("q")));
  }, [params]);

  const run = useCallback(async (r: TravelerRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request: r }),
      });
      if (!res.ok) throw new Error(`The matching service returned ${res.status}.`);
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while matching.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (req) void run(req);
  }, [req, run]);

  const top = result?.recommendations[0];

  // remember the matched set so a booking made from it keeps this situation;
  // arriving from a replan carries the cancelled booking it would replace
  useEffect(() => {
    if (!result || !req) return;
    rememberMatch(
      req,
      result.recommendations.map((r) => r.experience.experienceId),
      params.get("replaces") ?? undefined
    );
  }, [result, req, params]);

  /** The dynamic re-recommendation path: mutate the request, rescore, explain. */
  const replan = async (mutate: (r: TravelerRequest) => TravelerRequest, headline: string) => {
    if (!req) return;
    const previousTop = top?.experience.name;
    const next = mutate(req);
    setReq(next);
    setLoading(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request: next }),
      });
      const data: RecommendationResult = await res.json();
      setResult(data);
      const newTop = data.recommendations[0];
      setChange({
        headline,
        detail: newTop
          ? `Re-scored ${data.consideredCount} experiences against your remaining time, budget and preferences. ${
              previousTop && previousTop !== newTop.experience.name
                ? `${newTop.experience.name} now leads at ${newTop.matchScore}%.`
                : `${newTop.experience.name} still leads at ${newTop.matchScore}%.`
            }`
          : "Nothing clears every constraint now — loosen one below and we'll re-run the match.",
      });
    } catch {
      setError("Could not re-run the match.");
    } finally {
      setLoading(false);
    }
  };

  /** Hand a disruption to the dedicated replanning screen. */
  const goReplan = (reason: string, experienceId?: string) => {
    if (!req) return;
    const x = experienceId ?? top?.experience.experienceId;
    router.push(`/replan?q=${encodeRequest(req)}&r=${reason}${x ? `&x=${x}` : ""}`);
  };

  /**
   * Add to plan writes real itinerary items from the engine's own feasibility
   * numbers, then re-runs the match. The engine already detects itinerary
   * clashes and scores plan compatibility, so this drives existing behaviour
   * rather than adding a second planner.
   */
  const addToPlan = async (rec: Recommendation) => {
    if (!req) return;
    const f = rec.feasibility;
    const start = f.earliestStartMin ?? req.startMin;
    const id = rec.experience.experienceId;
    const items: ItineraryItem[] = [
      {
        itemId: `${id}-out`,
        label: `Travel to ${rec.experience.area}`,
        startMin: start - f.travelToMin,
        endMin: start,
        kind: "travel",
      },
      {
        itemId: `${id}-exp`,
        label: rec.experience.name,
        experienceId: id,
        startMin: start,
        endMin: start + rec.experience.durationMin,
        kind: "experience",
      },
      {
        itemId: `${id}-back`,
        label: "Return",
        startMin: start + rec.experience.durationMin,
        endMin: start + rec.experience.durationMin + f.travelBackMin,
        kind: "travel",
      },
    ];
    setPlan((p) => [...p, { rec, items }]);
    toast(`${rec.experience.name} added to your plan`);
    await replan(
      (r) => ({ ...r, itinerary: [...r.itinerary, ...items] }),
      `${rec.experience.name} is in your plan.`
    );
  };

  const removeFromPlan = async (experienceId: string) => {
    if (!req) return;
    setPlan((p) => p.filter((x) => x.rec.experience.experienceId !== experienceId));
    await replan(
      (r) => ({ ...r, itinerary: r.itinerary.filter((i) => !i.itemId.startsWith(experienceId)) }),
      "Removed from your plan."
    );
  };

  const clearPlan = async () => {
    if (!req) return;
    setPlan([]);
    await replan((r) => ({ ...r, itinerary: [] }), "Plan cleared.");
  };

  /* ------------------------------------------------------------- filtering */

  const visible = useMemo(() => {
    const recs = result?.recommendations ?? [];
    return recs.filter((r) => {
      if (filters.maxPrice !== null && r.experience.price > filters.maxPrice) return false;
      if (filters.maxDuration !== null && r.experience.durationMin > filters.maxDuration) return false;
      if (filters.maxDistance !== null && r.feasibility.distanceKm > filters.maxDistance) return false;
      if (filters.category && r.experience.category !== filters.category) return false;
      if (filters.localOnly && r.experience.localRelevance < 75) return false;
      return true;
    });
  }, [result, filters]);

  const filtersActive =
    filters.maxPrice !== null ||
    filters.maxDuration !== null ||
    filters.maxDistance !== null ||
    Boolean(filters.category) ||
    filters.localOnly;

  const hero = visible[0];
  const rest = visible.slice(1);
  const planIds = plan.map((p) => p.rec.experience.experienceId);

  const categories = useMemo(
    () => Array.from(new Set((result?.recommendations ?? []).map((r) => r.experience.category))),
    [result]
  );

  /* --------------------------------------------------------------- render */

  if (!req)
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="rs-context-title">No request to match against</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          Tell LocalFlow your situation and it will reason about what actually fits.
        </p>
        <Link href="/discover" className="btn btn-brand mt-6">
          Plan my day
        </Link>
      </div>
    );

  return (
    <div className="rs-page">
      {/* ------------------------------------------------------- context */}
      <TripContext req={req} meta={meta} onRefine={() => setRefineOpen((v) => !v)} />

      {refineOpen && (
        <section className="rs-refine fade-up">
          <div className="rs-refine-head">
            <h3>Adjust your situation</h3>
            <Link href="/discover" className="rs-ghost-link">
              Start a new request →
            </Link>
          </div>
          <div className="rs-refine-grid">
            <label>
              <span className="rs-refine-label">
                Time available — {fmtDuration(req.availableMin)}
              </span>
              <input
                type="range"
                min={30}
                max={600}
                step={15}
                value={req.availableMin}
                onChange={(e) => setReq({ ...req, availableMin: Number(e.target.value) })}
              />
            </label>
            <label>
              <span className="rs-refine-label">Budget — ₹{req.budgetPerPerson} pp</span>
              <input
                type="range"
                min={0}
                max={5000}
                step={50}
                value={req.budgetPerPerson}
                onChange={(e) => setReq({ ...req, budgetPerPerson: Number(e.target.value) })}
              />
            </label>
            <label>
              <span className="rs-refine-label">Free from — {fmtTime(req.startMin)}</span>
              <input
                type="range"
                min={5 * 60}
                max={22 * 60}
                step={15}
                value={req.startMin}
                onChange={(e) => setReq({ ...req, startMin: Number(e.target.value) })}
              />
            </label>
            <label>
              <span className="rs-refine-label">Group size — {req.groupSize}</span>
              <input
                type="range"
                min={1}
                max={20}
                value={req.groupSize}
                onChange={(e) => setReq({ ...req, groupSize: Number(e.target.value) })}
              />
            </label>
          </div>
          <p className="rs-refine-note">
            These re-run the real matching engine. The filters below only narrow what is already a
            match.
          </p>
        </section>
      )}

      {/* ------------------------------------------------ quick adjust */}
      <section className="rs-adjust" aria-label="Adjust without starting over">
        <span className="rs-adjust-label">Want to change something?</span>
        {ADJUSTS.map((a) => {
          const on = a.isOn(req);
          const limit = a.atLimit?.(req) ?? false;
          return (
            <button
              key={a.key}
              className="rs-adjust-chip"
              aria-pressed={on}
              disabled={loading || on || limit}
              title={limit ? "Already at the lowest supported value" : undefined}
              onClick={() => void replan(a.mutate, a.headline)}
            >
              {a.label}
            </button>
          );
        })}
      </section>

      {/* ------------------------------------------------- change banner */}
      {change && (
        <div className="rs-banner fade-up" role="status">
          <span className="rs-banner-icon" aria-hidden>
            ⟳
          </span>
          <div className="min-w-0">
            <p className="rs-banner-title">{change.headline}</p>
            <p className="rs-banner-body">{change.detail}</p>
          </div>
          <button className="rs-ghost-link" onClick={() => setChange(null)}>
            dismiss
          </button>
        </div>
      )}

      {/* -------------------------------------------------------- states */}
      {loading && (
        <div className="rs-loading" role="status" aria-live="polite">
          <ol className="rs-stages">
            <li className={loadStage === "read" ? "is-active" : "is-done"}>
              <span className="rs-stage-label">Understanding your day</span>
              <span className="rs-stage-sub">
                Reading your time · group · budget · interests · preferences
              </span>
            </li>
            <li className={loadStage === "check" ? "is-active" : ""}>
              <span className="rs-stage-label">Checking what fits</span>
              <span className="rs-stage-sub">
                Opening hours, travel time and accessibility against your{" "}
                {fmtDuration(req.availableMin)} window
              </span>
            </li>
          </ol>
          <div className="shimmer rs-loading-hero" />
          <div className="rs-loading-row">
            <div className="shimmer" />
            <div className="shimmer" />
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rs-error">
          <p className="rs-error-title">We couldn&apos;t complete the match</p>
          <p className="rs-error-body">{error}</p>
          <button className="btn btn-brand btn-sm mt-4" onClick={() => void run(req)}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && result && (
        <div className="rs-grid">
          {/* ============================================ main: hero + why */}
          <div className="rs-main-top">
            {(() => {
              // the engine returns the top slice; the true fit count is what survived filtering
              const fitting = result.consideredCount - result.rejected.length;
              return (
                <div className="rs-summary">
                  {fitting > 0 && (
                  <>
                  <h2 className="rs-summary-title">
                    {fitting} experience{fitting === 1 ? "" : "s"} fit your situation
                  </h2>
                  <p className="rs-summary-sub">
                    Ranked by how well they fit your time, budget, preferences and group — not by
                    rating.
                    {result.recommendations.length < fitting && (
                      <> Showing the top {result.recommendations.length}.</>
                    )}
                    {filtersActive && (
                      <>
                        {" "}
                        <strong>{visible.length}</strong> shown after your filters.
                      </>
                    )}
                  </p>
                  </>
                  )}
                  {result.rejected.length > 0 && (
                    <p className="rs-summary-filtered">
                      <strong>{result.rejected.length}</strong> of {result.consideredCount} were
                      filtered out because they didn&apos;t fit your constraints.{" "}
                      <button className="rs-inline-btn" onClick={openFiltered}>
                        See what was filtered
                      </button>
                    </p>
                  )}
                </div>
              );
            })()}

            {hero ? (
              <BestMatch
                rec={hero}
                availableMin={req.availableMin}
                inPlan={planIds.includes(hero.experience.experienceId)}
                onAddToPlan={addToPlan}
                onUnavailable={() => goReplan("unavailable", hero.experience.experienceId)}
              />
            ) : plan.length > 0 && !filtersActive ? (
              /* the plan now occupies the window, so the engine clashes everything
                 else out — that is success, not a failed search */
              <section className="rs-empty is-planned">
                <p className="rs-empty-title">Your window is planned</p>
                <p className="rs-empty-body">
                  {plan.map((p) => p.rec.experience.name).join(", ")} fills the{" "}
                  {fmtDuration(req.availableMin)} you have, so nothing else can fit alongside it.
                  Your timeline is on the right.
                </p>
                <div className="rs-empty-actions">
                  <Link
                    href={`/experience/${plan[0].rec.experience.experienceId}`}
                    className="btn btn-brand btn-sm"
                  >
                    View & book {plan[0].rec.experience.name}
                  </Link>
                  <button className="btn btn-ghost btn-sm" onClick={clearPlan}>
                    Clear plan and keep browsing
                  </button>
                </div>
              </section>
            ) : (
              <NoFit
                result={result}
                req={req}
                filtersActive={filtersActive}
                onClearFilters={() => setFilters(EMPTY_FILTERS)}
                onReplan={(m, h) => void replan(m, h)}
              />
            )}
          </div>

          {/* ==================================================== rail */}
          <aside className="rs-rail">
            <Insight result={result} req={req} />
            <MapPanel
              result={result}
              req={req}
              selectedId={hover ?? hero?.experience.experienceId}
              onSelect={setHover}
            />
            <PlanPanel plan={plan} onRemove={removeFromPlan} onClear={clearPlan} />
            <ChangePanel
              hasTop={Boolean(top)}
              onCancelTop={() => goReplan("unavailable")}
              onLessTime={() => goReplan("less_time")}
              onBudgetDrop={() => goReplan("budget")}
              onWeather={() => goReplan("weather")}
              onSomethingElse={() =>
                void replan(
                  (r) => ({
                    ...r,
                    excludedIds: [
                      ...r.excludedIds,
                      ...(result.recommendations.slice(0, 3).map((x) => x.experience.experienceId) ?? []),
                    ],
                  }),
                  "Showing you something different."
                )
              }
              onReset={() => {
                const fresh = { ...req, excludedIds: [] };
                setReq(fresh);
                setChange(null);
                window.history.replaceState(null, "", `/results?q=${encodeRequest(fresh)}`);
              }}
            />
          </aside>

          {/* ====================================== main: others + why not */}
          <div className="rs-main-bottom">
            {/* lightweight filters */}
            <div className="rs-filters">
              <span className="rs-filters-label">Narrow it down</span>
              <button
                className={`rs-filter ${filters.localOnly ? "is-on" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, localOnly: !f.localOnly }))}
              >
                Local 75+
              </button>
              <button
                className={`rs-filter ${filters.maxPrice !== null ? "is-on" : ""}`}
                onClick={() =>
                  setFilters((f) => ({ ...f, maxPrice: f.maxPrice === null ? 500 : null }))
                }
              >
                Under ₹500
              </button>
              <button
                className={`rs-filter ${filters.maxDuration !== null ? "is-on" : ""}`}
                onClick={() =>
                  setFilters((f) => ({ ...f, maxDuration: f.maxDuration === null ? 60 : null }))
                }
              >
                Under 1 hr
              </button>
              <button
                className={`rs-filter ${filters.maxDistance !== null ? "is-on" : ""}`}
                onClick={() =>
                  setFilters((f) => ({ ...f, maxDistance: f.maxDistance === null ? 5 : null }))
                }
              >
                Within 5 km
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  className={`rs-filter ${filters.category === c ? "is-on" : ""}`}
                  onClick={() =>
                    setFilters((f) => ({ ...f, category: f.category === c ? null : c }))
                  }
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
              {filtersActive && (
                <button className="rs-ghost-link" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear
                </button>
              )}
            </div>

            {rest.length > 0 && (
              <>
                <h2 className="rs-section-title">Other experiences that fit your situation</h2>
                <div className="rs-cards">
                  {rest.map((r, i) => (
                    <ResultCard
                      key={r.experience.experienceId}
                      rec={r}
                      rank={i + 2}
                      active={hover === r.experience.experienceId}
                      availableMin={req.availableMin}
                      onHover={setHover}
                      onAddToPlan={addToPlan}
                      inPlan={planIds.includes(r.experience.experienceId)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* --------------------------------- why these weren't higher */}
            {(rest.length > 0 || result.rejected.length > 0) && (
              <section className="rs-notranked" id="rs-filtered">
                <button
                  className="rs-notranked-toggle"
                  onClick={() => setShowNotRanked((s) => !s)}
                  aria-expanded={showNotRanked}
                >
                  <span>Why these weren&apos;t ranked higher</span>
                  <span className="rs-ghost-link">{showNotRanked ? "hide" : "show"}</span>
                </button>

                {showNotRanked && (
                  <div className="fade-up">
                    {rest.length > 0 && (
                      <>
                        <p className="rs-notranked-lede">
                          These matched, but scored lower on the factors below — the engine&apos;s
                          own weakest lines for each.
                        </p>
                        <ul className="rs-lower">
                          {rest.slice(0, 4).map((r) => (
                            <li key={r.experience.experienceId}>
                              <div className="rs-lower-head">
                                <ScoreRing score={r.matchScore} size={42} label={false} />
                                <span className="rs-lower-name">{r.experience.name}</span>
                              </div>
                              <ul className="rs-lower-lines">
                                {weakestLines(r).map((l) => (
                                  <li key={l.key}>
                                    <span aria-hidden>–</span>
                                    <strong>{l.label}:</strong> {l.detail}
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {result.rejected.length > 0 && (
                      <>
                        <p className="rs-notranked-lede mt-6">
                          {result.rejected.length} more never reached the ranking at all — they
                          failed a hard constraint:
                        </p>
                        <ul className="rs-rejected">
                          {result.rejected.slice(0, 14).map((r) => (
                            <li key={r.experience.experienceId}>
                              <div className="min-w-0">
                                <span className="rs-rejected-name">{r.experience.name}</span>
                                <span className="rs-rejected-detail">{r.detail}</span>
                              </div>
                              <span className="rs-rejected-rule">{r.rule}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="rs-page"><div className="shimmer rs-loading-hero" /></div>}>
      <ResultsInner />
    </Suspense>
  );
}
