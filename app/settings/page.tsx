"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { AccountGate } from "@/components/account/AccountGate";
import {
  AccountCard,
  DangerRow,
  Row,
  Segmented,
  SelectInput,
  TextInput,
  Toggle,
} from "@/components/account/Ui";
import {
  CURRENCY_LABELS,
  INTEREST_LABELS,
  LANGUAGE_LABELS,
  MOBILITY_LABELS,
  PACE_LABELS,
  PREFERENCE_LABELS,
  type Currency,
  type Language,
  type Theme,
} from "@/lib/profile";
import type { Category } from "@/lib/types";

type SectionId =
  | "account"
  | "preferences"
  | "notifications"
  | "privacy"
  | "appearance"
  | "security"
  | "danger";

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  {
    id: "account",
    label: "Account",
    icon: (
      <>
        <circle cx="10" cy="7.4" r="3.1" />
        <path d="M3.8 16.6c1.2-3 3.5-4.5 6.2-4.5s5 1.5 6.2 4.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: (
      <>
        <path d="M4 6h12M4 10h12M4 14h12" strokeLinecap="round" />
        <circle cx="7.5" cy="6" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="12.5" cy="14" r="1.6" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <>
        <path d="M6 8.6a4 4 0 0 1 8 0c0 3.4 1.4 4.6 1.4 4.6H4.6S6 12 6 8.6z" strokeLinejoin="round" />
        <path d="M8.6 16a1.6 1.6 0 0 0 2.8 0" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: (
      <>
        <rect x="4.4" y="8.6" width="11.2" height="8" rx="2" />
        <path d="M7.2 8.6V6.8a2.8 2.8 0 0 1 5.6 0v1.8" />
      </>
    ),
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: (
      <>
        <circle cx="10" cy="10" r="6.6" />
        <path d="M10 3.4v13.2" />
        <path d="M10 3.4a6.6 6.6 0 0 1 0 13.2z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: "security",
    label: "Security",
    icon: (
      <>
        <path d="M10 2.8 4.4 5v4.4c0 3.4 2.3 6.4 5.6 7.4 3.3-1 5.6-4 5.6-7.4V5L10 2.8z" strokeLinejoin="round" />
        <path d="M7.6 10 9.4 11.8 12.8 8.4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: "danger",
    label: "Danger zone",
    icon: (
      <>
        <path d="M10 3.4 2.8 16.2h14.4L10 3.4z" strokeLinejoin="round" />
        <path d="M10 8.4v3.2M10 14h.01" strokeLinecap="round" />
      </>
    ),
  },
];

function SettingsInner() {
  const {
    user,
    updateAccount,
    updateProfile,
    updatePreferences,
    updateSettings,
    changePassword,
    clearSaved,
    resetPreferences,
    deleteAccount,
    logout,
  } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();

  const [section, setSection] = useState<SectionId>("account");

  useEffect(() => {
    const s = params.get("s") as SectionId | null;
    if (s && SECTIONS.some((x) => x.id === s)) setSection(s);
  }, [params]);

  // account fields
  const [acct, setAcct] = useState({ name: "", email: "", phone: "" });
  const [acctDirty, setAcctDirty] = useState(false);

  // password fields
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setAcct({ name: user.name, email: user.email, phone: user.profile.phone });
    setAcctDirty(false);
  }, [user]);

  if (!user) return null;
  const s = user.settings;
  const prefs = user.preferences;
  const isProvider = user.role === "provider";

  const select = (id: SectionId) => {
    setSection(id);
    router.replace(`/settings?s=${id}`, { scroll: false });
  };

  const saveAccount = () => {
    if (acct.name.trim().length < 2) return toast("Name is too short.", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acct.email.trim()))
      return toast("That email doesn't look right.", "error");
    updateAccount({ name: acct.name.trim(), email: acct.email.trim() });
    updateProfile({ phone: acct.phone.trim() });
    setAcctDirty(false);
    toast("Account updated");
  };

  const submitPassword = async () => {
    setPwErr(null);
    if (pw.next !== pw.confirm) return setPwErr("The new passwords don't match.");
    setPwBusy(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      toast("Password changed");
    } catch (e) {
      setPwErr(e instanceof Error ? e.message : "Could not change the password.");
    } finally {
      setPwBusy(false);
    }
  };

  const toggleInterest = (c: Category) => {
    const has = prefs.interests.includes(c);
    updatePreferences({
      interests: has ? prefs.interests.filter((x) => x !== c) : [...prefs.interests, c],
    });
    toast("Preferences saved");
  };

  return (
    <div className="acc-grid is-settings">
      {/* ------------------------------------------------------- nav */}
      <aside className="acc-side">
        <nav className="acc-nav" aria-label="Settings sections">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => select(sec.id)}
              aria-current={section === sec.id ? "page" : undefined}
              className={`acc-nav-item ${section === sec.id ? "is-on" : ""} ${
                sec.id === "danger" ? "is-danger" : ""
              }`}
            >
              <svg viewBox="0 0 20 20" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.6">
                {sec.icon}
              </svg>
              {sec.label}
            </button>
          ))}
        </nav>
        <Link href="/profile" className="btn btn-ghost btn-sm mt-4 w-full">
          Back to profile
        </Link>
      </aside>

      {/* ---------------------------------------------------- panels */}
      <div className="acc-main">
        {section === "account" && (
          <AccountCard
            title="Personal information"
            hint="Your identity on LocalFlow."
            action={
              acctDirty ? (
                <button className="btn btn-brand btn-sm" onClick={saveAccount}>
                  Save Changes
                </button>
              ) : undefined
            }
          >
            <div className="acc-fields">
              <Row label="Full name" htmlFor="st-name">
                <TextInput
                  id="st-name"
                  value={acct.name}
                  onChange={(v) => {
                    setAcct((a) => ({ ...a, name: v }));
                    setAcctDirty(true);
                  }}
                  autoComplete="name"
                />
              </Row>
              <Row label="Email" htmlFor="st-email">
                <TextInput
                  id="st-email"
                  type="email"
                  value={acct.email}
                  onChange={(v) => {
                    setAcct((a) => ({ ...a, email: v }));
                    setAcctDirty(true);
                  }}
                  autoComplete="email"
                />
              </Row>
              <Row label="Phone" htmlFor="st-phone">
                <TextInput
                  id="st-phone"
                  value={acct.phone}
                  onChange={(v) => {
                    setAcct((a) => ({ ...a, phone: v }));
                    setAcctDirty(true);
                  }}
                  placeholder="+91 …"
                  autoComplete="tel"
                />
              </Row>
              <Row label="Role" hint="Travelers and hosts get different tools.">
                <p className="acc-value">{isProvider ? "Experience Provider" : "Traveler"}</p>
              </Row>
            </div>
          </AccountCard>
        )}

        {section === "preferences" && (
          <>
            {!isProvider && (
              <AccountCard
                title="Default discovery preferences"
                hint="The starting point for every search. Anything you type into Plan My Day wins for that search."
              >
                <div className="acc-fields">
                  <Row label="Experience preference">
                    <Segmented
                      name="Experience preference"
                      value={prefs.preference}
                      options={PREFERENCE_LABELS}
                      onChange={(v) => {
                        updatePreferences({ preference: v });
                        toast("Preferences saved");
                      }}
                    />
                  </Row>
                  <Row label="Interests">
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_LABELS.map((i) => (
                        <button
                          key={i.value}
                          type="button"
                          aria-pressed={prefs.interests.includes(i.value)}
                          onClick={() => toggleInterest(i.value)}
                          className={`acc-chip ${prefs.interests.includes(i.value) ? "is-on" : ""}`}
                        >
                          {i.label}
                        </button>
                      ))}
                    </div>
                  </Row>
                  <Row label="Activity intensity">
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
                  <Row label="Walking preference">
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
                  <Row label="More travel preferences">
                    <Link href="/profile#preferences" className="btn btn-ghost btn-sm">
                      Open full preferences
                    </Link>
                  </Row>
                </div>
              </AccountCard>
            )}

            <AccountCard
              title="Language & currency"
              hint="Stored on your account so pricing and content can follow it."
            >
              <div className="acc-fields">
                <Row label="Preferred language" htmlFor="st-lang">
                  <SelectInput<Language>
                    id="st-lang"
                    value={s.locale.language}
                    options={LANGUAGE_LABELS}
                    onChange={(v) => {
                      updateSettings({ locale: { language: v } });
                      toast("Language preference saved");
                    }}
                  />
                </Row>
                <Row label="Preferred currency" htmlFor="st-cur">
                  <SelectInput<Currency>
                    id="st-cur"
                    value={s.locale.currency}
                    options={CURRENCY_LABELS.map((c) => ({
                      value: c.value,
                      label: `${c.symbol}  ${c.label}`,
                    }))}
                    onChange={(v) => {
                      updateSettings({ locale: { currency: v } });
                      toast("Currency preference saved");
                    }}
                  />
                </Row>
              </div>
              <p className="acc-note mt-4">
                Your choice is saved and read by the account pages. Experience prices across the
                catalogue are still shown in ₹ — the pilot has no exchange-rate or translation
                layer yet, and we would rather store the preference than fake a conversion.
              </p>
            </AccountCard>
          </>
        )}

        {section === "notifications" && (
          <AccountCard
            title="Notifications"
            hint="What LocalFlow should tell you about."
          >
            <div className="acc-toggles">
              <Toggle
                id="n-booking"
                label="Booking updates"
                hint="When a host accepts or declines your request."
                checked={s.notifications.bookingUpdates}
                onChange={(v) => {
                  updateSettings({ notifications: { bookingUpdates: v } });
                  toast("Notification preferences updated");
                }}
              />
              <Toggle
                id="n-avail"
                label="Experience availability changes"
                hint="If something you booked is cancelled or rescheduled."
                checked={s.notifications.availabilityChanges}
                onChange={(v) => {
                  updateSettings({ notifications: { availabilityChanges: v } });
                  toast("Notification preferences updated");
                }}
              />
              <Toggle
                id="n-trip"
                label="Trip reminders"
                hint="A nudge before an experience starts."
                checked={s.notifications.tripReminders}
                onChange={(v) => {
                  updateSettings({ notifications: { tripReminders: v } });
                  toast("Notification preferences updated");
                }}
              />
              <Toggle
                id="n-rec"
                label="Recommendation updates"
                hint="When something new matches your saved preferences."
                checked={s.notifications.recommendationUpdates}
                onChange={(v) => {
                  updateSettings({ notifications: { recommendationUpdates: v } });
                  toast("Notification preferences updated");
                }}
              />
              <Toggle
                id="n-msg"
                label={isProvider ? "Traveler messages" : "Provider messages"}
                hint="Direct messages about a booking."
                checked={s.notifications.providerMessages}
                onChange={(v) => {
                  updateSettings({ notifications: { providerMessages: v } });
                  toast("Notification preferences updated");
                }}
              />
            </div>
            <p className="acc-note mt-4">
              These preferences are stored on your account and read by the app. No email, SMS or
              WhatsApp is sent in this prototype — those channels are a planned integration, and
              the settings exist so the behaviour is already wired when they land.
            </p>
          </AccountCard>
        )}

        {section === "privacy" && (
          <AccountCard title="Privacy" hint="How your data shapes what you see.">
            <div className="acc-toggles">
              <Toggle
                id="p-personal"
                label="Personalized recommendations"
                hint="Allow LocalFlow to use your saved travel preferences to improve experience matching."
                checked={s.privacy.personalizedRecommendations}
                onChange={(v) => {
                  updateSettings({ privacy: { personalizedRecommendations: v } });
                  toast(v ? "Personalization on" : "Personalization off");
                }}
              />
              <Toggle
                id="p-activity"
                label="Activity personalization"
                hint="Use your saved experiences and past bookings as additional signals."
                checked={s.privacy.activityPersonalization}
                onChange={(v) => {
                  updateSettings({ privacy: { activityPersonalization: v } });
                  toast("Privacy preferences updated");
                }}
              />
              <Row
                label="Profile visibility"
                hint="Who can see your name and travel style."
              >
                <Segmented
                  name="Profile visibility"
                  value={s.privacy.profileVisibility}
                  options={[
                    { value: "private" as const, label: "Private" },
                    { value: "community" as const, label: "Community" },
                  ]}
                  onChange={(v) => {
                    updateSettings({ privacy: { profileVisibility: v } });
                    toast("Privacy preferences updated");
                  }}
                />
              </Row>
            </div>
            <p className="acc-note mt-4">
              Turning off personalized recommendations takes effect immediately — Plan My Day then
              starts from a blank request instead of your saved preferences. All account data in
              this prototype stays in your own browser.
            </p>
          </AccountCard>
        )}

        {section === "appearance" && (
          <AccountCard title="Appearance" hint="How LocalFlow looks and moves.">
            <div className="acc-fields">
              <Row label="Theme" hint="System follows your device setting.">
                <Segmented
                  name="Theme"
                  value={s.appearance.theme}
                  options={[
                    { value: "system" as Theme, label: "System" },
                    { value: "light" as Theme, label: "Light" },
                    { value: "dark" as Theme, label: "Dark" },
                  ]}
                  onChange={(v) => {
                    updateSettings({ appearance: { theme: v } });
                    toast("Theme updated");
                  }}
                />
              </Row>
              <div className="acc-toggles">
                <Toggle
                  id="a-motion"
                  label="Reduced motion"
                  hint="Shortens the launch animation and removes non-essential transitions."
                  checked={s.appearance.reducedMotion}
                  onChange={(v) => {
                    updateSettings({ appearance: { reducedMotion: v } });
                    toast(v ? "Reduced motion on" : "Reduced motion off");
                  }}
                />
              </div>
            </div>
            <p className="acc-note mt-4">
              Reduced motion is also honoured automatically if your operating system requests it.
            </p>
          </AccountCard>
        )}

        {section === "security" && (
          <>
            <AccountCard title="Change password" hint="Applies to this demo account immediately.">
              <div className="acc-fields">
                <Row label="Current password" htmlFor="pw-cur">
                  <TextInput
                    id="pw-cur"
                    type={showPw ? "text" : "password"}
                    value={pw.current}
                    onChange={(v) => setPw((p) => ({ ...p, current: v }))}
                    autoComplete="current-password"
                  />
                </Row>
                <Row label="New password" htmlFor="pw-new" hint="At least 6 characters.">
                  <TextInput
                    id="pw-new"
                    type={showPw ? "text" : "password"}
                    value={pw.next}
                    onChange={(v) => setPw((p) => ({ ...p, next: v }))}
                    autoComplete="new-password"
                  />
                </Row>
                <Row label="Confirm new password" htmlFor="pw-conf">
                  <TextInput
                    id="pw-conf"
                    type={showPw ? "text" : "password"}
                    value={pw.confirm}
                    onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
                    autoComplete="new-password"
                  />
                </Row>
              </div>

              <label className="auth-check mt-3">
                <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
                <span className="auth-check-box" aria-hidden>
                  <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.6">
                    <path d="M3.5 8.4 6.5 11.3 12.5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Show passwords
              </label>

              {pwErr && (
                <p className="auth-form-error mt-3" role="alert">
                  {pwErr}
                </p>
              )}

              <button
                className="btn btn-brand btn-sm mt-4"
                onClick={submitPassword}
                disabled={pwBusy || !pw.current || !pw.next || !pw.confirm}
              >
                {pwBusy ? "Saving…" : "Save password"}
              </button>
            </AccountCard>

            <AccountCard title="Session" hint="Where you're signed in.">
              <div className="acc-session">
                <div>
                  <p className="acc-toggle-label">This browser</p>
                  <p className="acc-hint">
                    Signed in as {user.email} · session stored locally on this device
                  </p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  Logout
                </button>
              </div>
              <p className="acc-note mt-4">
                This prototype uses browser-local demo authentication, so there is only ever one
                session and no server-side sessions to revoke.
              </p>
            </AccountCard>
          </>
        )}

        {section === "danger" && (
          <AccountCard title="Danger zone" hint="These actions cannot be undone.">
            <div className="acc-danger">
              {!isProvider && (
                <DangerRow
                  title="Clear saved experiences"
                  body={`Removes all ${user.savedExperienceIds.length} saved experience${
                    user.savedExperienceIds.length === 1 ? "" : "s"
                  } from your account.`}
                  actionLabel="Clear saved"
                  onAction={() => {
                    if (!confirm("Clear all saved experiences?")) return;
                    clearSaved();
                    toast("Saved experiences cleared");
                  }}
                />
              )}
              <DangerRow
                title="Reset travel preferences"
                body="Returns interests, budget, pace and accessibility to their defaults."
                actionLabel="Reset preferences"
                onAction={() => {
                  if (!confirm("Reset all travel preferences to defaults?")) return;
                  resetPreferences();
                  toast("Preferences reset");
                }}
              />
              <DangerRow
                title="Delete demo account"
                body="Removes this account and its data from this browser. Seeded experiences and providers are untouched."
                actionLabel="Delete account"
                onAction={() => {
                  if (!confirm("Delete this demo account? This cannot be undone.")) return;
                  deleteAccount();
                  router.push("/");
                }}
              />
            </div>
          </AccountCard>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="acc-page">
      <AccountGate>
        <Suspense fallback={<div className="shimmer h-64 rounded-2xl" />}>
          <SettingsInner />
        </Suspense>
      </AccountGate>
    </div>
  );
}
