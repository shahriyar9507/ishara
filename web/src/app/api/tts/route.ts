// Cloud TTS fallback — proxies Google Translate's Bangla TTS so the app always has voice,
// even on devices with no Bangla Web Speech voice (e.g. many Windows setups).
// GET /api/tts?text=...&lang=bn  ->  audio/mpeg

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") || "").slice(0, 200); // endpoint limits length
  const lang = searchParams.get("lang") || "bn";
  if (!text.trim()) return new Response("text required", { status: 400 });

  const url =
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob` +
    `&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://translate.google.com/" },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("tts upstream failed", { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("tts error", { status: 502 });
  }
}
