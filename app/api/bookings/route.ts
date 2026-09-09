import { NextResponse } from "next/server";
import type { Booking } from "@/lib/types";
import { addBooking, getBookings, getExperience } from "@/lib/store";
import { todayIso } from "@/lib/engine/time";

export async function GET() {
  return NextResponse.json({ bookings: getBookings() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    experienceId: string;
    guests: number;
    startMin: number;
    date?: string;
    travelerName?: string;
  };

  const exp = getExperience(body.experienceId);
  if (!exp) return NextResponse.json({ error: "Unknown experience" }, { status: 404 });
  if (body.guests > exp.capacity)
    return NextResponse.json({ error: "Over capacity" }, { status: 409 });

  const booking: Booking = {
    bookingId: `b_${Math.random().toString(36).slice(2, 9)}`,
    experienceId: exp.experienceId,
    providerId: exp.providerId,
    travelerName: body.travelerName?.trim() || "Guest traveler",
    date: body.date ?? todayIso(),
    startMin: body.startMin,
    guests: body.guests,
    totalPrice: exp.price * body.guests,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  addBooking(booking);
  return NextResponse.json({ booking });
}
