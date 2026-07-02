// Whisper-style cleanup: takes raw speech-recognition text and returns corrected, well-formed
// Bangla (spelling, punctuation, spacing, obvious mis-hearings) using Gemini. POST { text } -> { text }

import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no key" }, { status: 500 });

  let text: string;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!text?.trim()) return NextResponse.json({ text: "" });

  const prompt =
    `নিচের লেখাটি ভয়েস রেকগনিশন থেকে এসেছে, তাই এতে বানান/যতিচিহ্ন/ফাঁকা/ভুল-শোনা শব্দ থাকতে পারে। ` +
    `এটিকে শুদ্ধ, স্বাভাবিক, সঠিক যতিচিহ্নসহ বাংলায় ঠিক করে দাও। অর্থ পাল্টাবে না, নতুন তথ্য যোগ করবে না। ` +
    `শুধু সংশোধিত লেখাটি দাও।\nলেখা: ${text}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
        }),
      },
    );
    if (!res.ok) return NextResponse.json({ text }); // fall back to raw
    const data = await res.json();
    const out =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim() ?? "";
    return NextResponse.json({ text: out || text });
  } catch {
    return NextResponse.json({ text });
  }
}
