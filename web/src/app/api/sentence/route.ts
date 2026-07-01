// Phase 4 — Gemini sentence builder (server-side, keeps the API key secret).
// POST { words: string[] }  ->  { sentence: string }
// Joins recognized Bangla words into one natural, grammatically-correct Bangla sentence.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  let words: unknown;
  try {
    ({ words } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: "words[] required" }, { status: 400 });
  }

  const list = words.map((w) => String(w)).join(", ");
  const prompt =
    `তুমি একজন বাংলা ভাষা সহকারী। নিচের শব্দগুলো একজন ইশারা-ভাষা ব্যবহারকারী দেখিয়েছে। ` +
    `এগুলো দিয়ে একটি স্বাভাবিক, শুদ্ধ ও সংক্ষিপ্ত বাংলা বাক্য তৈরি করো। ` +
    `শুধু বাক্যটি দাও, কোনো ব্যাখ্যা বা উদ্ধৃতি চিহ্ন নয়।\nশব্দ: ${list}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 100 },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: "gemini request failed", status: res.status, detail: detail.slice(0, 300) },
        { status: 502 },
      );
    }

    const data = await res.json();
    const sentence: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim() ?? "";

    // Fallback: if the model returns nothing, just join the words.
    return NextResponse.json({ sentence: sentence || words.join(" ") });
  } catch (err) {
    return NextResponse.json(
      { error: "gemini fetch error", detail: String(err).slice(0, 200) },
      { status: 502 },
    );
  }
}
