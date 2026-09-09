import type { Extraction } from "./intent";
import { extractIntent } from "./intent";

/**
 * Optional LLM upgrade path. The deterministic extractor in ./intent.ts is
 * always the source of truth for the demo; if ANTHROPIC_API_KEY is present we
 * ask Claude to fill the fields the rules left at their defaults, and merge
 * only those. Any failure falls back silently to the rule output.
 */

const MODEL = "claude-opus-5";

export const llmEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

const SYSTEM = `You extract structured travel constraints from a traveler's sentence.
Return ONLY minified JSON with any of these keys you can determine confidently:
{"availableMin":number,"startMin":number,"budgetPerPerson":number,"groupSize":number,
"travelerType":"solo|couple|family|friends|parents|kids",
"interests":["culture"|"food"|"adventure"|"workshop"|"nature"|"wellness"|"shopping"|"nightlife"|"event"],
"preference":"local_only|prefer_local|no_preference|popular",
"mobility":"low_walking|moderate|high|wheelchair",
"pace":"relaxing|balanced|energetic"}
startMin and availableMin are minutes. Omit keys you cannot infer. No prose.`;

export async function extractWithLlm(raw: string): Promise<{
  extraction: Extraction;
  usedLlm: boolean;
}> {
  const base = extractIntent(raw);
  if (!llmEnabled() || !raw.trim()) return { extraction: base, usedLlm: false };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: raw }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { extraction: base, usedLlm: false };

    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text?.trim() ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    // merge: the LLM only fills gaps the rules could not resolve
    const merged: Extraction = { ...base };
    for (const key of Object.keys(parsed) as (keyof Extraction)[]) {
      const field = merged[key];
      if (!field || field.confidence !== "default") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[key] = {
        value: parsed[key],
        evidence: "inferred by Claude from your sentence",
        confidence: "inferred",
      };
    }
    return { extraction: merged, usedLlm: true };
  } catch {
    return { extraction: base, usedLlm: false };
  }
}
