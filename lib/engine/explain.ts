import type {
  Experience,
  Feasibility,
  Provider,
  ScoreLine,
  TravelerRequest,
} from "@/lib/types";
import { fmtDuration, fmtTime } from "./time";

/**
 * Deterministic, template-based explanation of a match. This is the offline
 * path; lib/ai/llm.ts can rewrite the same facts more fluently when an API key
 * is configured, but the facts are always produced here so the demo never
 * depends on a network call.
 */
export function explain(
  exp: Experience,
  provider: Provider,
  req: TravelerRequest,
  f: Feasibility,
  lines: ScoreLine[],
  matchScore: number
): string {
  const strongest = [...lines]
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .slice(0, 3);

  const group =
    req.groupSize === 1
      ? "you"
      : req.travelerType === "parents"
        ? `you and your parents`
        : `your group of ${req.groupSize}`;

  const opener = `Recommended for ${group} because it starts at ${fmtTime(
    f.earliestStartMin ?? 0
  )}, runs ${fmtDuration(exp.durationMin)}, and gets you back with ${fmtDuration(
    req.availableMin - f.totalCommitmentMin
  )} of your window left.`;

  const money =
    exp.price === 0
      ? "There is no charge."
      : `At ₹${exp.price} a head — comfortably under your ₹${req.budgetPerPerson} per-person limit — it comes to ₹${
          exp.price * req.groupSize
        } for ${req.groupSize === 1 ? "you" : `all ${req.groupSize} of you`}.`;

  const character =
    req.preference === "popular"
      ? `${provider.name} is a well-reviewed operator with ${exp.reviewCount} visits logged.`
      : exp.localRelevance >= 80
        ? `${provider.name} scores ${exp.localRelevance}/100 on local relevance — ${exp.localRelevanceFactors
            .slice(0, 2)
            .join(" and ")
            .toLowerCase()}.`
        : `${provider.name} is a local operator with a ${exp.rating.toFixed(1)}★ rating.`;

  const drivers = `The score is driven mainly by ${strongest
    .map((l) => l.label.toLowerCase())
    .join(", ")}.`;

  return [opener, money, character, drivers].join(" ") + ` Match score ${matchScore}%.`;
}

/** Copy for the dynamic re-recommendation banner. */
export function replanMessage(
  changed: string,
  replacementName: string | null,
  score: number | null
): string {
  if (!replacementName)
    return `${changed} Nothing else in your window clears every constraint — try widening your time or budget.`;
  return `${changed} Re-running the match against your remaining time, budget and preferences puts ${replacementName} on top at ${score}%.`;
}
