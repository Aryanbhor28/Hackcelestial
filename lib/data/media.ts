import type { Category } from "@/lib/types";

/**
 * Photography for the pilot.
 *
 * These are representative Creative Commons photographs of the Kullu valley and
 * its food and crafts — they are NOT photographs of the individual providers.
 * Real listings carry provider-supplied images; anything without a verified
 * photo falls back to the generated gradient art rather than borrowing a
 * picture of somewhere else.
 */

export const PHOTO = {
  hero: "/images/hero.jpg", // Beas river, Kullu Valley
  temple: "/images/temple.jpg", // Hidimba Devi Temple, Dhungri, Manali
  food: "/images/food.jpg", // Indian thali
  river: "/images/river.jpg", // rafting on the Beas
  streetfood: "/images/streetfood.jpg", // tandoori momos
  trek: "/images/trek.jpg", // walking trail, Kullu Manali
  folk: "/images/folk.jpg", // Himachali Nati
} as const;

/** Per-experience overrides, used where the subject genuinely matches. */
const BY_EXPERIENCE: Record<string, string> = {
  x_bazaar: PHOTO.streetfood,
  x_thukpa: PHOTO.streetfood,
  x_heritage_walk: PHOTO.temple,
  x_aarti: PHOTO.temple,
  x_naggar_castle: PHOTO.temple,
  x_rafting: PHOTO.river,
  x_river_cafe_walk: PHOTO.river,
  x_dham: PHOTO.food,
  x_cooking: PHOTO.food,
  x_trout: PHOTO.food,
  x_hamta: PHOTO.trek,
  x_village_walk: PHOTO.trek,
  x_herbal_walk: PHOTO.trek,
  x_nati: PHOTO.folk,
  x_folk_festival: PHOTO.folk,
};

/** Category-level fallback, only where we have an honest match. */
const BY_CATEGORY: Partial<Record<Category, string>> = {
  food: PHOTO.food,
  culture: PHOTO.temple,
  adventure: PHOTO.trek,
  nature: PHOTO.trek,
};

/** Returns a photo path, or null to fall back to generated gradient art. */
export function photoFor(experienceId: string, category: Category): string | null {
  return BY_EXPERIENCE[experienceId] ?? BY_CATEGORY[category] ?? null;
}
