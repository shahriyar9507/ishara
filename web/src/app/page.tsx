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
import { TrackingOverlay } from "@/components/TrackingOverlay";
import { createRecognizer } from "@/lib/recognizer";
import type { HandFrame, OrbState, Prediction, Recognizer } from "@/lib/recognizer/types";
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
  const [initializing, setInitializing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HandFrame | null>(null);
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
      // Auto-speak each recognized letter/word (sentences mode speaks the full sentence instead).
      if (settings.autoSpeak && mode !== "sentences") {
        speak(p.label, { rate: settings.rate, voiceURI: settings.voiceURI });
      }
      // settle the orb back to capturing shortly after a hit
      window.setTimeout(() => setOrbState((s) => (s === "recognizing" ? "capturing" : s)), 250);
    },
    [mode, settings.autoSpeak, settings.rate, settings.voiceURI],
  );

  const start = useCallback(async () => {
    setInitializing(true);
    try {
      const rec = await createRecognizer(mode);
      recognizerRef.current = rec;
      rec.onResult(handleResult);
      rec.onLandmarks?.((f) => (frameRef.current = f));
      await rec.start(videoRef.current);
      setRunning(true);
      setOrbState("capturing");
    } catch {
      // camera denied / engine failed to start
      recognizerRef.current = null;
    } finally {
      setInitializing(false);
    }
  }, [mode, handleResult]);

  const stop = useCallback(() => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    frameRef.current = null;
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
        if (ctrl.signal.aborted) return;
        setSentence(s);
        if (settings.autoSpeak && mode === "sentences" && s) {
          speak(s, { rate: settings.rate, voiceURI: settings.voiceURI });
        }
      });
    }, SENTENCE_DEBOUNCE_MS);
    return () => {
      if (sentenceTimer.current) clearTimeout(sentenceTimer.current);
    };
  }, [text, mode, settings.autoSpeak, settings.rate, settings.voiceURI]);

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
          className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-cover transition-opacity duration-700"
          style={{ opacity: running ? 0.92 : 0 }}
        />
        {running && <TrackingOverlay frameRef={frameRef} />}
        {running && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 90% at 50% 38%, transparent 55%, rgba(0,0,0,0.38))" }}
          />
        )}

        {/* Idle hero */}
        {!running && !initializing && (
          <div className="relative z-10 flex flex-col items-center gap-5">
            <RecognitionOrb state="idle" size={190} />
            <p className="bangla text-center text-lg font-medium text-primary">{statusText}</p>
            <ActivityWave active={false} />
          </div>
        )}

        {/* Initializing */}
        {initializing && (
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            <p className="bangla text-sm text-secondary">ক্যামেরা ও মডেল চালু হচ্ছে…</p>
          </div>
        )}

        {/* Running status pill */}
        {running && (
          <div className="glass absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5">
            <RecognitionOrb state={orbState} size={20} />
            <span className="bangla text-sm font-medium text-primary">{statusText}</span>
          </div>
        )}
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
