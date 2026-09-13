"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/types";
import { defaultRequest } from "@/lib/ai/intent";
import { encodeRequest } from "@/lib/clientState";

const TABS: { key: Category | "all"; label: string; icon: React.ReactNode }[] = [
  {
    key: "all",
    label: "Experiences",
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="10" cy="10" r="7.2" />
        <path d="M13 7 8.6 8.6 7 13l4.4-1.6L13 7z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "food",
    label: "Food & Drinks",
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 2.6v6.2M7.4 2.6v6.2M6.2 8.8V17M13.4 2.6c-1.4 1.4-1.6 5.4 0 6.4V17" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "culture",
    label: "Culture & Heritage",
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 8.2 10 4l7 4.2M4.6 8.6V15M8.2 8.6V15M11.8 8.6V15M15.4 8.6V15M3 16.6h14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "nature",
    label: "Nature & Outdoors",
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2.4 15.4 7.6 6l3.4 5.6M9.4 15.4l3.6-6.4 4.6 6.4z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "workshop",
    label: "Workshops",
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 17 9 11M11.6 3.4l1.8 1.8M12.5 2.5 17.5 7.5 15 10l-5-5zM10 10l-1.6 1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "event",
    label: "Hidden Gems",
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 3h10l3 4.2-8 10.3L2 7.2 5 3zM2 7.2h16M7.4 3 10 17.5 12.6 3" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const GROUPS = ["Just me", "2 people", "3 people", "4 people", "5+ people"];

export function HeroSearch() {
  const router = useRouter();
  const [tab, setTab] = useState<Category | "all">("all");
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("Today");
  const [group, setGroup] = useState(GROUPS[1]);

  const go = () => {
    const base = defaultRequest();
    const size = group === "Just me" ? 1 : parseInt(group, 10) || 2;
    const req = {
      ...base,
      location: where.trim() || "Manali",
      groupSize: size,
      travelerType: size === 1 ? ("solo" as const) : base.travelerType,
      interests: tab === "all" ? [] : [tab],
    };
    router.push(`/results?q=${encodeRequest(req)}`);
  };

  return (
    <div className="search-shell overflow-hidden">
      {/* category tabs */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto p-2.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tab ${tab === t.key ? "tab-on" : ""}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* search row */}
      <div className="px-2.5 pb-2.5">
        <div className="hero-search-row grid items-center gap-2 rounded-2xl bg-white p-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <label className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M10 17.5s6-5.2 6-9.3a6 6 0 1 0-12 0c0 4.1 6 9.3 6 9.3z" />
              <circle cx="10" cy="8" r="2.2" />
            </svg>
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-muted)]"
              placeholder="Where are you going?"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go()}
            />
          </label>

          <label className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 sm:border-l sm:border-[var(--color-line)]">
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="4.5" width="14" height="12.5" rx="2.2" />
              <path d="M3 8.4h14M6.8 2.8v3.2M13.2 2.8v3.2" strokeLinecap="round" />
            </svg>
            <select
              className="w-full cursor-pointer appearance-none bg-transparent text-sm outline-none"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            >
              <option>Today</option>
              <option>Tomorrow</option>
              <option>This weekend</option>
            </select>
          </label>

          <label className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 sm:border-l sm:border-[var(--color-line)]">
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0 text-[var(--color-muted)]" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="7.6" cy="7.4" r="2.9" />
              <path d="M2.6 16.4c.9-2.7 2.7-4 5-4s4.1 1.3 5 4M13.4 5.2a2.7 2.7 0 0 1 0 4.9M15.6 16.4c-.4-1.6-1-2.8-1.9-3.6" strokeLinecap="round" />
            </svg>
            <select
              className="w-full cursor-pointer appearance-none bg-transparent text-sm outline-none"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              {GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>

          <button className="btn btn-brand h-[52px] px-7" onClick={go}>
            Find My Experience
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
