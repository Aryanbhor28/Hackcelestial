"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AccountGate } from "@/components/account/AccountGate";
import { AccountCard, EmptyState } from "@/components/account/Ui";
import { SaveButton } from "@/components/SaveButton";
import { CATEGORY_LABEL, LocalMeter, VerifiedBadge } from "@/components/Bits";
import { photoFor } from "@/lib/data/media";
import { fmtDuration } from "@/lib/engine/time";
import type { Experience } from "@/lib/types";

function SavedInner() {
  const { user } = useAuth();
  const [all, setAll] = useState<Experience[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/experiences")
      .then((r) => r.json())
      .then((d: { experiences: Experience[] }) => alive && setAll(d.experiences))
      .catch(() => alive && setAll([]));
    return () => {
      alive = false;
    };
  }, []);

  if (!user) return null;

  if (all === null)
    return (
      <div className="acc-single">
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );

  // preserve the order the traveler saved them in
  const saved = user.savedExperienceIds
    .map((id) => all.find((e) => e.experienceId === id))
    .filter((e): e is Experience => Boolean(e));

  return (
    <div className="acc-single">
      <header className="acc-page-head">
        <h1 className="acc-page-title">Saved Experiences</h1>
        <p className="acc-page-sub">
          {saved.length
            ? `${saved.length} experience${saved.length === 1 ? "" : "s"} you've kept for later.`
            : "Experiences you save are kept on your account."}
        </p>
      </header>

      <AccountCard>
        {saved.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 20s-7-4.5-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.5 12 20 12 20z" strokeLinejoin="round" />
              </svg>
            }
            title="Your next favourite experience could be here"
            body="Tap the heart on any experience and it'll be waiting for you on this page."
            ctaLabel="Explore experiences"
            ctaHref="/experiences"
          />
        ) : (
          <div className="acc-saved-grid">
            {saved.map((e) => {
              const photo = photoFor(e.experienceId, e.category);
              return (
                <div key={e.experienceId} className="card card-hover relative overflow-hidden">
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <SaveButton experienceId={e.experienceId} />
                  </div>
                  <Link href={`/experience/${e.experienceId}`} className="block">
                    <div className="relative h-36">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <span
                          className="absolute inset-0 grid place-items-center text-4xl"
                          style={{ backgroundImage: `linear-gradient(140deg, ${e.art[0]}, ${e.art[1]})` }}
                        >
                          {e.glyph}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] font-semibold tracking-wide text-[var(--color-muted)] uppercase">
                        {CATEGORY_LABEL[e.category]} · {e.area}
                      </p>
                      <h3 className="mt-1 leading-snug font-bold">{e.name}</h3>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-bold">
                          {e.price === 0 ? "Free" : `₹${e.price}`}
                          <span className="text-xs font-normal text-[var(--color-muted)]">
                            {" "}
                            · {fmtDuration(e.durationMin)}
                          </span>
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
        )}
      </AccountCard>
    </div>
  );
}

export default function SavedPage() {
  return (
    <div className="acc-page">
      <AccountGate>
        <SavedInner />
      </AccountGate>
    </div>
  );
}
