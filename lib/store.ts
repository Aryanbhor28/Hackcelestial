import type { Booking, Experience, Lead, Provider, Review } from "@/lib/types";
import { todayIso } from "@/lib/engine/time";
import { EXPERIENCES } from "@/lib/data/experiences";
import { PROVIDERS } from "@/lib/data/providers";
import { BOOKINGS, LEADS, REVIEWS } from "@/lib/data/seed";

/**
 * In-process store. Deliberately swappable: every read/write in the app goes
 * through this module, so replacing it with Postgres/Prisma later touches only
 * this file. Cached on globalThis so Next's dev HMR does not reset bookings
 * mid-demo.
 */
interface Store {
  providers: Provider[];
  experiences: Experience[];
  bookings: Booking[];
  reviews: Review[];
  leads: Lead[];
  /** experienceIds knocked out for today by the "something changed" control */
  cancelledToday: Set<string>;
}

const g = globalThis as unknown as { __lx_store?: Store };

function create(): Store {
  return {
    providers: PROVIDERS.map((p) => ({ ...p })),
    experiences: EXPERIENCES.map((e) => ({ ...e })),
    bookings: BOOKINGS.map((b) => ({ ...b })),
    reviews: REVIEWS.map((r) => ({ ...r })),
    leads: LEADS.map((l) => ({ ...l })),
    cancelledToday: new Set<string>(),
  };
}

export const store: Store = (g.__lx_store ??= create());

export const resetStore = () => {
  g.__lx_store = create();
};

export const getProviders = () => store.providers;
export const getProvider = (id: string) =>
  store.providers.find((p) => p.providerId === id);

export const getExperiences = () => store.experiences;
export const getExperience = (id: string) =>
  store.experiences.find((e) => e.experienceId === id);

export const getBookings = () => store.bookings;
export const getBookingsForProvider = (providerId: string) =>
  store.bookings.filter((b) => b.providerId === providerId);

export const getReviewsFor = (experienceId: string) =>
  store.reviews.filter((r) => r.experienceId === experienceId);

export const getLeads = () => store.leads;

export const addExperience = (e: Experience) => {
  store.experiences.push(e);
  return e;
};

export const updateExperience = (id: string, patch: Partial<Experience>) => {
  const i = store.experiences.findIndex((e) => e.experienceId === id);
  if (i === -1) return undefined;
  store.experiences[i] = { ...store.experiences[i], ...patch };
  return store.experiences[i];
};

export const addBooking = (b: Booking) => {
  store.bookings.unshift(b);
  return b;
};

export const updateBooking = (id: string, patch: Partial<Booking>) => {
  const i = store.bookings.findIndex((b) => b.bookingId === id);
  if (i === -1) return undefined;
  store.bookings[i] = { ...store.bookings[i], ...patch };
  return store.bookings[i];
};

export const cancelToday = (experienceId: string) => {
  store.cancelledToday.add(experienceId);
  // only today's live bookings are affected; past, declined and already
  // cancelled bookings keep their state. The timestamp lets the traveler's
  // replanning work out how much of their window is left.
  const today = todayIso();
  const at = new Date().toISOString();
  store.bookings.forEach((b) => {
    if (
      b.experienceId === experienceId &&
      b.date === today &&
      (b.status === "pending" || b.status === "confirmed")
    ) {
      b.status = "cancelled";
      b.cancelledAt = at;
    }
  });
};

export const restoreToday = (experienceId: string) => {
  store.cancelledToday.delete(experienceId);
};

export const isCancelledToday = (experienceId: string) =>
  store.cancelledToday.has(experienceId);

export const cancelledTodayIds = () => Array.from(store.cancelledToday);
