"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { SignAvatar, type AnimFrame } from "@/components/SignAvatar";
import { MicIcon, StopIcon } from "@/components/Icons";
import { loadAnimations, availableWords, resolveKey, sequenceForKeys } from "@/lib/animations";
import { startRecognition, speechRecognitionSupported, type RecognitionHandle } from "@/lib/speechRecognition";

export default function VoiceToSignPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [words, setWords] = useState<{ en: string; bn: string }[]>([]);
  const [text, setText] = useState("");
  const [signed, setSigned] = useState<string[]>([]);
  const [frames, setFrames] = useState<AnimFrame[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<RecognitionHandle | null>(null);

  useEffect(() => {
    loadAnimations().then((lib) => {
      if (lib) { setWords(availableWords()); setReady(true); }
    });
  }, []);

  const sign = useCallback(async (fromText: string) => {
    const raw = fromText.trim();
    if (!raw) return;
    // 1) try exact token matches
    const tokens = raw.split(/[\s,।!?]+/).filter(Boolean);
    let keys = tokens.map(resolveKey).filter(Boolean) as string[];
    // 2) if nothing matched, ask Gemini to map to available signs
    if (keys.length === 0) {
      try {
        const res = await fetch("/api/map-signs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: raw, available: words.map((w) => w.bn) }),
        });
        const data = (await res.json()) as { words?: string[] };
        keys = (data.words || []).map(resolveKey).filter(Boolean) as string[];
      } catch { /* offline */ }
    }
    if (!keys.length) { setSigned([]); return; }
    setSigned(keys.map((k) => words.find((w) => w.en === k)?.bn || k));
    setFrames(sequenceForKeys(keys));
    setPlaying(true);
  }, [words]);

  const toggleMic = useCallback(() => {
    if (listening) { recRef.current?.stop(); return; }
    const h = startRecognition({
      lang: "bn-BD",
      onResult: (t, final) => { setText(t); if (final) sign(t); },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (h) { recRef.current = h; setListening(true); }
  }, [listening, sign]);

  useEffect(() => () => recRef.current?.stop(), []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col gap-4 px-4 pb-8">
      <TopBar title="কথা → ইশারা" onBack={() => router.back()} />

      {/* 3D avatar stage */}
      <section className="glass relative flex flex-1 items-center justify-center overflow-hidden" style={{ minHeight: 300 }}>
        {frames ? (
          <SignAvatar frames={frames} playing={playing} onEnd={() => setPlaying(false)} />
        ) : (
          <p className="bangla px-6 text-center text-secondary">
            {ready ? "নিচে কথা বলো বা শব্দ বেছে দাও — অবতার ইশারায় দেখাবে।" : "অ্যানিমেশন লোড হচ্ছে…"}
          </p>
        )}
        {signed.length > 0 && (
          <div className="glass bangla absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm text-primary">
            {signed.join(" · ")}
          </div>
        )}
      </section>

      {/* input */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMic}
          disabled={!speechRecognitionSupported()}
          aria-label={listening ? "Stop" : "Speak"}
          className="accent-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
        >
          {listening ? <StopIcon width={22} height={22} /> : <MicIcon width={22} height={22} />}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sign(text)}
          placeholder="বাংলায় লেখো বা বলো…"
          className="bangla glass flex-1 rounded-full px-4 py-3 text-primary outline-none placeholder:text-secondary"
        />
        <button
          type="button"
          onClick={() => sign(text)}
          className="accent-gradient bangla rounded-full px-4 py-3 text-sm font-semibold text-white"
        >
          দেখাও
        </button>
      </div>

      {/* available sign words */}
      <section>
        <h2 className="bangla mb-2 text-sm font-medium uppercase tracking-wide text-secondary">
          যে শব্দগুলো দেখাতে পারি ({words.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {words.map((w) => (
            <button
              key={w.en}
              onClick={() => sign(w.bn)}
              className="glass bangla rounded-full px-3 py-1.5 text-sm text-primary"
            >
              {w.bn}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
