import type {
  Experience,
  Feasibility,
  RecommendationResult,
  Recommendation,
  RejectedCandidate,
  ScoreLine,
  TravelerRequest,
} from "@/lib/types";
import { haversineKm, roadKm, travelTimeMin } from "./geo";
import { dayOfWeek, earliestStart, fmtDuration, fmtTime, itineraryConflict } from "./time";
import { getExperiences, getProvider, isCancelledToday } from "@/lib/store";
import { explain } from "./explain";

/**
 * Weights of the match score. They sum to 1 and are shown to the traveler -
 * this is a stated platform methodology, not a claim of certainty.
 */
export const WEIGHTS = {
  interest: 0.2,
  time: 0.15,
  budget: 0.12,
  group: 0.1,
  distance: 0.09,
  accessibility: 0.08,
  local: 0.08,
  availability: 0.07,
  trust: 0.06,
  itinerary: 0.05,
} as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

// ---------------------------------------------------------------- feasibility

export function computeFeasibility(
  exp: Experience,
  req: TravelerRequest
): Feasibility {
  const km = haversineKm(req.lat, req.lng, exp.lat, exp.lng);
  const to = travelTimeMin(km);
  const back = Math.round(to * 0.95); // return leg is usually marginally quicker
  const start = earliestStart(exp, req.date, req.startMin + to);
  const distanceKm = roadKm(km);

  if (start === null) {
    return {
      travelToMin: to,
      travelBackMin: back,
      distanceKm,
      totalCommitmentMin: to + exp.durationMin + back,
      fits: false,
      earliestStartMin: null,
      reason: "No session runs at a time you are free",
    };
  }

  const waitMin = Math.max(0, start - (req.startMin + to));
  const total = to + waitMin + exp.durationMin + back;
  const fits = total <= req.availableMin;

  return {
    travelToMin: to,
    travelBackMin: back,
    distanceKm,
    totalCommitmentMin: total,
    fits,
    earliestStartMin: start,
    reason: fits
      ? undefined
      : `Needs ${fmtDuration(total)} door to door, you have ${fmtDuration(req.availableMin)}`,
  };
}

// -------------------------------------------------------------- hard filters

interface FilterOutcome {
  ok: boolean;
  rule?: string;
  detail?: string;
}

function hardFilters(
  exp: Experience,
  req: TravelerRequest,
  f: Feasibility
): FilterOutcome {
  if (!exp.active)
    return { ok: false, rule: "Not currently running", detail: "The provider has paused this experience (out of season)." };

  if (isCancelledToday(exp.experienceId))
    return { ok: false, rule: "Cancelled today", detail: "The provider marked this unavailable for today." };

  if (req.excludedIds.includes(exp.experienceId))
    return { ok: false, rule: "Ruled out", detail: "You asked not to see this one." };

  if (exp.price > req.budgetPerPerson)
    return {
      ok: false,
      rule: "Over budget",
      detail: `₹${exp.price} per person against your ₹${req.budgetPerPerson} limit.`,
    };

  if (req.groupSize > exp.capacity)
    return {
      ok: false,
      rule: "Group too large",
      detail: `Capacity is ${exp.capacity}, your group is ${req.groupSize}.`,
    };

  if (req.groupSize < exp.minGroup)
    return {
      ok: false,
      rule: "Minimum group not met",
      detail: `Runs with ${exp.minGroup}+ people.`,
    };

  const runsToday = exp.slots.some((s) => s.days.includes(dayOfWeek(req.date)));
  if (!runsToday)
    return { ok: false, rule: "Closed on this day", detail: "Does not run on the date you chose." };

  if (f.earliestStartMin === null)
    return { ok: false, rule: "No session in your window", detail: f.reason ?? "" };

  if (!f.fits)
    return { ok: false, rule: "Will not fit your time", detail: f.reason ?? "" };

  if (req.mobility === "wheelchair" && !exp.wheelchairAccessible)
    return {
      ok: false,
      rule: "Not wheelchair accessible",
      detail: "The provider has not confirmed step-free access.",
    };

  if (req.mobility === "low_walking" && exp.mobility === "high")
    return {
      ok: false,
      rule: "Too physically demanding",
      detail: "Involves sustained walking or climbing you said you want to avoid.",
    };

  if (req.preference === "local_only" && exp.localRelevance < 75)
    return {
      ok: false,
      rule: "Not local enough",
      detail: `Local relevance ${exp.localRelevance}/100, below the 75 threshold you asked for.`,
    };

  if (f.earliestStartMin !== null) {
    const end = f.earliestStartMin + exp.durationMin;
    const clash = itineraryConflict(req.itinerary, f.earliestStartMin - f.travelToMin, end + f.travelBackMin);
    if (clash)
      return {
        ok: false,
        rule: "Clashes with your plan",
        detail: `Overlaps "${clash.label}" at ${fmtTime(clash.startMin)}.`,
      };
  }

  return { ok: true };
}

