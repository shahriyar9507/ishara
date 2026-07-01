"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RecognitionOrb } from "@/components/RecognitionOrb";
import { ActivityWave } from "@/components/ActivityWave";
import { CaptionPanel } from "@/components/CaptionPanel";
import { MicFAB } from "@/components/MicFAB";
import { CircleButton } from "@/components/CircleButton";
import { GridIcon } from "@/components/Icons";
import { createRecognizer } from "@/lib/recognizer";
import type { OrbState, Prediction, Recognizer } from "@/lib/recognizer/types";
import { speak, stopSpeaking } from "@/lib/tts";
import { buildSentence } from "@/lib/language";
import { useSettings } from "@/lib/useSettings";

const MODE_LABELS: Record<string, string> = { letters: "অ", words: "শব্দ", sentences: "বাক্য" };
const NEXT_MODE: Record<string, "letters" | "words" | "sentences"> = {
  letters: "words",
  words: "sentences",
  sentences: "letters",
};

const REPEAT_GUARD_MS = 900; // ignore same label repeated within this window (hold-to-confirm)
const SENTENCE_DEBOUNCE_MS = 1000; // wait for a pause before asking Gemini for a sentence

export default function RecognizePage() {
  const router = useRouter();
  const { settings, update } = useSettings();
  const mode = settings.mode;
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const [lastConfidence, setLastConfidence] = useState<number>();
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [sentence, setSentence] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<Recognizer | null>(null);
  const lastRef = useRef<{ label: string; t: number }>({ label: "", t: 0 });
  const sentenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentenceAbort = useRef<AbortController | null>(null);

  const handleResult = useCallback(
    (p: Prediction) => {
      const now = Date.now();
      if (p.label === lastRef.current.label && now - lastRef.current.t < REPEAT_GUARD_MS) return;
      lastRef.current = { label: p.label, t: now };
      setLastConfidence(p.confidence);
      setOrbState("recognizing");
      setText((prev) => (mode === "letters" ? prev + p.label : (prev ? prev + " " : "") + p.label));
      // settle the orb back to capturing shortly after a hit
      window.setTimeout(() => setOrbState((s) => (s === "recognizing" ? "capturing" : s)), 250);
    },
    [mode],
  );

  const start = useCallback(async () => {
    const rec = await createRecognizer(mode);
    recognizerRef.current = rec;
    rec.onResult(handleResult);
    try {
      await rec.start(videoRef.current);
      setRunning(true);
      setOrbState("capturing");
    } catch {
      // camera denied / engine failed to start
      recognizerRef.current = null;
    }
  }, [mode, handleResult]);

  const stop = useCallback(() => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setRunning(false);
    setOrbState("idle");
  }, []);

  const toggle = useCallback(() => (running ? stop() : start()), [running, start, stop]);

  const onSpeak = useCallback(() => {
    const toSay = (sentence || text).trim();
    if (!toSay) return;
    stopSpeaking();
    setOrbState("speaking");
    setSpeaking(true);
    speak(toSay, {
      rate: settings.rate,
      voiceURI: settings.voiceURI,
      onend: () => {
        setSpeaking(false);
        setOrbState(running ? "capturing" : "idle");
      },
    });
  }, [sentence, text, running, settings.rate, settings.voiceURI]);

  const onClear = useCallback(() => {
    setText("");
    setSentence(null);
    setLastConfidence(undefined);
    lastRef.current = { label: "", t: 0 };
  }, []);

  // Phase 4: in words/sentences mode, debounce-build a natural Bangla sentence via Gemini.
  useEffect(() => {
    if (mode === "letters" || !text.trim()) {
      setSentence(null);
      return;
    }
    if (sentenceTimer.current) clearTimeout(sentenceTimer.current);
    sentenceTimer.current = setTimeout(() => {
      sentenceAbort.current?.abort();
      const ctrl = new AbortController();
      sentenceAbort.current = ctrl;
      buildSentence(text.trim().split(/\s+/), ctrl.signal).then((s) => {
        if (!ctrl.signal.aborted) setSentence(s);
      });
    }, SENTENCE_DEBOUNCE_MS);
    return () => {
      if (sentenceTimer.current) clearTimeout(sentenceTimer.current);
    };
  }, [text, mode]);

  // Cleanup on unmount
  useEffect(() => () => recognizerRef.current?.stop(), []);

  const statusText = running
    ? mode === "letters"
      ? "অক্ষর চিনছি…"
      : mode === "words"
        ? "শব্দ চিনছি…"
        : "বাক্য বানাচ্ছি…"
    : "প্রস্তুত — শুরু করতে মাইকে চাপো";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6">
      <TopBar
        badge={
          <span className="accent-gradient mb-1 rounded-full px-3 py-1 text-xs font-semibold text-white">
            Ishara · Beta
          </span>
        }
        action={<ThemeToggle />}
      />

      {/* Camera + orb stage */}
      <section className="glass relative flex flex-1 flex-col items-center justify-center overflow-hidden p-6">
        <video
          ref={videoRef}
          playsInline
          muted
          className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-cover transition-opacity duration-500"
          style={{ opacity: running ? 0.35 : 0 }}
        />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <RecognitionOrb state={orbState} size={running ? 150 : 190} />
          <p className="bangla text-center text-lg font-medium text-primary">{statusText}</p>
          <ActivityWave active={running} />
        </div>
      </section>

      <CaptionPanel
        text={text}
        sentence={sentence}
        lastConfidence={lastConfidence}
        speaking={speaking}
        onSpeak={onSpeak}
        onClear={onClear}
      />

      {/* Controls */}
      <div className="flex items-center justify-center gap-8">
        <CircleButton
          label={`Mode: ${mode} (tap to change)`}
          onClick={() => update({ mode: NEXT_MODE[mode] })}
        >
          <span className="bangla text-sm font-semibold">{MODE_LABELS[mode]}</span>
        </CircleButton>

        <MicFAB active={running} onClick={toggle} />

        <CircleButton label="Modes & voice" onClick={() => router.push("/modes")}>
          <GridIcon width={22} height={22} />
        </CircleButton>
      </div>
    </main>
  );
}
