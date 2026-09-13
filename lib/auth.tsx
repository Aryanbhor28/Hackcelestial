"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  type AppSettings,
  type ProfileInfo,
  type TravelPreferences,
} from "./profile";

/**
 * Demo authentication + account store for the prototype.
 *
 * Everything lives in the browser: there is no auth backend, no session cookie
 * and no network call. Accounts are kept in localStorage so a sign-up, a saved
 * preference or a changed password survives a refresh. Passwords are stored in
 * plain text in that same store — acceptable only because nothing here is real
 * and nothing ever leaves the device, and they are never rendered or logged.
 *
 * This file is the single integration point: swapping it for a real provider
 * (NextAuth, Clerk, a custom API) touches no component.
 */

export type Role = "traveler" | "provider";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** ISO date the account was created */
  memberSince: string;
  profile: ProfileInfo;
  preferences: TravelPreferences;
  settings: AppSettings;
  savedExperienceIds: string[];
  /** provider accounts link to a seeded provider record */
  providerId?: string;
}

interface Account extends User {
  password: string;
}

interface AuthValue {
  user: User | null;
  /** false until localStorage has been read, so the header never flickers */
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<User>;
  logout: () => void;
  /** shallow-merges identity fields (name/email) */
  updateAccount: (patch: Partial<Pick<User, "name" | "email">>) => void;
  updateProfile: (patch: Partial<ProfileInfo>) => void;
  updatePreferences: (patch: Partial<TravelPreferences>) => void;
  updateSettings: (patch: DeepPartial<AppSettings>) => void;
  changePassword: (current: string, next: string) => Promise<void>;
  toggleSaved: (experienceId: string) => boolean;
  isSaved: (experienceId: string) => boolean;
  clearSaved: () => void;
  resetPreferences: () => void;
  deleteAccount: () => void;
}

type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> };

const USER_KEY = "localflow.user";
const ACCOUNTS_KEY = "localflow.accounts";

const AuthContext = createContext<AuthValue | null>(null);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / storage disabled — the session simply won't persist */
  }
}

/** Older stored records predate profile/preferences/settings; fill the gaps. */
function hydrate<T extends Partial<Account>>(a: T): T & Account {
  return {
    ...a,
    memberSince: a.memberSince ?? "2026-09-01",
    profile: { ...DEFAULT_PROFILE, ...(a.profile ?? {}) },
    preferences: { ...DEFAULT_PREFERENCES, ...(a.preferences ?? {}) },
    settings: {
      ...DEFAULT_SETTINGS,
      ...(a.settings ?? {}),
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(a.settings?.notifications ?? {}) },
      privacy: { ...DEFAULT_SETTINGS.privacy, ...(a.settings?.privacy ?? {}) },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(a.settings?.appearance ?? {}) },
      locale: { ...DEFAULT_SETTINGS.locale, ...(a.settings?.locale ?? {}) },
    },
    savedExperienceIds: a.savedExperienceIds ?? [],
  } as T & Account;
}

const strip = (a: Account): User => {
  // never let the password leave this module
  const { password: _password, ...rest } = a;
  void _password;
  return rest;
};

