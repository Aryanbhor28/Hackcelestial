import Link from "next/link";
import { notFound } from "next/navigation";
import { getExperience, getProvider, getReviewsFor, isCancelledToday } from "@/lib/store";
import { fmtDuration, fmtTime, startOptions, todayIso } from "@/lib/engine/time";
import { Art, CATEGORY_LABEL, LocalMeter, SOURCE_LABEL, VerifiedBadge } from "@/components/Bits";
import { BookingBox } from "@/components/BookingBox";
import { SaveButton } from "@/components/SaveButton";

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exp = getExperience(id);
  if (!exp) notFound();
  const provider = getProvider(exp.providerId);
  if (!provider) notFound();

  const reviews = getReviewsFor(exp.experienceId);
  const slots = startOptions(exp, todayIso());
  const cancelled = isCancelledToday(exp.experienceId);

  const ev = provider.evidence;
  const checks: [string, boolean][] = [
    ["Phone verified", ev.phoneVerified],
    ["Identity verified", ev.identityVerified],
    ["Location verified", ev.locationVerified],
    ["Experience details confirmed by the provider", ev.detailsConfirmedByProvider],
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link href="/discover" className="text-sm text-[var(--color-muted)] hover:underline">
        ← Back to discovery
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <Art exp={exp} className="h-64 rounded-2xl" big />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="chip chip-brand">{CATEGORY_LABEL[exp.category]}</span>
            <VerifiedBadge status={exp.verification} />
            {exp.indoor && <span className="chip">Indoor</span>}
            {exp.wheelchairAccessible && <span className="chip chip-good">Step-free access</span>}
            {cancelled && <span className="chip chip-warn">Cancelled for today</span>}
          </div>

          <div className="mt-4 flex items-start gap-4">
            <h1 className="display flex-1 text-4xl leading-tight font-semibold">{exp.name}</h1>
            <SaveButton experienceId={exp.experienceId} label />
          </div>
          <p className="mt-2 text-[var(--color-ink-soft)]">
            {provider.name} · {exp.area}, Manali
          </p>

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--color-line)] py-4 text-sm">
            <div>
              <p className="label mb-0.5">Duration</p>
              <p className="font-medium">{fmtDuration(exp.durationMin)}</p>
            </div>
            <div>
              <p className="label mb-0.5">Capacity</p>
              <p className="font-medium">up to {exp.capacity}</p>
            </div>
            <div>
              <p className="label mb-0.5">Effort</p>
              <p className="font-medium">
                {exp.mobility === "low_walking"
                  ? "Very little walking"
                  : exp.mobility === "moderate"
                    ? "Some walking"
                    : "Physically active"}
              </p>
            </div>
            <div>
              <p className="label mb-0.5">Languages</p>
              <p className="font-medium">{exp.languages.join(", ")}</p>
            </div>
            <div>
              <p className="label mb-0.5">Rating</p>
              <p className="font-medium">
                {exp.rating ? `${exp.rating.toFixed(1)}★ · ${exp.reviewCount} visits` : "New listing"}
              </p>
            </div>
          </div>

          <p className="mt-6 text-lg leading-relaxed">{exp.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {exp.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>

          {/* ------------------------------------------------ local relevance */}
          <section className="card mt-8 p-6">
            <div className="flex items-center justify-between">
              <h2 className="display text-xl font-semibold">Local relevance</h2>
              <LocalMeter value={exp.localRelevance} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
              A platform methodology, not a measurement. These are the signals that produced the
              score, and they are the same signals shown to the provider.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {exp.localRelevanceFactors.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-[var(--color-pine)]">◆</span>
                  <span className="text-[var(--color-ink-soft)]">{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* --------------------------------------------------------- trust */}
          <section className="card mt-6 p-6">
            <h2 className="display text-xl font-semibold">Trust & verification</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              {provider.name} · owner {provider.owner}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
              {provider.bio}
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {checks.map(([label, ok]) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <span className={ok ? "text-[var(--color-pine)]" : "text-[var(--color-muted)]"}>
                    {ok ? "✓" : "○"}
                  </span>
                  <span className={ok ? "" : "text-[var(--color-muted)]"}>{label}</span>
                </div>
              ))}
            </div>

            {ev.permitsOnFile?.length ? (
              <p className="mt-4 text-sm">
                <span className="label mb-0 inline">On file: </span>
                <span className="text-[var(--color-ink-soft)]">{ev.permitsOnFile.join(", ")}</span>
              </p>
            ) : null}
            {ev.localReference ? (
              <p className="mt-2 text-sm">
                <span className="label mb-0 inline">Local reference: </span>
                <span className="text-[var(--color-ink-soft)]">{ev.localReference}</span>
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-muted)]">
              <span>Discovered via: {SOURCE_LABEL[exp.source]}</span>
              <span>·</span>
              <span>Last verified {ev.lastVerifiedAt}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
              We do not claim an experience is “100% safe”. We show you what was checked, by
              whom, and when.
            </p>
          </section>

          {/* ------------------------------------------------------ reviews */}
          {reviews.length > 0 && (
            <section className="mt-8">
              <h2 className="display text-xl font-semibold">
                {exp.rating.toFixed(1)}★ from {exp.reviewCount} visits
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <div key={r.reviewId} className="card p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.travelerName}</span>
                      <span className="text-sm">{"★".repeat(r.rating)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                      {r.text}
                    </p>
                    <p className="mt-3 text-xs text-[var(--color-muted)]">
                      {r.verifiedBooking ? "✓ Verified booking" : "Unverified"} · {r.date}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ------------------------------------------------------- book rail */}
        <aside id="book" className="scroll-mt-24 space-y-5 lg:sticky lg:top-24 lg:self-start">
          {cancelled ? (
            <div className="card border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] p-6">
              <p className="font-semibold text-[var(--color-brand)]">
                Unavailable for the rest of today
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                The provider has marked this cancelled. Re-run your match and we will rank what
                is still possible in your window.
              </p>
              <Link href="/discover" className="btn btn-brand btn-sm mt-4">
                Find an alternative
              </Link>
            </div>
          ) : (
            <BookingBox exp={exp} slots={slots} />
          )}

          <div className="card p-5">
            <h3 className="font-semibold">Today&apos;s sessions</h3>
            {slots.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {slots.map((s) => (
                  <span key={s} className="chip">
                    {fmtTime(s)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Not running today. Weekly schedule set by the provider.
              </p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold">Suits</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {exp.suitableFor.map((s) => (
                <span key={s} className="chip">
                  {s === "parents" ? "older parents" : s}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
