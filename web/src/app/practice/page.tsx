"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { CircleButton } from "@/components/CircleButton";
import { SpeakerIcon, CheckIcon } from "@/components/Icons";
import { createRecognizer } from "@/lib/recognizer";
import type { Prediction, Recognizer } from "@/lib/recognizer/types";
import { toBn } from "@/lib/recognizer/wordLabelsBn";
import { speak } from "@/lib/tts";

type Tab = "letters" | "words";
const TILE = 160, COLS = 6; // letter sample-sheet layout

export default function PracticePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("letters");
  const [letters, setLetters] = useState<string[]>([]);
  const [words, setWords] = useState<{ en: string; bn: string }[]>([]);
  const [target, setTarget] = useState<{ label: string; index: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "watching" | "correct">("idle");
  const [lastSeen, setLastSeen] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const recRef = useRef<Recognizer | null>(null);
  const targetRef = useRef<{ label: string; index: number } | null>(null);
  targetRef.current = target;

  // Load class lists from the trained models.
  useEffect(() => {
    fetch("/models/letters/model.json").then((r) => r.ok ? r.json() : null).then((d) => d && setLetters(d.classes)).catch(() => {});
    fetch("/models/words/word_model.json").then((r) => r.ok ? r.json() : null).then((d) => d && setWords(d.classes.map((en: string) => ({ en, bn: toBn(en) }))) ).catch(() => {});
  }, []);

  const onResult = useCallback((p: Prediction) => {
    const t = targetRef.current;
    setLastSeen(p.label);
    if (!t) return;
    // words recognizer already emits Bangla; letters emit the letter string.
    if (p.label === t.label) {
      setStatus("correct");
      speak(t.label);
    }
  }, []);

  const stopRec = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
  }, []);

  const startRec = useCallback(async (mode: Tab) => {
    stopRec();
    const rec = await createRecognizer(mode);
    recRef.current = rec;
    rec.onResult(onResult);
    try { await rec.start(videoRef.current); } catch { /* camera denied */ }
  }, [onResult, stopRec]);

  useEffect(() => () => stopRec(), [stopRec]);

  const pick = async (label: string, index: number) => {
    setTarget({ label, index });
    setStatus("watching");
    setLastSeen("");
    if (recRef.current?.mode !== tab) await startRec(tab);
  };

  const switchTab = (t: Tab) => {
    setTab(t); setTarget(null); setStatus("idle"); stopRec();
  };

  const wordTargetEn = target && tab === "words"
    ? words.find((w) => w.bn === target.label)?.en
    : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col gap-4 px-4 pb-8">
      <TopBar title="শেখো ও অনুশীলন" onBack={() => { stopRec(); router.back(); }} />

      {/* Tabs */}
      <div className="glass flex rounded-2xl p-1">
        {(["letters", "words"] as Tab[]).map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${tab === t ? "accent-gradient text-white" : "text-secondary"}`}>
            <span className="bangla">{t === "letters" ? "অক্ষর" : "শব্দ"}</span>
          </button>
        ))}
      </div>

      {/* Reference + camera stage (shown once a target is picked) */}
      {target && (
        <section className="grid grid-cols-2 gap-3">
          <div className="glass flex flex-col items-center justify-center overflow-hidden p-2">
            <span className="bangla mb-1 text-xs text-secondary">এভাবে দেখাও ↓</span>
            {tab === "letters" ? (
              <div style={{ width: TILE, height: TILE, backgroundImage: "url(/letters_sheet.png)",
                backgroundPosition: `-${(target.index % COLS) * TILE}px -${Math.floor(target.index / COLS) * TILE}px`,
                borderRadius: 12 }} aria-label="reference sign" />
            ) : wordTargetEn ? (
              <video src={`/refs/words/${encodeURIComponent(wordTargetEn)}.mp4`} autoPlay loop muted playsInline
                className="h-[160px] w-full rounded-xl object-cover"
                onError={(e) => ((e.currentTarget.style.display = "none"))} />
            ) : null}
            <span className="bangla mt-2 text-2xl font-bold text-primary">{target.label}</span>
          </div>

          <div className="glass relative flex items-center justify-center overflow-hidden p-1">
            <video ref={videoRef} playsInline muted
              className="h-full w-full scale-x-[-1] rounded-xl object-cover" style={{ minHeight: 200 }} />
            {status === "correct" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                <CheckIcon width={48} height={48} />
                <span className="bangla mt-1 font-semibold">ঠিক হয়েছে! 🎉</span>
              </div>
            )}
          </div>
        </section>
      )}

      {target && (
        <div className="flex items-center justify-between">
          <span className="bangla text-sm text-secondary">
            {status === "correct" ? "দারুণ! আরেকটা বেছে নাও।" : `দেখছি… ${lastSeen ? `(পেলাম: ${lastSeen})` : ""}`}
          </span>
          <CircleButton label="Speak target" onClick={() => target && speak(target.label)}>
            <SpeakerIcon width={20} height={20} />
          </CircleButton>
        </div>
      )}

      {/* Target picker */}
      <section>
        <h2 className="bangla mb-2 text-sm font-medium uppercase tracking-wide text-secondary">
          {tab === "letters" ? "একটি অক্ষর বেছে নাও" : "একটি শব্দ বেছে নাও"}
        </h2>
        <div className={tab === "letters" ? "grid grid-cols-6 gap-2" : "grid grid-cols-3 gap-2"}>
          {tab === "letters"
            ? letters.map((c, i) => (
                <button key={i} onClick={() => pick(c, i)}
                  className={`glass bangla rounded-xl py-3 text-lg font-semibold ${target?.index === i ? "ring-2 ring-accent" : ""}`}>
                  {c}
                </button>
              ))
            : words.map((w, i) => (
                <button key={i} onClick={() => pick(w.bn, i)}
                  className={`glass bangla rounded-xl px-2 py-3 text-sm font-medium ${target?.label === w.bn ? "ring-2 ring-accent" : ""}`}>
                  {w.bn}
                </button>
              ))}
        </div>
      </section>
    </main>
  );
}