// ------------------------------------------------------------------- scoring

function interestScore(exp: Experience, req: TravelerRequest): ScoreLine {
  let category: number;
  let detail: string;

  if (req.interests.length === 0) {
    category = 0.7;
    detail = "No specific interests given, so this is not weighted against it";
  } else if (req.interests.includes(exp.category)) {
    category = 1;
    detail = `Matches your interest in ${exp.category}`;
  } else {
    const tagHit = exp.tags.some((t) =>
      req.interests.some((i) => t.toLowerCase().includes(i))
    );
    category = tagHit ? 0.55 : 0.15;
    detail = tagHit
      ? "Adjacent to what you asked for"
      : `A ${exp.category} experience, outside the interests you named`;
  }

  const calm = exp.mobility === "low_walking" || exp.tags.includes("relaxing") || exp.tags.includes("quiet");
  const lively = exp.category === "adventure" || exp.tags.includes("thrill") || exp.mobility === "high";
  let pace = 0.7;
  if (req.pace === "relaxing") pace = calm ? 1 : lively ? 0.25 : 0.6;
  if (req.pace === "energetic") pace = lively ? 1 : calm ? 0.35 : 0.65;
  if (req.pace === "balanced") pace = 0.8;

  const score = 0.75 * category + 0.25 * pace;
  if (req.pace === "relaxing" && calm) detail += ", and it is a relaxed sit-down experience";
  if (req.pace === "energetic" && lively) detail += ", and it is high-energy as you wanted";

  return { key: "interest", label: "Interest match", score, weight: WEIGHTS.interest, detail };
}

function timeScore(exp: Experience, req: TravelerRequest, f: Feasibility): ScoreLine {
  const r = f.totalCommitmentMin / req.availableMin;
  let score: number;
  if (r >= 0.55 && r <= 0.9) score = 1;
  else if (r < 0.55) score = lerp(0.68, 1, r / 0.55);
  else score = lerp(1, 0.72, (r - 0.9) / 0.1);

  const spare = req.availableMin - f.totalCommitmentMin;
  return {
    key: "time",
    label: "Time fit",
    score,
    weight: WEIGHTS.time,
    detail: `${fmtDuration(f.totalCommitmentMin)} door to door including ${fmtDuration(
      f.travelToMin + f.travelBackMin
    )} of travel, leaving ${fmtDuration(spare)} spare`,
  };
}

function budgetScore(exp: Experience, req: TravelerRequest): ScoreLine {
  const ratio = req.budgetPerPerson === 0 ? 0 : exp.price / req.budgetPerPerson;
  // comfortably inside budget scores best; scraping the ceiling scores lower
  const score = ratio <= 0.7 ? 1 : lerp(1, 0.6, (ratio - 0.7) / 0.3);
  const total = exp.price * req.groupSize;
  return {
    key: "budget",
    label: "Budget fit",
    score,
    weight: WEIGHTS.budget,
    detail:
      exp.price === 0
        ? "Free to attend"
        : `₹${exp.price} per person, ₹${total} for ${req.groupSize} — ${Math.round(
            (1 - ratio) * 100
          )}% under your per-person limit`,
  };
}

function groupScore(exp: Experience, req: TravelerRequest): ScoreLine {
  const suited = exp.suitableFor.includes(req.travelerType);
  const headroom = exp.capacity - req.groupSize;
  const capScore = headroom >= 4 ? 1 : headroom >= 1 ? 0.85 : 0.7;
  const score = (suited ? 1 : 0.4) * 0.75 + capScore * 0.25;
  return {
    key: "group",
    label: "Group suitability",
    score,
    weight: WEIGHTS.group,
    detail: suited
      ? `Hosted for ${req.travelerType === "parents" ? "older parents" : req.travelerType} groups, ${headroom} places left today`
      : `Provider lists this for ${exp.suitableFor.slice(0, 3).join(", ")} groups`,
  };
}

