// Maps arbitrary Bangla text to the ordered subset of AVAILABLE sign words that best conveys
// it, using Gemini. Lets Voice→Sign work for free-form speech even though we only have a
// fixed vocabulary of sign animations. POST { text, available:[bn] } -> { words:[bn] }

import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "no key" }, { status: 500 });

  let text: string, available: string[];
  try {
    ({ text, available } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!text?.trim() || !Array.isArray(available) || !available.length) {
    return NextResponse.json({ words: [] });
  }

  const prompt =
    `তোমাকে একটি বাংলা বাক্য আর কিছু "উপলব্ধ শব্দ" দেওয়া হলো যাদের সাইন-ভাষা অ্যানিমেশন আছে। ` +
    `বাক্যটির অর্থ যতটা সম্ভব বোঝাতে, শুধুমাত্র উপলব্ধ শব্দগুলো থেকে প্রাসঙ্গিক শব্দগুলো সঠিক ক্রমে বেছে দাও। ` +
    `শুধু একটি JSON অ্যারে দাও, যেমন ["বাবা","চা"]। উপলব্ধ শব্দের বাইরের কিছু দিও না।\n` +
    `বাক্য: ${text}\nউপলব্ধ শব্দ: ${available.join(", ")}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 120, responseMimeType: "application/json" },
        }),
      },
    );
    if (!res.ok) return NextResponse.json({ words: [] });
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "[]";
    let words: string[] = [];
    try { words = JSON.parse(raw); } catch { words = []; }
    const set = new Set(available);
    return NextResponse.json({ words: words.filter((w) => set.has(w)) });
  } catch {
    return NextResponse.json({ words: [] });
  }
}
