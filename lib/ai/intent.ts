import type {
  Category,
  ExperiencePreference,
  Mobility,
  Pace,
  TravelerRequest,
  TravelerType,
} from "@/lib/types";
import { nowMin, todayIso } from "@/lib/engine/time";

/** Manali Mall Road - the default "where I am standing" for the pilot city. */
export const MANALI = { lat: 32.2396, lng: 77.1887, name: "Manali" };

export interface ExtractedField<T> {
  value: T;
  /** what in the traveler's sentence produced this */
  evidence: string | null;
  confidence: "explicit" | "inferred" | "default";
}

export interface Extraction {
  location: ExtractedField<string>;
  availableMin: ExtractedField<number>;
  startMin: ExtractedField<number>;
  budgetPerPerson: ExtractedField<number>;
  groupSize: ExtractedField<number>;
  travelerType: ExtractedField<TravelerType>;
  interests: ExtractedField<Category[]>;
  preference: ExtractedField<ExperiencePreference>;
  mobility: ExtractedField<Mobility>;
  pace: ExtractedField<Pace>;
}

const CATEGORY_WORDS: Record<Category, string[]> = {
  culture: ["cultur", "heritage", "folk", "tradition", "temple", "history", "art", "music", "dance", "craft show", "performance", "puppet"],
  food: ["food", "eat", "meal", "cuisine", "dinner", "lunch", "thali", "dham", "taste", "tasting", "foodie", "street food", "coffee", "cafe"],
  adventure: ["adventure", "trek", "hike", "raft", "paraglid", "thrill", "adrenalin", "ski", "zipline", "bike", "ride", "climb"],
  workshop: ["workshop", "class", "learn", "hands on", "hands-on", "pottery", "cooking class", "weaving", "painting", "carving", "make something", "craft"],
  nature: ["nature", "outdoor", "forest", "walk", "scenery", "views", "river", "orchard", "farm", "birds", "stars", "stargaz"],
  wellness: ["wellness", "spa", "massage", "yoga", "meditat", "relax", "unwind", "hot spring", "calm", "quiet"],
  shopping: ["shop", "buy", "market", "souvenir", "shawl", "bazaar"],
  nightlife: ["nightlife", "night out", "live music", "bar", "party", "late night", "drinks"],
  event: ["festival", "event", "fair", "celebration", "mela"],
};

const num = (s: string) => Number(s.replace(/[, ]/g, ""));

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, a: 1, an: 1, couple: 2, half: 0.5,
};

function findNumber(token: string): number | null {
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token);
  return WORD_NUMBERS[token.toLowerCase()] ?? null;
}

function snippet(text: string, index: number, len = 42): string {
  const start = Math.max(0, index - 12);
  return text.slice(start, Math.min(text.length, start + len)).trim();
}

/**
 * Rule-based intent extraction. Handles the phrasings travelers actually use
 * for time, money, group and constraints, and reports what evidence produced
 * each field so the UI can show its work.
 */
