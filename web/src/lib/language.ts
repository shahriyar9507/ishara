// Client helper for the Gemini sentence builder (calls our /api/sentence route).
// Debounced usage lives in the page; this is a thin fetch wrapper with a safe fallback.

export async function buildSentence(words: string[], signal?: AbortSignal): Promise<string> {
  if (words.length === 0) return "";
  try {
    const res = await fetch("/api/sentence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words }),
      signal,
    });
    if (!res.ok) return words.join(" ");
    const data = (await res.json()) as { sentence?: string };
    return data.sentence?.trim() || words.join(" ");
  } catch {
    // Offline or error → graceful fallback to the raw words.
    return words.join(" ");
  }
}
