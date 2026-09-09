import { NextResponse } from "next/server";
import type { Category, Experience, TravelerType } from "@/lib/types";
import { addExperience, getExperiences, updateExperience } from "@/lib/store";
import { ALL_DAYS } from "@/lib/data/experiences";
import { classify } from "@/lib/ai/classify";

export async function GET() {
  return NextResponse.json({ experiences: getExperiences() });
}

/** Provider onboarding: a new listing arrives in the same shape as seeded supply. */
export async function POST(req: Request) {
  const b = (await req.json()) as {
    providerId: string;
    name: string;
    category: Category;
    description: string;
    price: number;
    durationMin: number;
    area: string;
    lat?: number;
    lng?: number;
    capacity: number;
    fromMin: number;
    toMin: number;
    days?: number[];
    mobility?: Experience["mobility"];
    indoor?: boolean;
    wheelchairAccessible?: boolean;
    suitableFor?: TravelerType[];
  };

  const inferred = classify(`${b.name}. ${b.description}`, b.category);

  const exp: Experience = {
    experienceId: `x_${Math.random().toString(36).slice(2, 9)}`,
    providerId: b.providerId,
    name: b.name,
    category: b.category,
    tags: inferred.tags,
    description: b.description,
    price: Number(b.price),
    durationMin: Number(b.durationMin),
    lat: b.lat ?? 32.2396,
    lng: b.lng ?? 77.1887,
    area: b.area,
    slots: [{ days: b.days ?? ALL_DAYS, startMin: b.fromMin, endMin: b.toMin }],
    capacity: Number(b.capacity),
    minGroup: 1,
    mobility: b.mobility ?? inferred.mobility,
    wheelchairAccessible: b.wheelchairAccessible ?? false,
    indoor: b.indoor ?? inferred.indoor,
    suitableFor: b.suitableFor?.length
      ? b.suitableFor
      : ["solo", "couple", "family", "friends", "parents"],
    languages: ["Hindi", "English"],
    localRelevance: inferred.localRelevance,
    localRelevanceFactors: inferred.localRelevanceFactors,
    rating: 0,
    reviewCount: 0,
    source: "provider_registration",
    verification: "pending",
    art: inferred.art,
    glyph: inferred.glyph,
    active: true,
  };

  addExperience(exp);
  return NextResponse.json({ experience: exp, classification: inferred });
}

export async function PATCH(req: Request) {
  const { experienceId, ...patch } = (await req.json()) as {
    experienceId: string;
  } & Partial<Experience>;
  const updated = updateExperience(experienceId, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ experience: updated });
}
