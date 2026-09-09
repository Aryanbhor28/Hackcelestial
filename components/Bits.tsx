import type { Experience, Provider } from "@/lib/types";
import { photoFor } from "@/lib/data/media";

/**
 * Experience artwork. Uses a real photograph where we have an honest one for
 * that subject, and falls back to generated gradient art otherwise — we never
 * borrow a photo of somewhere else to fill a card.
 */
export function Art({
  exp,
  className = "",
  big = false,
}: {
  exp: Pick<Experience, "art" | "glyph" | "category"> & { experienceId?: string };
  className?: string;
  big?: boolean;
}) {
  const photo = exp.experienceId ? photoFor(exp.experienceId, exp.category) : null;

  if (photo)
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );

  return (
    <div
      className={`art grid place-items-center ${className}`}
      style={{
        backgroundImage: `linear-gradient(140deg, ${exp.art[0]}, ${exp.art[1]})`,
      }}
      aria-hidden
    >
      <span style={{ fontSize: big ? 64 : 30, filter: "drop-shadow(0 2px 8px rgba(0,0,0,.35))" }}>
        {exp.glyph}
      </span>
    </div>
  );
}

export function MatchRing({ score, size = 62 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const tone = score >= 85 ? "#1f4d3d" : score >= 70 ? "#b8860b" : "#8a7f76";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eee6dc" strokeWidth={5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span
          className="display font-semibold"
          style={{ fontSize: size * 0.3, color: tone }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

export function LocalMeter({ value }: { value: number }) {
  const tone = value >= 80 ? "var(--color-pine)" : value >= 55 ? "var(--color-gold)" : "var(--color-muted)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: tone, transition: "width .6s ease" }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color: tone }}>
        {value}
      </span>
    </div>
  );
}

export function VerifiedBadge({
  status,
  className = "",
}: {
  status: Provider["verification"];
  className?: string;
}) {
  if (status === "verified")
    return <span className={`chip chip-good ${className}`}>✓ Verified provider</span>;
  if (status === "pending")
    return <span className={`chip chip-warn ${className}`}>◷ Verification in progress</span>;
  return <span className={`chip ${className}`}>Candidate listing</span>;
}

export const SOURCE_LABEL: Record<string, string> = {
  provider_registration: "Provider registered directly",
  community_referral: "Community referral",
  hotel_referral: "Hotel / homestay referral",
  guide_referral: "Local guide referral",
  places_api: "Places data, then verified",
  event_api: "Event listing, then verified",
  youtube: "Found in video content, then verified",
  traveler_suggestion: "Suggested by a traveler, then verified",
};

export const CATEGORY_LABEL: Record<string, string> = {
  culture: "Culture",
  food: "Food",
  adventure: "Adventure",
  workshop: "Workshop",
  nature: "Nature",
  wellness: "Wellness",
  shopping: "Shopping",
  nightlife: "Nightlife",
  event: "Events",
};
