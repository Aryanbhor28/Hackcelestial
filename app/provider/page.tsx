import Link from "next/link";
import { PROVIDERS } from "@/lib/data/providers";
import {
  cancelledTodayIds,
  getBookingsForProvider,
  getExperiences,
  getProvider,
} from "@/lib/store";
import { todayIso } from "@/lib/engine/time";
import { BookingList, ExperienceManager } from "@/components/ProviderConsole";
import { SOURCE_LABEL, VerifiedBadge } from "@/components/Bits";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="label mb-1">{label}</p>
      <p className="display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}

export default async function ProviderDashboard({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const providerId = p ?? "p_sharma";
  const provider = getProvider(providerId) ?? PROVIDERS[0];

  const experiences = getExperiences().filter((e) => e.providerId === provider.providerId);
  const bookings = getBookingsForProvider(provider.providerId);
  const today = todayIso();

  const pending = bookings.filter((b) => b.status === "pending");
  const todays = bookings.filter((b) => b.date === today && b.status !== "declined");
  const earnings = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((s, b) => s + b.totalPrice, 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="label">Provider dashboard</p>
          <h1 className="display text-3xl font-semibold">{provider.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--color-ink-soft)]">
            <span>{provider.owner}</span>
            <span>·</span>
            <span>{provider.area}</span>
            <span>·</span>
            <span>{provider.rating}★ from {provider.reviewCount} visits</span>
            <VerifiedBadge status={provider.verification} />
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Joined via: {SOURCE_LABEL[provider.joinedVia]} · last verified{" "}
            {provider.evidence.lastVerifiedAt}
          </p>
        </div>
        <Link href="/provider/new" className="btn btn-brand">
          Add an experience
        </Link>
      </div>

      {/* provider switcher — demo convenience */}
      <div className="mt-6 flex flex-wrap gap-2">
        {PROVIDERS.slice(0, 8).map((pr) => (
          <Link
            key={pr.providerId}
            href={`/provider?p=${pr.providerId}`}
            className={`chip ${pr.providerId === provider.providerId ? "chip-on" : ""}`}
          >
            {pr.name}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Experiences" value={String(experiences.length)} hint={`${experiences.filter((e) => e.active).length} active`} />
        <Stat label="Today" value={String(todays.length)} hint="bookings on the books" />
        <Stat
          label="Pending requests"
          value={String(pending.length)}
          hint={pending.length ? "waiting on you" : "all clear"}
        />
        <Stat label="Confirmed value" value={`₹${earnings}`} hint="demo figure, no settlement" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <h2 className="label">Booking requests</h2>
          <BookingList bookings={bookings} experiences={getExperiences()} />
        </section>

        <section>
          <h2 className="label">Your experiences</h2>
          <ExperienceManager experiences={experiences} cancelledToday={cancelledTodayIds()} />

          <div className="card mt-6 border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-5">
            <h3 className="font-semibold text-[var(--color-brand)]">Cancelling today?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-soft)]">
              Hit “Cancel today” and every traveler currently matched to it is re-matched against
              their remaining time, budget and preferences — automatically, before they arrive to
              a locked door.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
