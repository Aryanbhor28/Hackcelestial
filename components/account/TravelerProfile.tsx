"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import {
  ACCESS_LABELS,
  INTEREST_LABELS,
  MOBILITY_LABELS,
  PACE_LABELS,
  PREFERENCE_LABELS,
  TRAVELER_TYPE_LABELS,
  completeness,
  currencySymbol,
  travelStyle,
  type AccessNeed,
} from "@/lib/profile";
import type { Booking, Category } from "@/lib/types";
import { AccountCard, Chip, EmptyState, Row, Segmented, StatTile, TextInput } from "./Ui";
import { AvatarPicker } from "./AvatarPicker";

const fmtMonth = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "2026"
    : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

export function TravelerProfile() {
  const { user, updateAccount, updateProfile, updatePreferences } = useAuth();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", country: "", city: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  // real trip counts, pulled from the same booking store the provider uses
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((d: { bookings: Booking[] }) => {
        if (!alive) return;
        setBookings(
          d.bookings.filter(
            (b) =>
              b.userId === user.id ||
              b.travelerName.toLowerCase() === user.name.toLowerCase()
          )
        );
      })
      .catch(() => alive && setBookings([]));
    return () => {
      alive = false;
    };
  }, [user]);

  const prefs = user?.preferences;

  const comp = useMemo(
    () =>
      user && prefs
        ? completeness(user.name, user.email, user.profile, prefs)
        : null,
    [user, prefs]
  );

  const styles = useMemo(() => (prefs ? travelStyle(prefs) : []), [prefs]);

  if (!user || !prefs || !comp) return null;

  const sym = currencySymbol(user.settings.locale.currency);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (bookings ?? []).filter(
    (b) => b.date >= today && b.status !== "declined" && b.status !== "cancelled"
  ).length;
  const completed = (bookings ?? []).filter(
    (b) => b.date < today && b.status === "confirmed"
  ).length;

  const startEdit = () => {
    setDraft({
      name: user.name,
      email: user.email,
      phone: user.profile.phone,
      country: user.profile.country,
      city: user.profile.city,
    });
    setErrors({});
    setEditing(true);
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (draft.name.trim().length < 2) e.name = "Tell us what to call you.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
      e.email = "That doesn't look like an email address.";
    if (draft.phone.trim() && draft.phone.replace(/\D/g, "").length < 6)
      e.phone = "That phone number looks too short.";
    setErrors(e);
    if (Object.keys(e).length) return;

    updateAccount({ name: draft.name.trim(), email: draft.email.trim() });
    updateProfile({
      phone: draft.phone.trim(),
      country: draft.country.trim(),
      city: draft.city.trim(),
    });
    setEditing(false);
    toast("Profile updated");
  };

  const toggleInterest = (c: Category) => {
    const has = prefs.interests.includes(c);
    updatePreferences({
      interests: has ? prefs.interests.filter((x) => x !== c) : [...prefs.interests, c],
    });
    toast("Preferences saved");
  };

  const toggleAccess = (a: AccessNeed) => {
    const has = prefs.accessNeeds.includes(a);
    updatePreferences({
      accessNeeds: has ? prefs.accessNeeds.filter((x) => x !== a) : [...prefs.accessNeeds, a],
    });
    toast("Preferences saved");
  };

  return (
    <div className="acc-grid">
      {/* ------------------------------------------------------------ left */}
      <aside className="acc-side">
        <div className="acc-identity">
          <AvatarPicker />
          <h1 className="acc-identity-name">{user.name}</h1>
          <span className="acc-identity-role">Traveler</span>
          <p className="acc-identity-email">{user.email}</p>
          <p className="acc-identity-since">Member since {fmtMonth(user.memberSince)}</p>
          {!editing && (
            <button className="btn btn-ghost btn-sm mt-4 w-full" onClick={startEdit}>
              Edit Profile
            </button>
          )}
        </div>

        <div className="acc-complete">
          <div className="flex items-baseline justify-between">
            <span className="acc-label">Profile completeness</span>
            <span className="acc-complete-pct">{comp.percent}%</span>
          </div>
          <div className="acc-complete-bar">
            <span style={{ width: `${comp.percent}%` }} />
          </div>
          <p className="acc-hint mt-2">
            {comp.percent === 100
              ? "Everything's filled in — your matches use all of it."
              : `Add ${comp.missing.slice(0, 2).join(" and ").toLowerCase()} to sharpen your recommendations.`}
          </p>
        </div>

        <div className="acc-stats">
          <StatTile value={user.savedExperienceIds.length} label="Saved" href="/saved" />
          <StatTile value={upcoming} label="Upcoming" href="/trips" />
          <StatTile value={completed} label="Completed" href="/trips" />
        </div>
      </aside>

      {/* ----------------------------------------------------------- right */}
      <div className="acc-main">
        {/* travel style — derived, never invented */}
        <AccountCard
          title="Your travel style"
          hint="Drawn from the preferences you've actually chosen."
        >
          {styles.length ? (
            <div className="flex flex-wrap gap-2">
              {styles.map((s) => (
                <span key={s.label} className="acc-style" title={s.hint}>
                  {s.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="acc-hint">
              Pick a few interests below and your travel style will appear here.
            </p>
          )}
        </AccountCard>

        {/* personal information */}
        <AccountCard
          title="Personal information"
          hint="Used to personalise your trip, never shown to other travelers."
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
            <Row label="Full name" htmlFor="pf-name">
              {editing ? (
                <TextInput
                  id="pf-name"
                  value={draft.name}
                  onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
                  autoComplete="name"
                  error={errors.name}
                />
              ) : (
                <p className="acc-value">{user.name}</p>
              )}
            </Row>

            <Row label="Email" htmlFor="pf-email">
              {editing ? (
                <TextInput
                  id="pf-email"
                  type="email"
                  value={draft.email}
                  onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
                  autoComplete="email"
                  error={errors.email}
                />
              ) : (
                <p className="acc-value">{user.email}</p>
              )}
            </Row>

            <Row label="Phone number" htmlFor="pf-phone">
              {editing ? (
                <TextInput
                  id="pf-phone"
                  value={draft.phone}
                  onChange={(v) => setDraft((d) => ({ ...d, phone: v }))}
                  placeholder="+91 …"
                  autoComplete="tel"
                  error={errors.phone}
                />
              ) : (
                <p className={`acc-value ${user.profile.phone ? "" : "is-empty"}`}>
                  {user.profile.phone || "Not added"}
                </p>
              )}
            </Row>

            <Row label="Country" htmlFor="pf-country">
              {editing ? (
                <TextInput
                  id="pf-country"
                  value={draft.country}
                  onChange={(v) => setDraft((d) => ({ ...d, country: v }))}
                  placeholder="India"
                  autoComplete="country-name"
                />
              ) : (
                <p className={`acc-value ${user.profile.country ? "" : "is-empty"}`}>
                  {user.profile.country || "Not added"}
                </p>
              )}
            </Row>

            <Row label="City" htmlFor="pf-city">
              {editing ? (
                <TextInput
                  id="pf-city"
                  value={draft.city}
                  onChange={(v) => setDraft((d) => ({ ...d, city: v }))}
                  placeholder="Bengaluru"
                  autoComplete="address-level2"
                />
              ) : (
                <p className={`acc-value ${user.profile.city ? "" : "is-empty"}`}>
                  {user.profile.city || "Not added"}
                </p>
              )}
            </Row>

            <Row label="Preferred language" hint="Managed in Settings → Preferences.">
              <p className="acc-value">
                {user.settings.locale.language === "hi" ? "हिन्दी (Hindi)" : "English"}{" "}
                <Link href="/settings?s=preferences" className="acc-inline-link">
                  Change
                </Link>
              </p>
            </Row>
          </div>
        </AccountCard>

        {/* travel preferences — these feed the engine */}
        <AccountCard
          title="Travel preferences"
          hint="These become the starting point for every recommendation. Anything you type into Plan My Day overrides them for that search."
          id="preferences"
        >
          <div className="acc-fields">
            <Row label="Experience preference" hint="How much local character matters to you.">
              <div className="acc-pref-grid">
                {PREFERENCE_LABELS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={prefs.preference === p.value}
                    onClick={() => {
                      updatePreferences({ preference: p.value });
                      toast("Preferences saved");
                    }}
                    className={`acc-pref ${prefs.preference === p.value ? "is-on" : ""}`}
                  >
                    <span className="acc-pref-label">{p.label}</span>
                    <span className="acc-pref-hint">{p.hint}</span>
                  </button>
                ))}
              </div>
            </Row>

            <Row label="Interests" hint="Pick as many as you like.">
              <div className="flex flex-wrap gap-2">
                {INTEREST_LABELS.map((i) => (
                  <Chip
                    key={i.value}
                    on={prefs.interests.includes(i.value)}
                    onClick={() => toggleInterest(i.value)}
                  >
                    {i.label}
                  </Chip>
                ))}
              </div>
            </Row>

            <Row
              label={`Typical budget — ${sym}${prefs.budgetPerPerson} per person`}
              hint="A starting point, adjustable on every search."
              htmlFor="pf-budget"
            >
              <input
                id="pf-budget"
                type="range"
                min={0}
                max={5000}
                step={50}
                value={prefs.budgetPerPerson}
                onChange={(e) => updatePreferences({ budgetPerPerson: Number(e.target.value) })}
                onMouseUp={() => toast("Preferences saved")}
                onTouchEnd={() => toast("Preferences saved")}
              />
            </Row>

            <Row label="Activity intensity" hint="How energetic you like your days.">
              <Segmented
                name="Activity intensity"
                value={prefs.pace}
                options={PACE_LABELS}
                onChange={(v) => {
                  updatePreferences({ pace: v });
                  toast("Preferences saved");
                }}
              />
            </Row>

            <Row label="Walking preference" hint="Used as a hard filter, not just a ranking hint.">
              <Segmented
                name="Walking preference"
                value={prefs.mobility}
                options={MOBILITY_LABELS}
                onChange={(v) => {
                  updatePreferences({ mobility: v });
                  toast("Preferences saved");
                }}
              />
            </Row>

            <Row label="Usually travelling as" hint="Sets the default group for new searches.">
              <div className="flex flex-wrap gap-2">
                {TRAVELER_TYPE_LABELS.map((t) => (
                  <Chip
                    key={t.value}
                    on={prefs.travelerType === t.value}
                    onClick={() => {
                      updatePreferences({ travelerType: t.value });
                      toast("Preferences saved");
                    }}
                  >
                    {t.label}
                  </Chip>
                ))}
              </div>
            </Row>

            <Row label={`Usual group size — ${prefs.groupSize}`} htmlFor="pf-group">
              <input
                id="pf-group"
                type="range"
                min={1}
                max={20}
                value={prefs.groupSize}
                onChange={(e) => updatePreferences({ groupSize: Number(e.target.value) })}
                onMouseUp={() => toast("Preferences saved")}
                onTouchEnd={() => toast("Preferences saved")}
              />
            </Row>
          </div>
        </AccountCard>

        {/* accessibility */}
        <AccountCard
          title="Accessibility & comfort"
          hint="Travel preferences we pass to the matching engine — not medical information."
        >
          <div className="flex flex-wrap gap-2">
            {ACCESS_LABELS.map((a) => (
              <Chip
                key={a.value}
                on={prefs.accessNeeds.includes(a.value)}
                onClick={() => toggleAccess(a.value)}
              >
                {a.label}
              </Chip>
            ))}
          </div>
          <p className="acc-hint mt-3">
            {prefs.accessNeeds.length
              ? ACCESS_LABELS.filter((a) => prefs.accessNeeds.includes(a.value))
                  .map((a) => a.hint)
                  .join(" · ")
              : "Nothing selected — we won't filter on comfort needs."}
          </p>
          {prefs.mobility === "wheelchair" && (
            <p className="acc-note mt-3">
              Step-free access is set as a hard requirement in your walking preference, so
              experiences without confirmed step-free access are never recommended to you.
            </p>
          )}
        </AccountCard>

        {/* saved / trips shortcuts with real empty states */}
        <AccountCard title="Your activity">
          {user.savedExperienceIds.length === 0 && (bookings ?? []).length === 0 ? (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 20s-7-4.5-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.5 12 20 12 20z" strokeLinejoin="round" />
                </svg>
              }
              title="Your journey hasn't started yet"
              body="Save experiences you love and book your first one — they'll both show up here."
              ctaLabel="Start exploring"
              ctaHref="/discover"
            />
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link href="/saved" className="btn btn-ghost btn-sm">
                {user.savedExperienceIds.length} saved experience
                {user.savedExperienceIds.length === 1 ? "" : "s"}
              </Link>
              <Link href="/trips" className="btn btn-ghost btn-sm">
                {(bookings ?? []).length} booking{(bookings ?? []).length === 1 ? "" : "s"}
              </Link>
              <Link href="/discover" className="btn btn-brand btn-sm">
                Plan my day →
              </Link>
            </div>
          )}
        </AccountCard>
      </div>
    </div>
  );
}
