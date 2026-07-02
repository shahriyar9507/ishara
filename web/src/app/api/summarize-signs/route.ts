// Turns a recognized sign-word sequence (from a video) into a fluent sentence, a short
// summary, and a detailed interpretation. POST { words:[bn] } -> { sentence, summary, detailed }

import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no key" }, { status: 500 });

  let words: string[];
  try {
    ({ words } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!Array.isArray(words) || !words.length) {
    return NextResponse.json({ sentence: "", summary: "", detailed: "" });
  }

  const prompt =
    `একটি ইশারা-ভাষার ভিডিও থেকে ক্রমানুসারে এই শব্দগুলো চেনা গেছে: ${words.join(", ")}। ` +
    `এগুলোর ভিত্তিতে বাংলায় একটি JSON দাও ঠিক এই কী তিনটি দিয়ে: ` +
    `"sentence" (শব্দগুলো দিয়ে একটি স্বাভাবিক বাক্য), ` +
    `"summary" (এক লাইনে সারসংক্ষেপ), ` +
    `"detailed" (২-৪ বাক্যে বিস্তারিত ব্যাখ্যা — কী বলা হচ্ছে)। শুধু JSON দাও।`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 400, responseMimeType: "application/json" },
        }),
      },
    );
    if (!res.ok) return NextResponse.json({ sentence: words.join(" "), summary: "", detailed: "" });
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "{}";
    let out: { sentence?: string; summary?: string; detailed?: string } = {};
    try { out = JSON.parse(raw); } catch { out = { sentence: words.join(" ") }; }
    return NextResponse.json({
      sentence: out.sentence || words.join(" "),
      summary: out.summary || "",
      detailed: out.detailed || "",
    });
  } catch {
    return NextResponse.json({ sentence: words.join(" "), summary: "", detailed: "" });
  }
}
