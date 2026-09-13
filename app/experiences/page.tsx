import Link from "next/link";
import { getExperiences, getProvider } from "@/lib/store";
import { fmtDuration } from "@/lib/engine/time";
import { photoFor } from "@/lib/data/media";
import { Art, CATEGORY_LABEL, LocalMeter, VerifiedBadge } from "@/components/Bits";
import { SaveButton } from "@/components/SaveButton";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

const ORDER: Category[] = [
  "culture",
  "food",
  "workshop",
  "nature",
  "adventure",
  "wellness",
  "shopping",
  "nightlife",
  "event",
];

export default async function ExperiencesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const active = ORDER.includes(c as Category) ? (c as Category) : null;

  const all = getExperiences().filter((e) => e.active);
  const list = active ? all.filter((e) => e.category === active) : all;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-12 lg:px-8">
      <p className="label">Manali pilot</p>
      <h1 className="text-[38px] leading-tight font-extrabold tracking-tight">
        Every experience on LocalFlow
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-[var(--color-ink-soft)]">
        Browse the full catalogue. To get these ranked against your actual time, budget, group
        and mobility — and filtered to what you can realistically reach and back —{" "}
        <Link href="/discover" className="font-semibold text-[var(--color-amber)] hover:underline">
          plan your day
        </Link>{" "}
        instead.
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
        <Link href="/experiences" className={`chip ${!active ? "chip-on" : ""}`}>
          All {all.length}
        </Link>
        {ORDER.map((cat) => {
          const n = all.filter((e) => e.category === cat).length;
          if (!n) return null;
          return (
            <Link
              key={cat}
              href={`/experiences?c=${cat}`}
              className={`chip ${active === cat ? "chip-on" : ""}`}
            >
              {CATEGORY_LABEL[cat]} {n}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((e) => {
          const photo = photoFor(e.experienceId, e.category);
          const provider = getProvider(e.providerId);
          return (
            <div key={e.experienceId} className="card card-hover relative overflow-hidden">
            <span className="absolute top-2.5 right-2.5 z-10">
              <SaveButton experienceId={e.experienceId} />
            </span>
            <Link
              href={`/experience/${e.experienceId}`}
              className="block"
            >
              <div className="relative h-44">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <Art exp={{ ...e, experienceId: undefined }} className="absolute inset-0" big />
                )}
                <span className="absolute top-2.5 left-2.5 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  <span className="text-[var(--color-amber-2)]">★</span>{" "}
                  {e.rating ? e.rating.toFixed(1) : "New"}
                </span>
                <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  {fmtDuration(e.durationMin)}
                </span>
              </div>

              <div className="p-4">
                <p className="text-[11px] font-semibold tracking-wide text-[var(--color-muted)] uppercase">
                  {CATEGORY_LABEL[e.category]} · {e.area}
                </p>
                <h3 className="mt-1 leading-snug font-bold">{e.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
                  {e.description}
                </p>
                <p className="mt-2 text-[12px] text-[var(--color-muted)]">
                  Hosted by {provider?.name ?? "a local host"}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bold">
                    {e.price === 0 ? "Free" : `₹${e.price}`}
                    <span className="text-xs font-normal text-[var(--color-muted)]"> pp</span>
                  </span>
                  <LocalMeter value={e.localRelevance} />
                </div>
                <div className="mt-3">
                  <VerifiedBadge status={e.verification} />
                </div>
              </div>
            </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