function distanceScore(f: Feasibility): ScoreLine {
  const d = f.distanceKm;
  const score = d <= 2 ? 1 : d <= 8 ? lerp(1, 0.72, (d - 2) / 6) : lerp(0.72, 0.2, (d - 8) / 22);
  return {
    key: "distance",
    label: "Distance",
    score,
    weight: WEIGHTS.distance,
    detail: `${d} km by road, about ${fmtDuration(f.travelToMin)} each way`,
  };
}

function accessibilityScore(exp: Experience, req: TravelerRequest): ScoreLine {
  let score = 0.7;
  let detail = "Standard mobility expected";

  if (req.mobility === "wheelchair") {
    score = exp.wheelchairAccessible ? 1 : 0;
    detail = exp.wheelchairAccessible
      ? "Step-free access confirmed by the provider"
      : "Not step-free";
  } else if (req.mobility === "low_walking") {
    score = exp.mobility === "low_walking" ? 1 : 0.55;
    detail =
      exp.mobility === "low_walking"
        ? "Almost no walking — seated or on-the-spot throughout"
        : "Some walking involved";
  } else if (req.mobility === "high") {
    score = exp.mobility === "high" ? 1 : 0.75;
    detail = exp.mobility === "high" ? "Physically involved, as you wanted" : "Gentle on the legs";
  }

  if (exp.indoor && (req.mobility === "low_walking" || req.travelerType === "parents")) {
    detail += "; indoors and sheltered";
    score = Math.min(1, score + 0.05);
  }

  return { key: "accessibility", label: "Accessibility", score, weight: WEIGHTS.accessibility, detail };
}

function localScore(exp: Experience, req: TravelerRequest): ScoreLine {
  const lr = exp.localRelevance / 100;
  let score: number;
  let detail: string;

  switch (req.preference) {
    case "local_only":
    case "prefer_local":
      score = lr;
      detail = `Local relevance ${exp.localRelevance}/100 — ${exp.localRelevanceFactors[0]?.toLowerCase() ?? "locally run"}`;
      break;
    case "popular":
      score = Math.min(1, 0.35 + exp.reviewCount / 400);
      detail = `${exp.reviewCount} reviews — a well-established choice`;
      break;
    default:
      score = 0.55 + 0.45 * lr;
      detail = `Local relevance ${exp.localRelevance}/100`;
  }

  return { key: "local", label: "Local character", score, weight: WEIGHTS.local, detail };
}

function availabilityScore(exp: Experience, req: TravelerRequest, f: Feasibility): ScoreLine {
  const wait = Math.max(0, (f.earliestStartMin ?? 0) - (req.startMin + f.travelToMin));
  const score = wait <= 15 ? 1 : wait <= 60 ? lerp(1, 0.75, (wait - 15) / 45) : lerp(0.75, 0.4, (wait - 60) / 120);
  return {
    key: "availability",
    label: "Availability",
    score,
    weight: WEIGHTS.availability,
    detail:
      wait <= 15
        ? `Starts at ${fmtTime(f.earliestStartMin ?? 0)}, as soon as you can get there`
        : `Next session at ${fmtTime(f.earliestStartMin ?? 0)}, a ${fmtDuration(wait)} wait after you arrive`,
  };
}

function trustScore(exp: Experience): ScoreLine {
  const verif = exp.verification === "verified" ? 1 : exp.verification === "pending" ? 0.55 : 0.25;
  const rating = (exp.rating - 3.5) / 1.5; // 3.5 -> 0, 5.0 -> 1
  const volume = Math.min(1, exp.reviewCount / 60);
  const score = 0.5 * verif + 0.35 * Math.max(0, Math.min(1, rating)) + 0.15 * volume;
  return {
    key: "trust",
    label: "Trust",
    score,
    weight: WEIGHTS.trust,
    detail:
      exp.verification === "verified"
        ? `Verified provider, ${exp.rating.toFixed(1)}★ from ${exp.reviewCount} visits`
        : `Verification in progress, ${exp.rating.toFixed(1)}★ from ${exp.reviewCount} visits`,
  };
}

