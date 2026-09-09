import Link from "next/link";
import { EXPERIENCES } from "@/lib/data/experiences";
import { PROVIDERS } from "@/lib/data/providers";
import { PHOTO, photoFor } from "@/lib/data/media";
import { fmtDuration } from "@/lib/engine/time";
import { HeroSearch } from "@/components/HeroSearch";
import { Art } from "@/components/Bits";

/* ------------------------------------------------------------------ pieces */

const TRUST = [
  { t: "Real-time availability", i: "M11 2 4 12h5l-1 8 8-11h-5l1-7z" },
  { t: "Personalized for you", i: "M10 2.5 11.8 7l4.7.5-3.5 3.2 1 4.6L10 13l-4 2.3 1-4.6L3.5 7.5 8.2 7 10 2.5z" },
  { t: "Local hosts & businesses", i: "M7 8.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM2 16.5c.8-2.6 2.6-3.9 5-3.9s4.2 1.3 5 3.9M14 5.2a2.5 2.5 0 0 1 0 4.6M18 16.5c-.4-1.5-1-2.6-1.8-3.4" },
  { t: "Verified & safe", i: "M10 2.5 3.8 5v4.7c0 3.6 2.5 6.9 6.2 7.9 3.7-1 6.2-4.3 6.2-7.9V5L10 2.5zM7.3 10l1.9 1.9 3.6-3.6" },
  { t: "Sustainable travel", i: "M16.5 3.5C9 3 4 6 4 11.5c0 1.6.5 3 1.3 4M4.6 16.4C10.5 16.9 16.5 13 16.5 3.5" },
];

const STEPS: {
  n: string;
  t: string;
  d: string;
  tint: string;
  icon: React.ReactNode;
}[] = [
  {
    n: "1",
    t: "Tell Us\nWhat You Like",
    d: "Share your interests, time, budget and group details.",
    tint: "#0f1e1c",
    icon: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="M14.6 7.4 9.8 9.8 7.4 14.6l4.8-2.4 2.4-4.8z" strokeLinejoin="round" />
      </>
    ),
  },
  {
    n: "2",
    t: "Get Smart\nRecommendations",
    d: "Our AI finds the best local experiences for you.",
    tint: "#2f6fb5",
    icon: (
      <>
        <path d="M11 4.4a3 3 0 0 0-5.6 1.4v.3A2.9 2.9 0 0 0 4 8.7c0 1 .5 1.9 1.3 2.4a2.9 2.9 0 0 0 2.2 4.5c.6.8 1.6 1.3 2.6 1.3.5 0 .9-.4.9-.9V5.3c0-.5-.4-.9-.9-.9z" />
        <path d="M11 4.4a3 3 0 0 1 5.6 1.4v.3A2.9 2.9 0 0 1 18 8.7c0 1-.5 1.9-1.3 2.4a2.9 2.9 0 0 1-2.2 4.5" />
        <path d="M11 5v12.5" />
      </>
    ),
  },
  {
    n: "3",
    t: "Plan Seamlessly",
    d: "Check real-time availability, add to your itinerary.",
    tint: "#2f6fb5",
    icon: (
      <>
        <rect x="3.4" y="5" width="15.2" height="13.6" rx="2.4" />
        <path d="M3.4 9.2h15.2M7.6 3v3.6M14.4 3v3.6" strokeLinecap="round" />
        <path d="M7.4 12.6h2M7.4 15.4h2M12.4 12.6h2.2M12.4 15.4h2.2" strokeLinecap="round" />
      </>
    ),
  },
  {
    n: "4",
    t: "Live the Experience",
    d: "Explore, enjoy and create stories that last.",
    tint: "#e07a3a",
    icon: (
      <path
        d="M11 18.2s-6.6-4.2-6.6-8.6A3.8 3.8 0 0 1 11 7.2a3.8 3.8 0 0 1 6.6 2.4c0 4.4-6.6 8.6-6.6 8.6z"
        strokeLinejoin="round"
      />
    ),
  },
];

/** Five photo-backed cards plus the "more" tile fills the row exactly. */
const TRENDING_IDS = ["x_bazaar", "x_heritage_walk", "x_rafting", "x_hamta", "x_nati"];

