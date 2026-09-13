"use client";

import { useRef, useState } from "react";
import { initialsOf, useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";

const MAX_BYTES = 1_500_000; // localStorage is small; keep well inside it
const SIDE = 256;

/**
 * Avatar chooser. The file never leaves the browser — it is downscaled on a
 * canvas and stored as a data URL alongside the rest of the demo account.
 * There is no upload service involved, real or pretend.
 */
export function AvatarPicker({ size = 92 }: { size?: number }) {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const avatar = user.profile.avatar;

  const pick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast("Choose an image file.", "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast("That image is too large — pick one under 1.5 MB.", "error");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await downscale(file);
      updateProfile({ avatar: dataUrl });
      toast("Photo updated");
    } catch {
      toast("Could not read that image.", "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="acc-avatar-wrap">
      <span
        className="acc-avatar-lg"
        style={{ width: size, height: size, fontSize: size * 0.3 }}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          initialsOf(user.name)
        )}
      </span>

      <button
        type="button"
        className="acc-avatar-edit"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Change profile photo"
        title="Change profile photo"
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 15.5V13l8-8 2.5 2.5-8 8H4z" strokeLinejoin="round" />
          <path d="M3 18h14" strokeLinecap="round" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
        }}
      />

      {avatar && (
        <button
          type="button"
          className="acc-avatar-remove"
          onClick={() => {
            updateProfile({ avatar: null });
            toast("Photo removed");
          }}
        >
          Remove photo
        </button>
      )}
    </div>
  );
}

/** Square-crops and shrinks to 256px so the data URL stays storage-friendly. */
function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = SIDE;
        canvas.height = SIDE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        const side = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          SIDE,
          SIDE
        );
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
