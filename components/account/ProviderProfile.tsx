"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { PROVIDERS } from "@/lib/data/providers";
import { SOURCE_LABEL, CATEGORY_LABEL } from "@/components/Bits";
import type { Booking, Experience } from "@/lib/types";
import { fmtDuration } from "@/lib/engine/time";
import { AccountCard, Row, StatTile, TextInput } from "./Ui";
import { AvatarPicker } from "./AvatarPicker";

/**
 * Provider-facing profile. Reads the existing seeded provider record rather
 * than inventing a second provider model; only the fields a host can genuinely
 * edit in this prototype (contact details, description) are editable.
 */
export function ProviderProfile() {
  const { user, updateAccount, updateProfile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", city: "", country: "" });
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const provider = useMemo(
    () =>
      PROVIDERS.find((p) => p.providerId === user?.providerId) ??
      PROVIDERS.find((p) => p.owner.toLowerCase() === user?.name.toLowerCase()) ??
      null,
    [user]
  );

  useEffect(() => {
    if (!provider) return;
    let alive = true;
    Promise.all([
      fetch("/api/experiences").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
    ])
      .then(([e, b]: [{ experiences: Experience[] }, { bookings: Booking[] }]) => {
        if (!alive) return;
        setExperiences(e.experiences.filter((x) => x.providerId === provider.providerId));
        setBookings(b.bookings.filter((x) => x.providerId === provider.providerId));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [provider]);

  if (!user) return null;

  const startEdit = () => {
    setDraft({
      name: user.name,
      email: user.email,
      phone: user.profile.phone,
      city: user.profile.city,
      country: user.profile.country,
    });
    setEditing(true);
  };

  const save = () => {
    if (draft.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      toast("Check your name and email.", "error");
      return;
    }
    updateAccount({ name: draft.name.trim(), email: draft.email.trim() });
    updateProfile({
      phone: draft.phone.trim(),
      city: draft.city.trim(),
      country: draft.country.trim(),
    });
    setEditing(false);
    toast("Profile updated");
  };

  const ev = provider?.evidence;
  const categories = Array.from(new Set(experiences.map((e) => e.category)));
  const pending = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="acc-grid">
      <aside className="acc-side">
        <div className="acc-identity">
          <AvatarPicker />
          <h1 className="acc-identity-name">{provider?.name ?? user.name}</h1>
          <span className="acc-identity-role is-host">Local Host</span>
          <p className="acc-identity-email">{user.email}</p>
          {provider && (
            <p className="acc-identity-since">
              {provider.area} · joined via {SOURCE_LABEL[provider.joinedVia].toLowerCase()}
            </p>
          )}
          {!editing && (
            <button className="btn btn-ghost btn-sm mt-4 w-full" onClick={startEdit}>
              Edit Profile
            </button>
          )}
        </div>

        {provider && (
          <div className="acc-complete">
            <span className="acc-label">Verification</span>
            <div className="mt-2 flex items-center gap-2">
              <span className={provider.verification === "verified" ? "chip chip-good" : "chip chip-warn"}>
                {provider.verification === "verified" ? "✓ Verified provider" : "◷ In progress"}
              </span>
            </div>
            <ul className="acc-verify">
              {(
                [
                  ["Phone verified", ev?.phoneVerified],
                  ["Identity verified", ev?.identityVerified],
                  ["Location verified", ev?.locationVerified],
                  ["Details confirmed", ev?.detailsConfirmedByProvider],
                ] as [string, boolean | undefined][]
              ).map(([label, ok]) => (
                <li key={label} className={ok ? "is-ok" : ""}>
                  <span aria-hidden>{ok ? "✓" : "○"}</span>
                  {label}
                </li>
              ))}
            </ul>
            <p className="acc-hint mt-2">Last verified {ev?.lastVerifiedAt}</p>
          </div>
        )}

        <div className="acc-stats">
          <StatTile value={experiences.length} label="Experiences" href="/provider" />
          <StatTile value={pending} label="Pending" href="/provider" />
          <StatTile value={provider?.rating ?? "—"} label="Rating" />
        </div>
      </aside>

      <div className="acc-main">
        <AccountCard
          title="Contact & account"
          hint="How LocalFlow reaches you about bookings."
          action={
            editing ? (
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="btn btn-brand btn-sm" onClick={save}>
                  Save Changes
                </button>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={startEdit}>
                Edit
              </button>
            )
          }
        >
          <div className="acc-fields">
            <Row label="Owner / contact name" htmlFor="pv-name">
              {editing ? (
                <TextInput id="pv-name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
              ) : (
                <p className="acc-value">{user.name}</p>
              )}
            </Row>
            <Row label="Email" htmlFor="pv-email">
              {editing ? (
                <TextInput id="pv-email" type="email" value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} />
              ) : (
                <p className="acc-value">{user.email}</p>
              )}
            </Row>
            <Row label="Phone" htmlFor="pv-phone">
              {editing ? (
                <TextInput id="pv-phone" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
              ) : (
                <p className={`acc-value ${user.profile.phone ? "" : "is-empty"}`}>
                  {user.profile.phone || provider?.phone || "Not added"}
                </p>
              )}
            </Row>
            <Row label="Location" htmlFor="pv-city">
              {editing ? (
                <TextInput id="pv-city" value={draft.city} onChange={(v) => setDraft((d) => ({ ...d, city: v }))} />
              ) : (
                <p className={`acc-value ${user.profile.city ? "" : "is-empty"}`}>
                  {user.profile.city || provider?.area || "Not added"}
                </p>
              )}
            </Row>
          </div>
        </AccountCard>

        {provider && (
          <AccountCard
            title="Public profile"
            hint="What travelers see on your listings."
            action={
              <Link href={`/experience/${experiences[0]?.experienceId ?? ""}`} className="btn btn-ghost btn-sm">
                Preview
              </Link>
            }
          >
            <div className="acc-public">
              <p className="acc-public-name">{provider.name}</p>
              <p className="acc-public-bio">{provider.bio}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span key={c} className="chip">
                    {CATEGORY_LABEL[c]}
                  </span>
                ))}
                {experiences[0]?.languages.map((l) => (
                  <span key={l} className="chip chip-brand">
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <p className="acc-note mt-4">
              Business name, bio and verification come from your verified provider record. In this
              prototype those are changed through LocalFlow support rather than self-serve.
            </p>
          </AccountCard>
        )}

        <AccountCard title="Your experiences" hint="Manage pricing, availability and bookings from the dashboard.">
          {experiences.length === 0 ? (
            <p className="acc-hint">No experiences listed yet.</p>
          ) : (
            <ul className="acc-list">
              {experiences.map((e) => (
                <li key={e.experienceId}>
                  <Link href={`/experience/${e.experienceId}`} className="acc-list-main">
                    <span className="acc-list-title">{e.name}</span>
                    <span className="acc-list-meta">
                      ₹{e.price} · {fmtDuration(e.durationMin)} · up to {e.capacity} · {e.area}
                    </span>
                  </Link>
                  {!e.active && <span className="chip">Paused</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/provider" className="btn btn-brand btn-sm">
              Provider dashboard →
            </Link>
            <Link href="/provider/new" className="btn btn-ghost btn-sm">
              Add an experience
            </Link>
          </div>
        </AccountCard>
      </div>
    </div>
  );
}
