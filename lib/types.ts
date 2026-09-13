// Core domain model. Kept framework-free so the engine can be reused or moved
// behind a real service boundary later without touching the UI.

export type Category =
  | "culture"
  | "food"
  | "adventure"
  | "workshop"
  | "nature"
  | "wellness"
  | "shopping"
  | "nightlife"
  | "event";

export type TravelerType =
  | "solo"
  | "couple"
  | "family"
  | "friends"
  | "parents"
  | "kids";

export type ExperiencePreference =
  | "local_only"
  | "prefer_local"
  | "no_preference"
  | "popular";

export type Mobility = "low_walking" | "moderate" | "high" | "wheelchair";

export type Pace = "relaxing" | "balanced" | "energetic";

export type DiscoverySource =
  | "provider_registration"
  | "community_referral"
  | "hotel_referral"
  | "guide_referral"
  | "places_api"
  | "event_api"
  | "youtube"
  | "traveler_suggestion";

export type VerificationStatus = "verified" | "pending" | "candidate";

export interface VerificationEvidence {
  phoneVerified: boolean;
  identityVerified: boolean;
  locationVerified: boolean;
  detailsConfirmedByProvider: boolean;
  localReference?: string;
  permitsOnFile?: string[];
  lastVerifiedAt?: string; // ISO date
}

export interface Provider {
  providerId: string;
  name: string;
  owner: string;
  phone: string;
  area: string;
  verification: VerificationStatus;
  evidence: VerificationEvidence;
  rating: number;
  reviewCount: number;
  joinedVia: DiscoverySource;
  bio: string;
}

/** A window of time on a given weekday that the experience actually runs. */
export interface Slot {
  /** 0 = Sunday .. 6 = Saturday */
  days: number[];
  /** minutes from midnight, e.g. 18 * 60 */
  startMin: number;
  endMin: number;
}

export interface Experience {
  experienceId: string;
  providerId: string;
  name: string;
  category: Category;
  tags: string[];
  description: string;
  /** per person, INR */
  price: number;
  /** minutes of the activity itself, excluding travel */
  durationMin: number;
  lat: number;
  lng: number;
  area: string;
  slots: Slot[];
  capacity: number;
  minGroup: number;
  /** Highest mobility demand the experience places on a guest. */
  mobility: Exclude<Mobility, "wheelchair">;
  wheelchairAccessible: boolean;
  indoor: boolean;
  suitableFor: TravelerType[];
  languages: string[];
  /** 0-100, platform methodology - see lib/engine/localRelevance.ts */
  localRelevance: number;
  localRelevanceFactors: string[];
  rating: number;
  reviewCount: number;
  source: DiscoverySource;
  verification: VerificationStatus;
  /** decorative gradient pair used instead of stock photography */
  art: [string, string];
  glyph: string;
  active: boolean;
}

export interface TravelerRequest {
  location: string;
  /** ISO date, defaults to today */
  date: string;
  /** minutes from midnight - when the traveler is free from */
  startMin: number;
  /** total minutes available, including travel */
  availableMin: number;
  /** per person, INR */
  budgetPerPerson: number;
  groupSize: number;
  travelerType: TravelerType;
  interests: Category[];
  preference: ExperiencePreference;
  mobility: Mobility;
  pace: Pace;
  /** free text the traveler typed, kept for explanation copy */
  rawText?: string;
  /** traveler's current position; defaults to Manali mall road */
  lat: number;
  lng: number;
  /** things already booked that day, to detect conflicts */
  itinerary: ItineraryItem[];
  /** ids the traveler has ruled out (cancelled, disliked) */
  excludedIds: string[];
}

export interface ItineraryItem {
  itemId: string;
  label: string;
  experienceId?: string;
  startMin: number;
  endMin: number;
  kind: "travel" | "experience" | "fixed";
}

export interface ScoreLine {
  key: string;
  label: string;
  /** 0..1 */
  score: number;
  weight: number;
  detail: string;
}

export interface Feasibility {
  travelToMin: number;
  travelBackMin: number;
  distanceKm: number;
  totalCommitmentMin: number;
  fits: boolean;
  /** earliest slot start today that works, minutes from midnight */
  earliestStartMin: number | null;
  reason?: string;
}

export interface Recommendation {
  experience: Experience;
  provider: Provider;
  matchScore: number;
  lines: ScoreLine[];
  feasibility: Feasibility;
  reasons: string[];
  warnings: string[];
  explanation: string;
}

export interface RejectedCandidate {
  experience: Experience;
  rule: string;
  detail: string;
}

export interface RecommendationResult {
  request: TravelerRequest;
  recommendations: Recommendation[];
  rejected: RejectedCandidate[];
  consideredCount: number;
}

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface Booking {
  bookingId: string;
  experienceId: string;
  providerId: string;
  travelerName: string;
  /** account that made the booking, when the traveler was signed in */
  userId?: string;
  date: string;
  startMin: number;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  /** when the provider cancelled this session (ISO), set by the cancel-today flow */
  cancelledAt?: string;
  /** the traveler situation this booking was matched against, when booked from a match */
  request?: TravelerRequest;
  /** set when this booking replaces one the provider cancelled */
  replacesBookingId?: string;
}

export interface Review {
  reviewId: string;
  experienceId: string;
  travelerName: string;
  rating: number;
  text: string;
  verifiedBooking: boolean;
  date: string;
}

export interface Lead {
  leadId: string;
  name: string;
  area: string;
  note: string;
  source: DiscoverySource;
  submittedBy: string;
  status: "new" | "contacted" | "verifying" | "published";
  createdAt: string;
}
