"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { GlassCard } from "@/components/GlassCard";
import { SpeakerIcon } from "@/components/Icons";
import { analyzeSignVideo } from "@/lib/videoAnalysis";
import { speak } from "@/lib/tts";

type Result = { sentence: string; summary: string; detailed: string };

export default function AnalyzePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback(async (file: File) => {
    setBusy(true); setError(""); setResult(null); setWords([]); setProgress(0);
    try {
      const { words } = await analyzeSignVideo(file, (frac, partial) => {
        setProgress(Math.round(frac * 100));
        setWords([...partial]);
      });
      if (!words.length) { setError("ভিডিওতে চেনার মতো ইশারা পাওয়া যায়নি। ভালো আলো ও স্পষ্ট হাত দরকার।"); return; }
      const res = await fetch("/api/summarize-signs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      setResult(await res.json());
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col gap-4 px-4 pb-8">
      <TopBar title="ভিডিও বিশ্লেষণ" onBack={() => router.back()} />

      <input ref={inputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="glass flex flex-col items-center justify-center gap-2 rounded-2xl p-8 text-center disabled:opacity-60"
      >
        <span className="accent-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white text-2xl">＋</span>
        <span className="bangla font-medium text-primary">ইশারার ভিডিও আপলোড করো</span>
        <span className="bangla text-xs text-secondary">AI বিশ্লেষণ করে বলবে কী বলা হচ্ছে</span>
      </button>

      {busy && (
        <GlassCard className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="bangla text-sm text-primary">বিশ্লেষণ হচ্ছে… {progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
            <div className="accent-gradient h-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          {words.length > 0 && <p className="bangla mt-3 text-sm text-secondary">চেনা শব্দ: {words.join(" · ")}</p>}
        </GlassCard>
      )}

      {error && <p className="bangla glass rounded-2xl p-4 text-sm text-secondary">{error}</p>}

      {result && (
        <>
          <GlassCard className="p-4">
            <span className="bangla text-xs font-medium uppercase tracking-wide text-secondary">চেনা শব্দ</span>
            <p className="bangla mt-1 text-primary">{words.join(" · ") || "—"}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <span className="bangla text-xs font-medium uppercase tracking-wide text-secondary">বাক্য</span>
              <button onClick={() => speak(result.sentence)} aria-label="Speak" className="text-accent">
                <SpeakerIcon width={18} height={18} />
              </button>
            </div>
            <p className="bangla mt-1 text-lg font-medium text-primary">{result.sentence}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <span className="bangla text-xs font-medium uppercase tracking-wide text-secondary">সারসংক্ষেপ</span>
            <p className="bangla mt-1 text-primary">{result.summary}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <span className="bangla text-xs font-medium uppercase tracking-wide text-secondary">বিস্তারিত</span>
            <p className="bangla mt-1 leading-relaxed text-primary">{result.detailed}</p>
          </GlassCard>
        </>
      )}
    </main>
  );
}