/** Short card titles — the full listing names are too long for a tile. */
const SHORT: Record<string, string> = {
  x_bazaar: "Street Food Trail",
  x_heritage_walk: "Heritage Walk",
  x_rafting: "River Rafting",
  x_hamta: "Hamta Valley Trek",
  x_nati: "Kullu Nati Night",
};

const TAGLINE: Record<string, string> = {
  x_bazaar: "Taste Manali like a local.",
  x_heritage_walk: "Stories in every corner",
  x_rafting: "Straight into the current",
  x_hamta: "Where the shepherds walk",
  x_nati: "Dance like the valley does",
};

function Polaroid({
  src,
  caption,
  className,
  rotate,
}: {
  src: string;
  caption: string;
  className?: string;
  rotate: number;
}) {
  return (
    <figure
      className={`polaroid w-[168px] ${className ?? ""}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-[124px] w-full rounded-[2px] object-cover" />
      <figcaption className="hand mt-2 text-center text-[19px] leading-none text-[#3d3a35]">
        {caption}
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------- page */

export default function Home() {
  const trending = TRENDING_IDS.map(
    (id) => EXPERIENCES.find((e) => e.experienceId === id)!
  ).filter(Boolean);

  const localCount = EXPERIENCES.filter((e) => e.localRelevance >= 80).length;

  return (
    <div>
      {/* ================================================================ HERO */}
      <section className="hero-shell min-h-[700px] overflow-hidden pt-[72px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PHOTO.hero}
          alt="The Kullu valley above the Beas river, Manali"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            // grades the midday source photo toward the golden hour of the design
            filter: "saturate(1.15) contrast(1.06) brightness(0.92) sepia(0.22) hue-rotate(-10deg)",
          }}
        />
        <div className="hero-warm" />
        <div className="hero-scrim" />

        <div className="relative mx-auto max-w-[1500px] px-5 pt-10 pb-24 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
            {/* ---------------------------------------------------- copy */}
            <div className="max-w-2xl">
              <p className="text-[13px] font-semibold tracking-[0.34em] text-white/80 uppercase">
                Beyond Destinations
              </p>

              <h1 className="mt-4 text-[58px] leading-[1.02] font-extrabold tracking-tight text-white sm:text-[66px]">
                Discover Experiences
                <br />
                That{" "}
                <span className="text-[var(--color-amber-2)]">Feel</span>{" "}
                <span className="text-[var(--color-amber)]">Local</span>
              </h1>

              <p className="mt-5 text-[21px] font-semibold text-white">
                Personalized. Real-time. Meaningful.
              </p>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/80">
                Find, plan and experience the real side of every city — powered by AI and the
                people who live there.
              </p>
            </div>

            {/* ----------------------------------------------- polaroids */}
            <div className="relative hidden h-[560px] lg:block">
              <p
                className="hand absolute -top-2 -left-24 w-56 text-[26px] leading-tight text-white"
                style={{ transform: "rotate(-7deg)" }}
              >
                Not just a place,
                <br />a feeling
              </p>
              <svg
                viewBox="0 0 120 90"
                className="absolute top-12 -left-6 h-24 w-32 text-white/70"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6C40 4 78 18 92 54" strokeLinecap="round" strokeDasharray="3 5" />
                <path d="M86 40c4 8 6 12 6 16 0-4 4-9 10-13" strokeLinecap="round" />
              </svg>

              <Polaroid
                src={PHOTO.temple}
                caption="Explore"
                rotate={5}
                className="absolute top-0 right-2"
              />
              <Polaroid
                src={PHOTO.food}
                caption="Taste"
                rotate={-4}
                className="absolute top-[190px] right-[104px]"
              />
              <Polaroid
                src={PHOTO.river}
                caption="Experience"
                rotate={4}
                className="absolute top-[382px] right-0"
              />
            </div>
          </div>

          {/* ------------------------------------------------ search bar */}
          <div className="mt-10 max-w-[1180px]">
            <HeroSearch />
          </div>

          {/* ------------------------------------------------ trust strip */}
          <ul className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
            {TRUST.map((t) => (
              <li key={t.t} className="flex items-center gap-2.5 text-[13.5px] font-medium text-white/90">
                <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.i} />
                </svg>
                {t.t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ======================================================= HOW IT WORKS */}
      <section className="curve-top bg-[var(--color-paper)] pt-16 pb-20">
        <div className="mx-auto max-w-[1500px] px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.55fr_1fr]">
            <div>
              <div className="flex flex-wrap items-baseline gap-4">
                <h2 className="text-[34px] font-extrabold tracking-tight">How It Works</h2>
                <p className="hand text-[22px] text-[var(--color-ink-soft)]">
                  From curiosity to unforgettable memories — in 4 simple steps.
                </p>
              </div>

              <ol className="mt-10 grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((s, i) => (
                  <li key={s.n} className="relative">
                    <div className="flex items-center gap-3">
                      <span className="text-[26px] font-extrabold text-[var(--color-ink)]">
                        {s.n}
                      </span>
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_4px_14px_-6px_rgba(15,30,28,0.4)]">
                        <svg
                          viewBox="0 0 22 22"
                          className="h-[22px] w-[22px]"
                          fill="none"
                          stroke={s.tint}
                          strokeWidth="1.5"
                        >
                          {s.icon}
                        </svg>
                      </span>
                      {i < STEPS.length - 1 && (
                        <span className="absolute top-5 -right-3 hidden text-[var(--color-muted)] lg:block">
                          <svg viewBox="0 0 26 10" className="h-2.5 w-6" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <path d="M0 5h20M17 1.5 21.5 5 17 8.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 text-[17px] leading-tight font-bold whitespace-pre-line">
                      {s.t}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">
                      {s.d}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* ------------------------------------------------- quote */}
            <div className="relative flex items-center border-l border-[var(--color-line)] pl-10 lg:pl-12">
              <div className="relative w-full overflow-hidden rounded-2xl bg-[#efece4] p-8">
                <p className="hand relative z-10 max-w-[280px] text-[27px] leading-[1.35] text-[#2a2723]">
                  &ldquo;Travel isn&apos;t about where you go, but how you experience it.&rdquo;
                </p>
                <p className="relative z-10 mt-6 text-[11px] font-bold tracking-[0.16em] text-[var(--color-ink-soft)] uppercase">
                  — LocalFlow
                </p>
                {/* line-art palms, drawn rather than fetched */}
                <svg
                  viewBox="0 0 240 180"
                  className="pointer-events-none absolute right-0 bottom-0 h-[104%] w-[46%] text-[#7d8a80]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.75"
                >
                  {/* tall palm */}
                  <path d="M138 176c-2-30 0-58 6-84" strokeWidth="1.8" />
                  <g strokeWidth="1.5">
                    <path d="M144 92c-16-16-36-20-52-13 17-2 36 3 52 13z" />
                    <path d="M144 92c10-20 28-30 46-27-17 3-34 12-46 27z" />
                    <path d="M144 92c-8-19-6-40 4-53-6 17-8 35-4 53z" />
                    <path d="M144 92c18-9 39-8 51 3-16-7-34-9-51-3z" />
                    <path d="M144 92c-20-2-38 7-46 22 13-12 29-20 46-22z" />
                  </g>
                  <circle cx="144" cy="90" r="2.4" fill="currentColor" stroke="none" />

                  {/* shorter palm */}
                  <path d="M196 176c-1-22 0-42 4-60" strokeWidth="1.6" />
                  <g strokeWidth="1.3">
                    <path d="M200 116c-12-12-27-15-39-10 13-1 27 2 39 10z" />
                    <path d="M200 116c8-15 21-22 34-20-13 2-25 9-34 20z" />
                    <path d="M200 116c-6-14-4-30 3-39-4 12-6 26-3 39z" />
                    <path d="M200 116c13-7 29-6 38 2-12-5-25-7-38-2z" />
                  </g>
                  <circle cx="200" cy="114" r="2" fill="currentColor" stroke="none" />

                  {/* shoreline */}
                  <path d="M84 172c34-7 74-9 112-5" strokeWidth="1.2" />
                  <path d="M100 165c26-5 56-6 82-3" strokeWidth="1" opacity="0.7" />
                  <path d="M60 176c30-4 62-6 94-5" strokeWidth="1" opacity="0.55" />
                  {/* birds */}
                  <path d="M44 40c4-4 8-4 11 0M58 32c3-3 7-3 9 0" strokeWidth="1.2" opacity="0.75" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ TRENDING */}
      <section className="bg-[var(--color-deep)] py-16 text-white">
        <div className="mx-auto max-w-[1500px] px-5 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-[30px] font-extrabold tracking-tight">Trending Near You</h2>
            <span className="flex items-center gap-1.5 text-sm text-white/70">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M10 17.5s6-5.2 6-9.3a6 6 0 1 0-12 0c0 4.1 6 9.3 6 9.3z" />
                <circle cx="10" cy="8" r="2.2" />
              </svg>
              Manali, India
            </span>
            <Link
              href="/experiences"
              className="ml-auto flex items-center gap-2 text-sm font-semibold text-white hover:text-[var(--color-amber-2)]"
            >
              View All
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {trending.map((e) => {
              const photo = photoFor(e.experienceId, e.category);
              return (
                <Link
                  key={e.experienceId}
                  href={`/experience/${e.experienceId}`}
                  className="group relative block h-[168px] overflow-hidden rounded-2xl"
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <Art exp={{ ...e, experienceId: undefined }} className="absolute inset-0" big />
                  )}
                  <span className="scrim absolute inset-0" />

                  <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold backdrop-blur">
                    <span className="text-[var(--color-amber-2)]">★</span>
                    {e.rating.toFixed(1)}
                  </span>
                  <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold backdrop-blur">
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 4.6V8l2.2 1.4" strokeLinecap="round" />
                    </svg>
                    {fmtDuration(e.durationMin)}
                  </span>

                  <span className="absolute inset-x-0 bottom-0 p-3.5">
                    <span className="block text-[15px] leading-tight font-bold">
                      {SHORT[e.experienceId] ?? e.name}
                    </span>
                    <span className="mt-1 block text-[12.5px] text-white/75">
                      {TAGLINE[e.experienceId] ?? e.area}
                    </span>
                  </span>
                </Link>
              );
            })}

            <Link
              href="/experiences"
              className="group flex h-[168px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] transition hover:bg-white/[0.09]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/25 transition group-hover:border-[var(--color-amber)]">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="hand text-center text-[19px] leading-tight text-white/85">
                More
                <br />
                experiences
                <br />
                await
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ CLOSING */}
      <section className="mx-auto max-w-[1500px] px-5 py-20 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="label">Why it is different</p>
            <h2 className="max-w-xl text-[32px] leading-tight font-extrabold tracking-tight">
              A search engine matches words. LocalFlow matches circumstances.
            </h2>
            <div className="mt-7 space-y-3.5">
              <div className="card p-5">
                <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--color-muted)] uppercase">
                  You say
                </p>
                <p className="mt-2 leading-relaxed">
                  &ldquo;I&apos;m in Manali with my parents. We have 2 hours before dinner. Budget
                  ₹800 each. Something cultural and relaxing. Not much walking.&rdquo;
                </p>
              </div>
              <div className="card border-[#c8e0d8] bg-[#e9f4f0] p-5">
                <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--color-teal)]">
                  LocalFlow answers
                </p>
                <p className="mt-2 leading-relaxed">
                  Traditional Himachali Puppet Show — <strong>98% match</strong>. ₹300, 55 minutes,
                  2.6 km away, starts 5:16 PM, indoors, seated throughout, verified family host.
                  <span className="text-[var(--color-ink-soft)]">
                    {" "}
                    You are back with 34 minutes to spare.
                  </span>
                </p>
              </div>
            </div>
            <Link href="/discover" className="btn btn-brand mt-7">
              Plan my day →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 self-start">
            {[
              [`${EXPERIENCES.length}`, "experiences live"],
              [`${PROVIDERS.length}`, "local hosts"],
              [`${localCount}`, "score 80+ on local relevance"],
              ["10", "constraints scored per match"],
            ].map(([v, l]) => (
              <div key={l} className="card p-5">
                <div className="text-[32px] leading-none font-extrabold">{v}</div>
                <div className="mt-2 text-xs leading-snug text-[var(--color-muted)]">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
