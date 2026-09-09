import type { Category, Experience } from "@/lib/types";

/**
 * Listing classification. Takes provider free text and derives the structured
 * metadata the engine needs - tags, mobility demand, indoor/outdoor and a
 * transparent local-relevance score.
 *
 * The local relevance score is a stated platform methodology, not a measurement:
 * signals are additive, each one is named back to the provider and the traveler,
 * and the score is always shown with the factors that produced it.
 */

const SIGNALS: { re: RegExp; points: number; factor: string }[] = [
  { re: /\bfamily(-| )(run|owned)|our family|my family|home kitchen|in our home|courtyard/i, points: 22, factor: "Family-owned and hosted" },
  { re: /\btraditional|heritage|folk|ancestral|generations?\b/i, points: 18, factor: "Living local tradition" },
  { re: /\bvillage|community|collective|cooperative|panchayat|neighbourhood/i, points: 16, factor: "Community-embedded" },
  { re: /\blocally sourced|from our (farm|orchard|terrace|garden)|grown here|river clay|local (clay|wool|wood|herbs)/i, points: 14, factor: "Locally sourced materials" },
  { re: /\bhimachali|kullu|pahari|gaddi|tibetan|manali\b/i, points: 12, factor: "Region-specific to the Kullu valley" },
  { re: /\bhandmade|handloom|artisan|craftsman|carver|weaver|potter|painter/i, points: 12, factor: "Practising local artisan" },
  { re: /\bteach|learn|demonstrat|hands[- ]on|workshop/i, points: 6, factor: "Knowledge shared directly by the maker" },
  { re: /\bsmall group|limited to|capped at|intimate/i, points: 6, factor: "Small-group, low-impact format" },
];

const NEGATIVE: { re: RegExp; points: number; factor: string }[] = [
  { re: /\bchain|franchise|branches across|nationwide/i, points: -30, factor: "Chain or franchise operation" },
  { re: /\bpackage tour|bulk booking|large groups? of \d{2,}|coach party/i, points: -18, factor: "High-volume packaged tourism" },
  { re: /\bimported|international standard|global brand/i, points: -12, factor: "Non-local sourcing or branding" },
];

const CATEGORY_BASE: Record<Category, number> = {
  culture: 55,
  workshop: 52,
  food: 50,
  nature: 42,
  event: 55,
  shopping: 38,
  wellness: 34,
  nightlife: 30,
  adventure: 28,
};

const ART: Record<Category, { art: [string, string]; glyph: string }> = {
  culture: { art: ["#7c3aed", "#db2777"], glyph: "🎭" },
  food: { art: ["#f97316", "#dc2626"], glyph: "🍲" },
  adventure: { art: ["#0ea5e9", "#1d4ed8"], glyph: "🏔" },
  workshop: { art: ["#d97706", "#92400e"], glyph: "🏺" },
  nature: { art: ["#10b981", "#047857"], glyph: "🌲" },
  wellness: { art: ["#14b8a6", "#0891b2"], glyph: "🧘" },
  shopping: { art: ["#f43f5e", "#a21caf"], glyph: "🧶" },
  nightlife: { art: ["#6366f1", "#1e1b4b"], glyph: "🎶" },
  event: { art: ["#eab308", "#ea580c"], glyph: "🎪" },
};

const TAG_RULES: [RegExp, string][] = [
  [/\bhands[- ]on|\bmake\b|\bcraft\b/i, "hands on"],
  [/\bindoor|inside|room|studio|courtyard/i, "indoor"],
  [/\bfamily|children|kids/i, "family"],
  [/\bquiet|calm|slow|peaceful/i, "quiet"],
  [/\bevening|sunset|night/i, "evening"],
  [/\bmorning|sunrise|dawn/i, "morning"],
  [/\bfood|eat|meal|taste|tasting/i, "tasting"],
  [/\bwalk|trek|hike/i, "walking"],
  [/\bbeginner|no experience|first time/i, "beginner friendly"],
  [/\bthrill|adrenalin|jump|fly|raft/i, "thrill"],
];

export interface Classification {
  tags: string[];
  mobility: Experience["mobility"];
  indoor: boolean;
  localRelevance: number;
  localRelevanceFactors: string[];
  art: [string, string];
  glyph: string;
  /** shown to the provider so the score is never a black box */
  breakdown: { factor: string; points: number }[];
}

export function classify(text: string, category: Category): Classification {
  const breakdown: { factor: string; points: number }[] = [
    { factor: `Base for ${category} experiences`, points: CATEGORY_BASE[category] },
  ];
  let score = CATEGORY_BASE[category];

  for (const s of [...SIGNALS, ...NEGATIVE]) {
    if (s.re.test(text)) {
      score += s.points;
      breakdown.push({ factor: s.factor, points: s.points });
    }
  }
  score = Math.max(5, Math.min(99, score));

  const tags = TAG_RULES.filter(([re]) => re.test(text)).map(([, t]) => t);

  const mobility: Experience["mobility"] = /\btrek|hike|climb|steep|strenuous|raft|ski/i.test(text)
    ? "high"
    : /\bseated|sitting|indoor|no walking|minimal walking|courtyard|studio/i.test(text)
      ? "low_walking"
      : "moderate";

  return {
    tags: tags.length ? tags : [category],
    mobility,
    indoor: /\bindoor|inside|room|studio|kitchen|hall/i.test(text),
    localRelevance: score,
    localRelevanceFactors: breakdown
      .filter((b) => b.points > 0 && !b.factor.startsWith("Base for"))
      .map((b) => b.factor)
      .slice(0, 4),
    art: ART[category].art,
    glyph: ART[category].glyph,
    breakdown,
  };
}
