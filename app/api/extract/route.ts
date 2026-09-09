import { NextResponse } from "next/server";
import { toRequest } from "@/lib/ai/intent";
import { extractWithLlm, llmEnabled } from "@/lib/ai/llm";

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };
  const raw = (text ?? "").trim();
  const { extraction, usedLlm } = await extractWithLlm(raw);
  return NextResponse.json({
    extraction,
    request: toRequest(extraction, raw),
    engine: usedLlm ? "claude" : "rules",
    llmAvailable: llmEnabled(),
  });
}
