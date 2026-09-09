import Link from "next/link";
import { getExperiences, getLeads } from "@/lib/store";
import { SOURCE_LABEL } from "@/components/Bits";
import type { DiscoverySource } from "@/lib/types";

export const dynamic = "force-dynamic";

const PIPELINE = [
  { t: "Candidate", d: "A name, an area and a claim. From any source. Never visible to travelers." },
  { t: "Provider contact", d: "We reach the person who actually runs it and ask them to confirm." },
  { t: "Identity & phone", d: "Verified against the person, not against a business registration." },
  { t: "Location", d: "Confirmed on the ground or by a local partner." },
  { t: "Details confirmed", d: "Price, duration, capacity, access — stated by the provider." },
  { t: "Permits where they apply", d: "Adventure, food and transport carry the checks they should." },
  { t: "Published", d: "Verified badge, with the evidence shown to every traveler." },
];

const SOURCES: { key: DiscoverySource; blurb: string }[] = [
  { key: "provider_registration", blurb: "The primary and most reliable source. A provider fills the form themselves." },
  { key: "community_referral", blurb: "Residents, guides and tourism bodies point us at things with no online trace." },
  { key: "hotel_referral", blurb: "Homestays and hotels know the family down the road who hosts on Saturdays." },
  { key: "guide_referral", blurb: "Working guides refer the providers they already trust." },
  { key: "traveler_suggestion", blurb: "“Know a hidden local experience?” — a traveler tells us, we go and verify." },
  { key: "places_api", blurb: "Permitted business and location data gives us candidates to screen, not listings to publish." },
  { key: "event_api", blurb: "Event feeds surface festivals and one-off gatherings worth checking." },
  { key: "youtube", blurb: "Video content describes experiences with no web presence. A lead, never a listing." },
];

export default function DiscoveryPage() {
  const experiences = getExperiences();
  const leads = getLeads();

  const bySource = SOURCES.map((s) => ({
    ...s,
    count: experiences.filter((e) => e.source === s.key).length,
  }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="label">Supply architecture</p>
      <h1 className="display max-w-3xl text-4xl leading-tight font-semibold">
        How we find experiences that cannot be searched for
      </h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-[var(--color-ink-soft)]">
        A family that performs puppet shows on Saturday evenings has no website, no booking
        software and no reason to have either. Finding them is a supply problem, not a search
        problem — and discovery is never the same thing as verification.
      </p>

      {/* ------------------------------------------------------------ sources */}
      <section className="mt-12">
        <h2 className="label">Discovery sources — where candidates come from</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {bySource.map((s) => (
            <div key={s.key} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{SOURCE_LABEL[s.key]}</h3>
                <span className="chip">{s.count} live</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                {s.blurb}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- pipeline */}
      <section className="mt-14">
        <h2 className="label">Candidate to published listing</h2>
        <div className="card p-6">
          <ol className="grid gap-4 md:grid-cols-4">
            {PIPELINE.map((p, i) => (
              <li key={p.t} className="relative">
                <span className="display text-2xl text-[var(--color-brand)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-1 font-semibold">{p.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-soft)]">{p.d}</p>
              </li>
            ))}
          </ol>
          <div className="rule my-6" />
          <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
            A referral is not verification. A places result is not a partnership. A video is not
            a booking. Everything enters as a candidate and only a provider who confirms their own
            details gets published — which is also why informal, unregistered family providers are
            not excluded: we verify the person and the place, not the paperwork.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------- leads */}
      <section className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="label mb-0">Candidates currently in the pipeline</h2>
          <span className="text-xs text-[var(--color-muted)]">not visible to travelers</span>
        </div>
        <div className="mt-4 space-y-3">
          {leads.map((l) => (
            <div key={l.leadId} className="card flex flex-wrap items-start gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{l.name}</h3>
                  <span className="chip">{l.area}</span>
                  <span
                    className={`chip ${
                      l.status === "published"
                        ? "chip-good"
                        : l.status === "new"
                          ? ""
                          : "chip-warn"
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                  {l.note}
                </p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {SOURCE_LABEL[l.source]} · submitted by {l.submittedBy}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- normalize */}
      <section className="mt-14 grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="card p-6">
          <h2 className="display text-xl font-semibold">Why this scales without a rewrite</h2>
          <p className="mt-3 leading-relaxed text-[var(--color-ink-soft)]">
            Every source lands in the same normalization layer and produces the same experience
            record. The recommendation engine never knows or cares where a listing came from — it
            reads price, duration, coordinates, slots, capacity, accessibility and local
            relevance. Swapping curated seed data for live provider submissions or a places API
            changes the loader, not the engine.
          </p>
        </div>
        <div className="card bg-white p-6 font-mono text-[13px] leading-relaxed">
          <p className="text-[var(--color-muted)]">Data sources</p>
          <p>│ providers · community · hotels · guides</p>
          <p>│ places API · events API · video · travelers</p>
          <p className="mt-2 text-[var(--color-brand)]">↓ normalization layer</p>
          <p className="mt-2 text-[var(--color-muted)]">Experience database</p>
          <p className="mt-2 text-[var(--color-brand)]">↓ hard filters → weighted scoring</p>
          <p className="mt-2 text-[var(--color-muted)]">Recommendation engine</p>
          <p className="mt-2 text-[var(--color-brand)]">↓</p>
          <p className="text-[var(--color-muted)]">Traveler</p>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/provider/new" className="btn btn-brand">
          List an experience
        </Link>
        <Link href="/discover" className="btn btn-ghost">
          Try the matching engine
        </Link>
      </div>
    </div>
  );
}