export function extractIntent(raw: string): Extraction {
  const text = raw.toLowerCase();

  /**
   * Spans already consumed as a time, mobility or pace signal. They are blanked
   * out before interest matching so "before dinner" is not read as a food
   * interest and "not much walking" is not read as a nature interest.
   */
  const consumed: [number, number][] = [];
  const consume = (m: RegExpMatchArray | null) => {
    if (m?.index !== undefined) consumed.push([m.index, m.index + m[0].length]);
    return m;
  };
  const maskConsumed = () => {
    const chars = text.split("");
    for (const [a, b] of consumed) for (let i = a; i < b && i < chars.length; i++) chars[i] = " ";
    return chars.join("");
  };

  const def = <T,>(value: T): ExtractedField<T> => ({
    value,
    evidence: null,
    confidence: "default",
  });

  const out: Extraction = {
    location: def(MANALI.name),
    availableMin: def(180),
    startMin: def(Math.max(nowMin(), 9 * 60)),
    budgetPerPerson: def(1500),
    groupSize: def(2),
    travelerType: def("couple" as TravelerType),
    interests: def([] as Category[]),
    preference: def("prefer_local" as ExperiencePreference),
    mobility: def("moderate" as Mobility),
    pace: def("balanced" as Pace),
  };

  // ---- available time: "2 hours", "90 minutes", "half a day", "a couple of hours"
  const timeRe = /(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple(?:\s+of)?|half\s+a)\s*(hours?|hrs?|h\b|minutes?|mins?|day)/;
  const tm = consume(text.match(timeRe));
  // meal words used as time anchors are never interests
  consume(text.match(/\b(?:before|after|until|till|by)\s+(?:dinner|lunch|breakfast|supper)\b/));
  if (tm) {
    const qty = tm[1].startsWith("couple") ? 2 : tm[1].startsWith("half") ? 0.5 : findNumber(tm[1]) ?? 1;
    const unit = tm[2];
    const minutes = /min/.test(unit) ? qty : /day/.test(unit) ? qty * 8 * 60 : qty * 60;
    out.availableMin = {
      value: Math.round(minutes),
      evidence: snippet(raw, tm.index ?? 0),
      confidence: "explicit",
    };
  }
  const dayPhrase = consume(text.match(/\b(?:whole|full|entire|all)[- ]day\b|\bhalf[- ]a?[- ]?day\b/));
  if (dayPhrase) {
    const half = /half/.test(dayPhrase[0]);
    out.availableMin = {
      value: half ? 240 : 480,
      evidence: snippet(raw, dayPhrase.index ?? 0),
      confidence: "explicit",
    };
  }
  if (/before dinner/.test(text) && !tm && !dayPhrase) {
    out.availableMin = { value: 150, evidence: "before dinner", confidence: "inferred" };
  }

  // ---- start time: "at 4pm", "from 4", "this evening", "tomorrow morning"
  const clock = text.match(/\b(?:at|from|by|around)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (clock) {
    let h = Number(clock[1]);
    const mm = Number(clock[2] ?? 0);
    const mer = clock[3];
    if (mer === "pm" && h < 12) h += 12;
    if (!mer && h <= 8) h += 12; // "from 4" in a travel context means 4pm
    out.startMin = { value: h * 60 + mm, evidence: snippet(raw, clock.index ?? 0), confidence: "explicit" };
  } else if (/\bmorning\b/.test(text)) {
    out.startMin = { value: 9 * 60, evidence: "morning", confidence: "inferred" };
  } else if (/\bafternoon\b/.test(text)) {
    out.startMin = { value: 14 * 60, evidence: "afternoon", confidence: "inferred" };
  } else if (/\bevening\b|before dinner/.test(text)) {
    out.startMin = { value: 17 * 60, evidence: /evening/.test(text) ? "evening" : "before dinner", confidence: "inferred" };
  } else if (/\bnight\b/.test(text)) {
    out.startMin = { value: 20 * 60, evidence: "night", confidence: "inferred" };
  } else if (/\btomorrow\b/.test(text) || out.availableMin.value >= 360) {
    // a day-long window starting from the current clock time is nonsense
    out.startMin = {
      value: 9 * 60,
      evidence: /\btomorrow\b/.test(text) ? "tomorrow" : "a full day needs a morning start",
      confidence: "inferred",
    };
  }

  // ---- budget: "₹800", "800 rupees", "under 1000 each", "budget of 2k"
  const money = text.match(/(?:₹|rs\.?\s*|inr\s*)\s*(\d[\d,]*)(k\b)?|\b(\d[\d,]*)(k)?\s*(?:rupees|rs\b|bucks|per person|each|pp\b)/);
  if (money) {
    const rawNum = money[1] ?? money[3];
    const isK = Boolean(money[2] ?? money[4]);
    if (rawNum) {
      const value = num(rawNum) * (isK ? 1000 : 1);
      out.budgetPerPerson = {
        value,
        evidence: snippet(raw, money.index ?? 0),
        confidence: "explicit",
      };
    }
  }
  if (/\bcheap|budget|tight budget|not expensive|low cost\b/.test(text) && out.budgetPerPerson.confidence === "default") {
    out.budgetPerPerson = { value: 500, evidence: "budget-conscious wording", confidence: "inferred" };
  }
  if (/\bsplurge|no budget limit|money is no|premium\b/.test(text)) {
    out.budgetPerPerson = { value: 5000, evidence: "no budget constraint mentioned", confidence: "inferred" };
  }

  // ---- group & traveler type
  const people = text.match(/\b(\d+|two|three|four|five|six|seven|eight|nine|ten)\s*(?:people|persons?|of us|adults|guests|pax)\b/);
  if (people) {
    out.groupSize = {
      value: findNumber(people[1]) ?? 2,
      evidence: snippet(raw, people.index ?? 0),
      confidence: "explicit",
    };
  }

  const typeRules: [RegExp, TravelerType, number][] = [
    [/\bmy parents\b|\bwith parents\b|\bmy mother\b|\bmy father\b|\bmum\b|\bdad\b/, "parents", 3],
    [/\bmy kids\b|\bchildren\b|\bmy son\b|\bmy daughter\b|\btoddler\b/, "kids", 4],
    [/\bfamily\b/, "family", 4],
    [/\bmy wife\b|\bmy husband\b|\bmy partner\b|\bgirlfriend\b|\bboyfriend\b|\bhoneymoon\b|\bwe are a couple\b/, "couple", 2],
    [/\bfriends\b|\bmates\b|\bcolleagues\b/, "friends", 4],
    [/\bsolo\b|\balone\b|\bby myself\b|\bjust me\b|\bi am travelling alone\b/, "solo", 1],
  ];
  for (const [re, type, size] of typeRules) {
    const m = text.match(re);
    if (m) {
      out.travelerType = { value: type, evidence: snippet(raw, m.index ?? 0), confidence: "explicit" };
      if (out.groupSize.confidence === "default")
        out.groupSize = { value: size, evidence: snippet(raw, m.index ?? 0), confidence: "inferred" };
      break;
    }
  }

  // ---- experience preference
  if (/\bonly local\b|\bauthentic only\b|\bnothing touristy\b|\bno tourist traps?\b/.test(text)) {
    out.preference = { value: "local_only", evidence: "asked for local only", confidence: "explicit" };
  } else if (/\blocal\b|\bauthentic\b|\bhidden\b|\boff the beaten\b|\bnon-?touristy\b/.test(text)) {
    out.preference = { value: "prefer_local", evidence: "mentioned local/authentic", confidence: "explicit" };
  } else if (/\bfamous\b|\bmust see\b|\bmust-see\b|\bpopular\b|\btop attractions?\b|\bmain sights?\b/.test(text)) {
    out.preference = { value: "popular", evidence: "asked for popular attractions", confidence: "explicit" };
  } else if (/\bdon'?t want (?:a )?local\b|\bnot interested in local\b/.test(text)) {
    out.preference = { value: "no_preference", evidence: "ruled out a local-only focus", confidence: "explicit" };
  }

  // ---- mobility
  const wheel = consume(text.match(/\bwheelchair\b|\bstep-?free\b|\bcan'?t climb stairs\b/));
  const lowWalk = consume(
    text.match(
      /\b(?:no|not|hardly any|barely any)\s+(?:much|a lot of|lots of)?\s*walking\b|\bdon'?t want (?:to do )?(?:a lot of |much |lots of )?walking\b|\bminimal walking\b|\blittle walking\b|\bbad knees?\b|\bcan'?t walk (?:much|far)\b|\belderly\b|\bsenior\b/
    )
  );
  const highWalk = consume(
    text.match(/\blots of walking\b|\bvery active\b|\bstrenuous\b|\bchallenging\b|\bphysical\b/)
  );

  if (wheel) {
    out.mobility = { value: "wheelchair", evidence: "wheelchair access needed", confidence: "explicit" };
  } else if (lowWalk) {
    out.mobility = { value: "low_walking", evidence: "asked to avoid walking", confidence: "explicit" };
  } else if (highWalk) {
    out.mobility = { value: "high", evidence: "wants something physical", confidence: "explicit" };
  } else if (out.travelerType.value === "parents") {
    out.mobility = { value: "low_walking", evidence: "travelling with parents", confidence: "inferred" };
  }

  // ---- pace
  const calmWord = consume(
    text.match(/\brelax\w*|\bchill\w*|\bcalm\b|\bslow\b|\bunwind\b|\bpeaceful\b|\bquiet\b/)
  );
  const fastWord = consume(
    text.match(/\bthrill\w*|\bexciting\b|\benerg\w*|\badrenalin\w*|\bfast[- ]paced\b/)
  );
  if (calmWord) {
    out.pace = { value: "relaxing", evidence: "asked for something relaxing", confidence: "explicit" };
  } else if (fastWord) {
    out.pace = { value: "energetic", evidence: "asked for something energetic", confidence: "explicit" };
  }

  // ---- interests (over text with constraint phrases blanked out)
  const masked = maskConsumed();
  const found: Category[] = [];
  let interestEvidence: string | null = null;
  (Object.keys(CATEGORY_WORDS) as Category[]).forEach((cat) => {
    for (const w of CATEGORY_WORDS[cat]) {
      const i = masked.indexOf(w);
      if (i !== -1) {
        if (!found.includes(cat)) found.push(cat);
        if (!interestEvidence) interestEvidence = snippet(raw, i);
        break;
      }
    }
  });
  if (found.length) {
    out.interests = { value: found, evidence: interestEvidence, confidence: "explicit" };
  }

  // ---- location (pilot city only, but read it back if they named it)
  const loc = text.match(/\b(?:in|at|near|around)\s+(manali|old manali|vashisht|naggar|solang|kullu|jagatsukh|prini|sethan)\b/);
  if (loc) {
    out.location = {
      value: loc[1].replace(/\b\w/g, (c) => c.toUpperCase()),
      evidence: snippet(raw, loc.index ?? 0),
      confidence: "explicit",
    };
  }

  return out;
}

export function toRequest(e: Extraction, raw: string): TravelerRequest {
  return {
    location: e.location.value,
    date: todayIso(),
    startMin: e.startMin.value,
    availableMin: e.availableMin.value,
    budgetPerPerson: e.budgetPerPerson.value,
    groupSize: e.groupSize.value,
    travelerType: e.travelerType.value,
    interests: e.interests.value,
    preference: e.preference.value,
    mobility: e.mobility.value,
    pace: e.pace.value,
    rawText: raw,
    lat: MANALI.lat,
    lng: MANALI.lng,
    itinerary: [],
    excludedIds: [],
  };
}

export function defaultRequest(): TravelerRequest {
  return toRequest(extractIntent(""), "");
}
