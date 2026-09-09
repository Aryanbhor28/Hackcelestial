import { NextResponse } from "next/server";
import { cancelToday, cancelledTodayIds, restoreToday } from "@/lib/store";

/**
 * The "something changed" hook. A provider cancelling today, a slot closing, a
 * washed-out afternoon - all of it lands here and forces the traveler's next
 * recommendation call to be recomputed against reality.
 */
export async function POST(req: Request) {
  const { experienceId, action } = (await req.json()) as {
    experienceId: string;
    action: "cancel" | "restore";
  };

  if (action === "cancel") cancelToday(experienceId);
  else restoreToday(experienceId);

  return NextResponse.json({ cancelledToday: cancelledTodayIds() });
}
