import type {
  Category,
  ExperiencePreference,
  Mobility,
  Pace,
  TravelerType,
  TravelerRequest,
} from "./types";
import type { Extraction } from "./ai/intent";

/**
 * Profile, preferences and settings for the demo account system.
 *
 * Deliberately built on the SAME types the recommendation engine already uses
 * (Category, ExperiencePreference, Mobility, Pace, TravelerType) so saved
 * preferences can be handed to the engine without a translation layer.
 */

export interface ProfileInfo {
  phone: string;
  country: string;
  city: string;
  /** data URL, kept in localStorage — no upload infrastructure involved */
  avatar: string | null;
}

/** Extra access needs beyond the engine's single `mobility` axis. */
export type AccessNeed =
  | "step_free"
  | "seating"
  | "indoor"
  | "family_friendly"
  | "quiet";

export interface TravelPreferences {
  preference: ExperiencePreference;
  interests: Category[];
  budgetPerPerson: number;
  /** activity intensity */
  pace: Pace;
  /** walking preference / accessibility axis the engine filters on */
  mobility: Mobility;
  accessNeeds: AccessNeed[];
  /** who they usually travel with */
  travelerType: TravelerType;
  groupSize: number;
}

export type Theme = "system" | "light" | "dark";
export type Currency = "INR" | "USD" | "EUR";
export type Language = "en" | "hi";

export interface AppSettings {
  notifications: {
    bookingUpdates: boolean;
    availabilityChanges: boolean;
    tripReminders: boolean;
    recommendationUpdates: boolean;
    providerMessages: boolean;
  };
  privacy: {
    personalizedRecommendations: boolean;
    activityPersonalization: boolean;
    profileVisibility: "private" | "community";
  };
  appearance: {
    theme: Theme;
    reducedMotion: boolean;
  };
  locale: {
    currency: Currency;
    language: Language;
  };
}

export const DEFAULT_PROFILE: ProfileInfo = {
  phone: "",
  country: "",
  city: "",
  avatar: null,
};

export const DEFAULT_PREFERENCES: TravelPreferences = {
  preference: "prefer_local",
  interests: [],
  budgetPerPerson: 1500,
  pace: "balanced",
  mobility: "moderate",
  accessNeeds: [],
  travelerType: "couple",
  groupSize: 2,
};

export const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    bookingUpdates: true,
    availabilityChanges: true,
    tripReminders: true,
    recommendationUpdates: false,
    providerMessages: true,
  },
  privacy: {
    personalizedRecommendations: true,
    activityPersonalization: true,
    profileVisibility: "private",
  },
  appearance: {
    // light by default: dark is a deliberate opt-in, so existing users see no change
    theme: "light",
    reducedMotion: false,
  },
  locale: {
    currency: "INR",
    language: "en",
  },
};

/* ------------------------------------------------------------------ labels */

export const INTEREST_LABELS: { value: Category; label: string }[] = [
  { value: "food", label: "Local Food" },
  { value: "culture", label: "Culture & Heritage" },
  { value: "workshop", label: "Workshops" },
  { value: "nature", label: "Nature & Outdoors" },
  { value: "adventure", label: "Adventure" },
  { value: "event", label: "Events & Festivals" },
  { value: "wellness", label: "Relaxation" },
  { value: "shopping", label: "Shopping & Crafts" },
  { value: "nightlife", label: "Nightlife & Evenings" },
];

export const PREFERENCE_LABELS: {
  value: ExperiencePreference;
  label: string;
  hint: string;
}[] = [
  { value: "local_only", label: "Local only", hint: "Only experiences scoring 75+ on local relevance" },
  { value: "prefer_local", label: "Prefer local", hint: "Local character weighted up, not required" },
  { value: "no_preference", label: "No preference", hint: "Rank on fit alone" },
  { value: "popular", label: "Popular attractions", hint: "Favour well-established choices" },
];

export const MOBILITY_LABELS: { value: Mobility; label: string }[] = [
  { value: "low_walking", label: "Very little walking" },
  { value: "moderate", label: "Some walking is fine" },
  { value: "high", label: "Happy to be active" },
  { value: "wheelchair", label: "Step-free access needed" },
];

export const PACE_LABELS: { value: Pace; label: string; hint: string }[] = [
  { value: "relaxing", label: "Relaxed", hint: "Seated, slow, unhurried" },
  { value: "balanced", label: "Balanced", hint: "A mix of both" },
  { value: "energetic", label: "Energetic", hint: "Active and high-energy" },
];

export const TRAVELER_TYPE_LABELS: { value: TravelerType; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "family", label: "Family" },
  { value: "parents", label: "With parents" },
  { value: "friends", label: "Friends" },
  { value: "kids", label: "With kids" },
];

export const ACCESS_LABELS: { value: AccessNeed; label: string; hint: string }[] = [
  { value: "step_free", label: "Step-free access", hint: "Prefer venues the provider has confirmed as step-free" },
  { value: "seating", label: "Seating available", hint: "Somewhere to sit through the experience" },
  { value: "indoor", label: "Indoor / sheltered", hint: "Prefer experiences that are not weather-dependent" },
  { value: "family_friendly", label: "Family friendly", hint: "Suitable for older parents or children" },
  { value: "quiet", label: "Quiet setting", hint: "Prefer calm over crowds and noise" },
];

export const CURRENCY_LABELS: { value: Currency; label: string; symbol: string }[] = [
  { value: "INR", label: "Indian Rupee", symbol: "₹" },
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
];

