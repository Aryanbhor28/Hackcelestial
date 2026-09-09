import type { Experience, ItineraryItem } from "@/lib/types";

export const clampMin = (m: number) => Math.max(0, Math.min(24 * 60 - 1, m));

export function fmtTime(min: number): string {
  const m = clampMin(Math.round(min));
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function fmtDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} hr` : `${h} hr ${r} min`;
}

export function dayOfWeek(isoDate: string): number {
  // parse as local midnight so the weekday matches what the traveler sees
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getDay();
}

export function todayIso(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate()
  ).padStart(2, "0")}`;
}

export function nowMin(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

/**
 * Earliest start time on `date` at which the experience can begin, given the
 * traveler cannot arrive before `arriveAtMin` and the activity must finish
 * before the slot closes.
 */
export function earliestStart(
  exp: Experience,
  date: string,
  arriveAtMin: number
): number | null {
  const day = dayOfWeek(date);
  let best: number | null = null;
  for (const s of exp.slots) {
    if (!s.days.includes(day)) continue;
    const start = Math.max(s.startMin, arriveAtMin);
    // the slot's endMin is the last time a session may *start*
    if (start > s.endMin) continue;
    if (best === null || start < best) best = start;
  }
  return best;
}

/** All startable times for a slot, on a 30-minute grid, for the booking UI. */
export function startOptions(exp: Experience, date: string): number[] {
  const day = dayOfWeek(date);
  const out: number[] = [];
  for (const s of exp.slots) {
    if (!s.days.includes(day)) continue;
    const first = Math.ceil(s.startMin / 30) * 30;
    for (let t = first; t <= s.endMin; t += 30) out.push(t);
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

export function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function itineraryConflict(
  items: ItineraryItem[],
  startMin: number,
  endMin: number
): ItineraryItem | undefined {
  return items.find((i) => overlaps(startMin, endMin, i.startMin, i.endMin));
}
