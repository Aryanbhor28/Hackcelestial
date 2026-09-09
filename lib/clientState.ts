import type { TravelerRequest } from "./types";

/** URL-safe base64 so a whole traveler request travels in a shareable link. */
export function encodeRequest(req: TravelerRequest): string {
  const json = JSON.stringify(req);
  const b64 = typeof window === "undefined"
    ? Buffer.from(json, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRequest(q: string | null): TravelerRequest | null {
  if (!q) return null;
  try {
    const b64 = q.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window === "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as TravelerRequest;
  } catch {
    return null;
  }
}
