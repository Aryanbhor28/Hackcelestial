import { NextResponse } from "next/server";
import type { TravelerRequest } from "@/lib/types";
import { recommend } from "@/lib/engine/recommend";
import { defaultRequest } from "@/lib/ai/intent";
import { cancelledTodayIds } from "@/lib/store";

export async function POST(req: Request) {
  const body = (await req.json()) as { request?: Partial<TravelerRequest> };
  const full: TravelerRequest = { ...defaultRequest(), ...(body.request ?? {}) };
  const result = recommend(full, 10);
  return NextResponse.json({ ...result, cancelledToday: cancelledTodayIds() });
}
