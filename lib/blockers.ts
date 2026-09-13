import type { RecommendationResult, TravelerRequest } from "./types";
import { fmtDuration, fmtTime } from "./engine/time";

/**
 * Explains an empty result using the engine's own rejections, and offers only
 * relaxations the engine can actually act on. Shared by the match screen and
 * the replanning flow so the reasoning is identical on both.
 */

export type Bucket = "time" | "budget" | "access" | "local" | "group" | "other";

/** Groups the engine's real hard-filter rule names by the traveler constraint behind them. */
export const BUCKET_OF: Record<string, Bucket> = {
  "Will not fit your time": "time",
  "No session in your window": "time",
  "Over budget": "budget",
  "Too physically demanding": "access",
  "Not wheelchair accessible": "access",
  "Not local enough": "local",
  "Group too large": "group",
  "Minimum group not met": "group",
};

export interface Blocker {
  bucket: Bucket | null;
  count: number;
  text: string | null;
}

/**
 * The constraint that ruled out the most experiences. The engine records the
 * first rule each experience failed, so counts are first-failure counts.
 */
export function dominantBlocker(
  result: RecommendationResult,
  req: TravelerRequest,
  opts: { remaining?: boolean } = {}
): Blocker {
  const N = result.consideredCount;
  const bucketCount = new Map<Bucket, number>();
  const ruleCount = new Map<string, number>();
  for (const r of result.rejected) {
    const b = BUCKET_OF[r.rule] ?? "other";
    bucketCount.set(b, (bucketCount.get(b) ?? 0) + 1);
    ruleCount.set(r.rule, (ruleCount.get(r.rule) ?? 0) + 1);
  }
  const top = [...bucketCount.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return { bucket: null, count: 0, text: null };

  const [lead, n] = top;
  const topOtherRule = [...ruleCount.entries()]
    .filter(([rule]) => !BUCKET_OF[rule])
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const text =
    lead === "time"
      ? opts.remaining
        ? `Your remaining ${fmtDuration(req.availableMin)} (from ${fmtTime(req.startMin)}) is the biggest blocker — it ruled out ${n} of ${N} experiences that run too long or have no session you can still reach.`
        : `Your ${fmtDuration(req.availableMin)} window from ${fmtTime(req.startMin)} is the biggest blocker — it ruled out ${n} of ${N} experiences that run too long or have no session you can reach in time.`
      : lead === "budget"
        ? `Your ₹${req.budgetPerPerson} per-person budget is the biggest blocker — it ruled out ${n} of ${N} experiences.`
        : lead === "access"
          ? `Your walking and access needs are the biggest blocker — they ruled out ${n} of ${N} experiences.`
          : lead === "local"
            ? `Asking for local-only is the biggest blocker — it ruled out ${n} of ${N} experiences scoring under 75 on local relevance.`
            : lead === "group"
              ? `Your group of ${req.groupSize} is the biggest blocker — it ruled out ${n} of ${N} experiences.`
              : `${n} of ${N} experiences were ruled out, most often because: “${topOtherRule ?? "unavailable"}”.`;

  return { bucket: lead, count: n, text };
}

export interface Relaxation {
  key: string;
  bucket: Bucket;
  label: string;
  headline: string;
  mutate: (r: TravelerRequest) => TravelerRequest;
}

/**
 * Relaxations the engine can act on, with the one targeting the real blocker
 * first. Never offers to drop a step-free requirement — only an easy-walking
 * preference.
 */
export function relaxations(req: TravelerRequest, lead: Bucket | null): Relaxation[] {
  const out: Relaxation[] = [];
  if (req.mobility === "low_walking")
    out.push({
      key: "walk",
      bucket: "access",
      label: "Relax walking preference",
      headline: "Relaxed your walking preference.",
      mutate: (r) => ({ ...r, mobility: "moderate" }),
    });
  out.push({
    key: "budget",
    bucket: "budget",
    label: "Increase budget by ₹500",
    headline: "Raised your budget by ₹500.",
    mutate: (r) => ({ ...r, budgetPerPerson: r.budgetPerPerson + 500 }),
  });
  out.push({
    key: "time",
    bucket: "time",
    label: "Extend available time by 1 hour",
    headline: "Gave yourself an extra hour.",
    mutate: (r) => ({ ...r, availableMin: r.availableMin + 60 }),
  });
  if (req.preference === "local_only")
    out.push({
      key: "local",
      bucket: "local",
      label: "Allow less local options",
      headline: "Relaxed local-only to prefer local.",
      mutate: (r) => ({ ...r, preference: "prefer_local" }),
    });
  if (req.interests.length)
    out.push({
      key: "type",
      bucket: "other",
      label: "Any experience type",
      headline: "Opened up to any experience type.",
      mutate: (r) => ({ ...r, interests: [] }),
    });
  if (req.excludedIds.length)
    out.push({
      key: "reset",
      bucket: "other",
      label: "Reset exclusions",
      headline: "Cleared your exclusions.",
      mutate: (r) => ({ ...r, excludedIds: [] }),
    });
  return out.sort((a, b) => Number(b.bucket === lead) - Number(a.bucket === lead));
}