export const LANGUAGE_LABELS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi)" },
];

/* ------------------------------------------------------------ completeness */

export interface CompletenessField {
  label: string;
  done: boolean;
}

/**
 * Real completion, computed from actual fields — never a hardcoded number.
 */
export function completeness(
  name: string,
  email: string,
  profile: ProfileInfo,
  prefs: TravelPreferences
): { percent: number; fields: CompletenessField[]; missing: string[] } {
  const fields: CompletenessField[] = [
    { label: "Name", done: name.trim().length > 1 },
    { label: "Email", done: email.trim().length > 3 },
    { label: "Phone number", done: profile.phone.trim().length >= 6 },
    { label: "Country", done: profile.country.trim().length > 1 },
    { label: "City", done: profile.city.trim().length > 1 },
    { label: "Profile photo", done: Boolean(profile.avatar) },
    { label: "Interests", done: prefs.interests.length > 0 },
    { label: "Experience preference", done: prefs.preference !== "prefer_local" || prefs.interests.length > 0 },
    { label: "Budget", done: prefs.budgetPerPerson > 0 },
    { label: "Walking preference", done: prefs.mobility !== "moderate" || prefs.accessNeeds.length > 0 },
    { label: "Travel group", done: prefs.travelerType !== "couple" || prefs.groupSize !== 2 },
  ];
  const done = fields.filter((f) => f.done).length;
  return {
    percent: Math.round((done / fields.length) * 100),
    fields,
    missing: fields.filter((f) => !f.done).map((f) => f.label),
  };
}

/* ----------------------------------------------------------- travel style */

export interface StyleBadge {
  label: string;
  hint: string;
}

/**
 * Derived purely from what the traveler actually selected. If they have
 * selected nothing, this returns an empty list rather than inventing a persona.
 */
export function travelStyle(prefs: TravelPreferences): StyleBadge[] {
  const out: StyleBadge[] = [];
  const has = (c: Category) => prefs.interests.includes(c);

  if (has("culture")) out.push({ label: "Culture seeker", hint: "Drawn to heritage, folk and tradition" });
  if (has("food")) out.push({ label: "Food explorer", hint: "Eats their way through a place" });
  if (has("workshop")) out.push({ label: "Maker", hint: "Would rather make something than watch it" });
  if (has("adventure")) out.push({ label: "Thrill seeker", hint: "Goes for the high-energy option" });
  if (has("nature")) out.push({ label: "Outdoors type", hint: "Happiest on a trail or by a river" });
  if (has("wellness") || prefs.pace === "relaxing")
    out.push({ label: "Slow traveler", hint: "Unhurried, restful days" });
  if (has("shopping")) out.push({ label: "Craft collector", hint: "Buys direct from makers" });
  if (has("event")) out.push({ label: "Festival goer", hint: "Plans around what's happening" });

  if (prefs.preference === "local_only")
    out.push({ label: "Local purist", hint: "Only genuinely local experiences" });
  else if (prefs.preference === "popular")
    out.push({ label: "Landmark first", hint: "Wants the well-known highlights" });

  if (prefs.mobility === "low_walking" || prefs.mobility === "wheelchair")
    out.push({ label: "Low-effort days", hint: "Little walking, close by" });

  return out.slice(0, 5);
}

/* ------------------------------------------- preferences -> discovery flow */

/**
 * Fills a traveler request with the account's saved preferences, but ONLY where
 * the person did not say something themselves.
 *
 * The extractor marks every field it resolved from the sentence as `explicit`
 * or `inferred`; anything still at `default` is a gap. Saved preferences fill
 * the gaps, so "I want popular tourist attractions" always beats a saved
 * "Local only", while an unmentioned budget falls back to the profile.
 */
export function applyProfileDefaults(
  request: TravelerRequest,
  extraction: Extraction | null,
  prefs: TravelPreferences | null,
  enabled: boolean
): { request: TravelerRequest; applied: string[] } {
  if (!prefs || !enabled) return { request, applied: [] };

  const next = { ...request };
  const applied: string[] = [];
  const isGap = (k: keyof Extraction) =>
    !extraction || extraction[k]?.confidence === "default";

  if (isGap("interests") && prefs.interests.length > 0) {
    next.interests = [...prefs.interests];
    applied.push("interests");
  }
  if (isGap("preference")) {
    next.preference = prefs.preference;
    applied.push("preference");
  }
  if (isGap("budgetPerPerson")) {
    next.budgetPerPerson = prefs.budgetPerPerson;
    applied.push("budgetPerPerson");
  }
  if (isGap("mobility")) {
    next.mobility = prefs.mobility;
    applied.push("mobility");
  }
  if (isGap("pace")) {
    next.pace = prefs.pace;
    applied.push("pace");
  }
  if (isGap("travelerType")) {
    next.travelerType = prefs.travelerType;
    applied.push("travelerType");
  }
  if (isGap("groupSize")) {
    next.groupSize = prefs.groupSize;
    applied.push("groupSize");
  }

  return { request: next, applied };
}

/** Human labels for the field keys reported by applyProfileDefaults. */
export const FIELD_LABELS: Record<string, string> = {
  interests: "interests",
  preference: "experience preference",
  budgetPerPerson: "budget",
  mobility: "walking preference",
  pace: "pace",
  travelerType: "travel group",
  groupSize: "group size",
  availableMin: "time available",
  startMin: "start time",
  location: "location",
};

export const currencySymbol = (c: Currency) =>
  CURRENCY_LABELS.find((x) => x.value === c)?.symbol ?? "₹";
