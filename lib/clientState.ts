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

/**
 * Confidence metadata from the intent extractor, carried alongside the request
 * so the results page can honestly show what the traveler stated versus what
 * was inferred or defaulted. Purely additive: `q` still decodes on its own.
 */
export type FieldConfidence = "explicit" | "inferred" | "default";
export interface RequestMeta {
  conf: Partial<Record<string, FieldConfidence>>;
  evidence: Partial<Record<string, string>>;
  /** which fields came from the signed-in profile rather than the sentence */
  fromProfile: string[];
  rawText?: string;
}

export function encodeMeta(meta: RequestMeta): string {
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(JSON.stringify(meta), "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(JSON.stringify(meta))));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeMeta(q: string | null): RequestMeta | null {
  if (!q) return null;
  try {
    const b64 = q.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window === "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as RequestMeta;
  } catch {
    return null;
  }
}
