import { NextResponse } from "next/server";
import type { BookingStatus } from "@/lib/types";
import { updateBooking } from "@/lib/store";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { status } = (await req.json()) as { status: BookingStatus };
  const updated = updateBooking(id, { status });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ booking: updated });
}