function itineraryScore(req: TravelerRequest, f: Feasibility, exp: Experience): ScoreLine {
  if (req.itinerary.length === 0)
    return {
      key: "itinerary",
      label: "Plan compatibility",
      score: 0.8,
      weight: WEIGHTS.itinerary,
      detail: "Nothing else booked in this window",
    };

  const end = (f.earliestStartMin ?? 0) + exp.durationMin + f.travelBackMin;
  const nextItem = req.itinerary
    .filter((i) => i.startMin >= end)
    .sort((a, b) => a.startMin - b.startMin)[0];

  if (!nextItem)
    return {
      key: "itinerary",
      label: "Plan compatibility",
      score: 0.9,
      weight: WEIGHTS.itinerary,
      detail: "Sits after everything else you have planned",
    };

  const buffer = nextItem.startMin - end;
  const score = buffer >= 30 ? 1 : buffer >= 10 ? 0.8 : 0.5;
  return {
    key: "itinerary",
    label: "Plan compatibility",
    score,
    weight: WEIGHTS.itinerary,
    detail: `You are back ${fmtDuration(buffer)} before "${nextItem.label}"`,
  };
}

// ------------------------------------------------------------------ pipeline

export function scoreExperience(
  exp: Experience,
  req: TravelerRequest,
  f: Feasibility
): { matchScore: number; lines: ScoreLine[] } {
  const lines: ScoreLine[] = [
    interestScore(exp, req),
    timeScore(exp, req, f),
    budgetScore(exp, req),
    groupScore(exp, req),
    distanceScore(f),
    accessibilityScore(exp, req),
    localScore(exp, req),
    availabilityScore(exp, req, f),
    trustScore(exp),
    itineraryScore(req, f, exp),
  ];
  const total = lines.reduce((sum, l) => sum + l.score * l.weight, 0);
  return { matchScore: Math.round(total * 100), lines };
}

function reasonsAndWarnings(
  exp: Experience,
  req: TravelerRequest,
  f: Feasibility,
  lines: ScoreLine[]
) {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const by = (k: string) => lines.find((l) => l.key === k)!;

  const spare = req.availableMin - f.totalCommitmentMin;
  reasons.push(`Fits your ${fmtDuration(req.availableMin)} with ${fmtDuration(spare)} to spare`);
  if (exp.price === 0) reasons.push("Free");
  else reasons.push(`₹${exp.price} pp, inside your ₹${req.budgetPerPerson} budget`);
  if (by("interest").score >= 0.8) reasons.push(by("interest").detail);
  if (exp.suitableFor.includes(req.travelerType))
    reasons.push(
      req.travelerType === "parents" || req.travelerType === "family"
        ? "Family friendly"
        : `Suits ${req.travelerType} groups`
    );
  if (req.mobility === "low_walking" && exp.mobility === "low_walking")
    reasons.push("Very little walking");
  if (req.mobility === "wheelchair" && exp.wheelchairAccessible)
    reasons.push("Step-free access");
  if (f.distanceKm <= 3) reasons.push(`Only ${f.distanceKm} km away`);
  if (exp.localRelevance >= 85 && req.preference !== "popular")
    reasons.push(`Genuinely local (${exp.localRelevance}/100)`);
  if (exp.verification === "verified") reasons.push("Verified provider");

  if (spare < 20) warnings.push("Tight — barely any buffer if you run late");
  if (!exp.indoor) warnings.push("Outdoors, so weather dependent");
  if (exp.verification !== "verified")
    warnings.push("Provider verification still in progress");
  if (exp.capacity - req.groupSize <= 1)
    warnings.push(`Only ${exp.capacity - req.groupSize} spare places today`);
  if (f.distanceKm > 15) warnings.push(`${f.distanceKm} km each way — most of your window is travel`);

  return { reasons: reasons.slice(0, 6), warnings };
}

export function recommend(req: TravelerRequest, limit = 8): RecommendationResult {
  const all = getExperiences();
  const recommendations: Recommendation[] = [];
  const rejected: RejectedCandidate[] = [];

  for (const exp of all) {
    const f = computeFeasibility(exp, req);
    const gate = hardFilters(exp, req, f);
    if (!gate.ok) {
      rejected.push({ experience: exp, rule: gate.rule!, detail: gate.detail ?? "" });
      continue;
    }
    const provider = getProvider(exp.providerId);
    if (!provider) continue;

    const { matchScore, lines } = scoreExperience(exp, req, f);
    const { reasons, warnings } = reasonsAndWarnings(exp, req, f, lines);

    recommendations.push({
      experience: exp,
      provider,
      matchScore,
      lines,
      feasibility: f,
      reasons,
      warnings,
      explanation: explain(exp, provider, req, f, lines, matchScore),
    });
  }

  recommendations.sort((a, b) => b.matchScore - a.matchScore);

  return {
    request: req,
    recommendations: recommendations.slice(0, limit),
    rejected: rejected.sort((a, b) => a.rule.localeCompare(b.rule)),
    consideredCount: all.length,
  };
}
