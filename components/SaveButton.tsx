"use client";

import { useAuth } from "@/lib/auth";
import { useToast } from "./Toast";

/**
 * Heart toggle. Saving requires an account — for signed-out visitors the button
 * says so rather than silently doing nothing.
 */
export function SaveButton({
  experienceId,
  label = false,
  onDark = false,
}: {
  experienceId: string;
  /** show a text label beside the heart */
  label?: boolean;
  onDark?: boolean;
}) {
  const { user, ready, toggleSaved } = useAuth();
  const { toast } = useToast();

  if (!ready) return null;

  const saved = Boolean(user?.savedExperienceIds.includes(experienceId));

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Sign in to save experiences.", "info");
      return;
    }
    const nowSaved = toggleSaved(experienceId);
    toast(nowSaved ? "Saved to your account" : "Removed from saved");
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save this experience"}
      title={saved ? "Remove from saved" : "Save this experience"}
      className={`save-btn ${saved ? "is-on" : ""} ${onDark ? "on-dark" : ""} ${
        label ? "has-label" : ""
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 20s-7-4.5-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.5 12 20 12 20z" strokeLinejoin="round" />
      </svg>
      {label && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