/** Pre-made logins so the demo can be shown without signing up. */
const DEMO_ACCOUNTS: Account[] = [
  hydrate({
    id: "u_demo_traveler",
    name: "Ananya Rao",
    email: "traveler@localflow.app",
    password: "localflow",
    role: "traveler",
    memberSince: "2026-09-01",
    profile: { phone: "+91 98xxx 10241", country: "India", city: "Bengaluru", avatar: null },
    preferences: {
      ...DEFAULT_PREFERENCES,
      preference: "prefer_local",
      interests: ["culture", "food"],
      budgetPerPerson: 900,
      pace: "relaxing",
      mobility: "low_walking",
      travelerType: "parents",
      groupSize: 3,
    },
  } as Partial<Account>) as Account,
  hydrate({
    id: "u_demo_provider",
    name: "Devi Sharma",
    email: "host@localflow.app",
    password: "localflow",
    role: "provider",
    providerId: "p_sharma",
    memberSince: "2026-08-12",
    profile: { phone: "+91 98xxx 41120", country: "India", city: "Old Manali", avatar: null },
  } as Partial<Account>) as Account,
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const accounts = read<Account[]>(ACCOUNTS_KEY, []);
    if (accounts.length === 0) write(ACCOUNTS_KEY, DEMO_ACCOUNTS);
    const stored = read<User | null>(USER_KEY, null);
    setUser(stored ? hydrate(stored as Partial<Account>) : null);
    setReady(true);
  }, []);

  /**
   * Writes a new user everywhere at once.
   *
   * Deliberately NOT called from inside a setState updater: updaters must stay
   * pure, and React invokes them twice in development. A non-idempotent change
   * like toggling a saved experience silently cancelled itself when the write
   * lived in the updater.
   */
  const commit = useCallback((next: User) => {
    setUser(next);
    write(USER_KEY, next);
    const accounts = read<Account[]>(ACCOUNTS_KEY, DEMO_ACCOUNTS);
    const i = accounts.findIndex((a) => a.id === next.id);
    if (i !== -1) {
      accounts[i] = { ...accounts[i], ...next, password: accounts[i].password };
      write(ACCOUNTS_KEY, accounts);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await wait(420); // lets the button's pending state actually read as work
    const accounts = read<Account[]>(ACCOUNTS_KEY, DEMO_ACCOUNTS).map(hydrate);
    const found = accounts.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!found) throw new Error("We don't recognise that email address.");
    if (found.password !== password) throw new Error("That password doesn't match.");

    const next = strip(found);
    write(USER_KEY, next);
    setUser(next);
    return next;
  }, []);

  const signup = useCallback(
    async (input: { name: string; email: string; password: string; role: Role }) => {
      await wait(480);
      const accounts = read<Account[]>(ACCOUNTS_KEY, DEMO_ACCOUNTS);
      const email = input.email.trim().toLowerCase();
      if (accounts.some((a) => a.email.toLowerCase() === email))
        throw new Error("An account already exists for that email.");

      const account = hydrate({
        id: `u_${Math.random().toString(36).slice(2, 9)}`,
        name: input.name.trim(),
        email: input.email.trim(),
        password: input.password,
        role: input.role,
        memberSince: new Date().toISOString().slice(0, 10),
      } as Partial<Account>) as Account;

      write(ACCOUNTS_KEY, [...accounts, account]);
      const next = strip(account);
      write(USER_KEY, next);
      setUser(next);
      return next;
    },
    []
  );

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const updateAccount = useCallback(
    (patch: Partial<Pick<User, "name" | "email">>) => {
      if (!user) return;
      commit({ ...user, ...patch });
    },
    [user, commit]
  );

  const updateProfile = useCallback(
    (patch: Partial<ProfileInfo>) => {
      if (!user) return;
      commit({ ...user, profile: { ...user.profile, ...patch } });
    },
    [user, commit]
  );

  const updatePreferences = useCallback(
    (patch: Partial<TravelPreferences>) => {
      if (!user) return;
      commit({ ...user, preferences: { ...user.preferences, ...patch } });
    },
    [user, commit]
  );

  const updateSettings = useCallback(
    (patch: DeepPartial<AppSettings>) => {
      if (!user) return;
      commit({
        ...user,
        settings: {
          notifications: { ...user.settings.notifications, ...(patch.notifications ?? {}) },
          privacy: { ...user.settings.privacy, ...(patch.privacy ?? {}) },
          appearance: { ...user.settings.appearance, ...(patch.appearance ?? {}) },
          locale: { ...user.settings.locale, ...(patch.locale ?? {}) },
        },
      });
    },
    [user, commit]
  );

  const changePassword = useCallback(
    async (current: string, next: string) => {
      await wait(420);
      const accounts = read<Account[]>(ACCOUNTS_KEY, DEMO_ACCOUNTS);
      const i = accounts.findIndex((a) => a.id === user?.id);
      if (i === -1) throw new Error("You need to be signed in.");
      if (accounts[i].password !== current)
        throw new Error("Your current password isn't right.");
      if (next.length < 6) throw new Error("Use at least 6 characters.");
      if (next === current) throw new Error("That's already your password.");
      accounts[i] = { ...accounts[i], password: next };
      write(ACCOUNTS_KEY, accounts);
    },
    [user?.id]
  );

  const toggleSaved = useCallback(
    (experienceId: string) => {
      if (!user) return false;
      const has = user.savedExperienceIds.includes(experienceId);
      commit({
        ...user,
        savedExperienceIds: has
          ? user.savedExperienceIds.filter((x) => x !== experienceId)
          : [...user.savedExperienceIds, experienceId],
      });
      return !has;
    },
    [user, commit]
  );

  const isSaved = useCallback(
    (experienceId: string) => Boolean(user?.savedExperienceIds.includes(experienceId)),
    [user]
  );

  const clearSaved = useCallback(() => {
    if (!user) return;
    commit({ ...user, savedExperienceIds: [] });
  }, [user, commit]);

  const resetPreferences = useCallback(() => {
    if (!user) return;
    commit({ ...user, preferences: { ...DEFAULT_PREFERENCES } });
  }, [user, commit]);

  const deleteAccount = useCallback(() => {
    const accounts = read<Account[]>(ACCOUNTS_KEY, DEMO_ACCOUNTS);
    write(ACCOUNTS_KEY, accounts.filter((a) => a.id !== user?.id));
    try {
      window.localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, [user?.id]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      login,
      signup,
      logout,
      updateAccount,
      updateProfile,
      updatePreferences,
      updateSettings,
      changePassword,
      toggleSaved,
      isSaved,
      clearSaved,
      resetPreferences,
      deleteAccount,
    }),
    [
      user,
      ready,
      login,
      signup,
      logout,
      updateAccount,
      updateProfile,
      updatePreferences,
      updateSettings,
      changePassword,
      toggleSaved,
      isSaved,
      clearSaved,
      resetPreferences,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Where a role lands after authenticating. Reuses existing routes. */
export const homeFor = (role: Role) => (role === "provider" ? "/provider" : "/discover");

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "LF";

export const DEMO_LOGINS = DEMO_ACCOUNTS.map((a) => ({
  email: a.email,
  role: a.role,
  password: "localflow",
}));
