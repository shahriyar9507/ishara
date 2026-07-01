"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RecognitionOrb } from "@/components/RecognitionOrb";
import { ActivityWave } from "@/components/ActivityWave";
import { CaptionPanel } from "@/components/CaptionPanel";
import { MicFAB } from "@/components/MicFAB";
import { CircleButton } from "@/components/CircleButton";
import { GridIcon } from "@/components/Icons";
import { MockRecognizer } from "@/lib/recognizer/mockRecognizer";
import type { OrbState, Prediction, RecoMode } from "@/lib/recognizer/types";
import { speak, stopSpeaking } from "@/lib/tts";

const REPEAT_GUARD_MS = 900; // ignore same label repeated within this window (hold-to-confirm)

export default function RecognizePage() {
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<RecoMode>("letters");
  const [text, setText] = useState("");
  const [lastConfidence, setLastConfidence] = useState<number>();
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [speaking, setSpeaking] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<MockRecognizer | null>(null);
  const lastRef = useRef<{ label: string; t: number }>({ label: "", t: 0 });

  const handleResult = useCallback(
    (p: Prediction) => {
      const now = Date.now();
      if (p.label === lastRef.current.label && now - lastRef.current.t < REPEAT_GUARD_MS) return;
      lastRef.current = { label: p.label, t: now };
      setLastConfidence(p.confidence);
      setOrbState("recognizing");
      setText((prev) => (mode === "words" ? (prev ? prev + " " : "") + p.label : prev + p.label));
      // settle the orb back to capturing shortly after a hit
      window.setTimeout(() => setOrbState((s) => (s === "recognizing" ? "capturing" : s)), 250);
    },
    [mode],
  );

  const start = useCallback(async () => {
    const rec = new MockRecognizer(mode);
    recognizerRef.current = rec;
    rec.onResult(handleResult);
    await rec.start(videoRef.current);
    setRunning(true);
    setOrbState("capturing");
  }, [mode, handleResult]);

  const stop = useCallback(() => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setRunning(false);
    setOrbState("idle");
  }, []);

  const toggle = useCallback(() => (running ? stop() : start()), [running, start, stop]);

  const onSpeak = useCallback(() => {
    if (!text.trim()) return;
    stopSpeaking();
    setOrbState("speaking");
    setSpeaking(true);
    speak(text, {
      onend: () => {
        setSpeaking(false);
        setOrbState(running ? "capturing" : "idle");
      },
    });
  }, [text, running]);

  const onClear = useCallback(() => {
    setText("");
    setLastConfidence(undefined);
    lastRef.current = { label: "", t: 0 };
  }, []);

  // Cleanup on unmount
  useEffect(() => () => recognizerRef.current?.stop(), []);

  const statusText = running
    ? mode === "words"
      ? "শব্দ চিনছি…"
      : "অক্ষর চিনছি…"
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
        lastConfidence={lastConfidence}
        speaking={speaking}
        onSpeak={onSpeak}
        onClear={onClear}
      />

      {/* Controls */}
      <div className="flex items-center justify-center gap-8">
        <CircleButton
          label={mode === "letters" ? "Mode: letters" : "Mode: words"}
          onClick={() => setMode((m) => (m === "letters" ? "words" : "letters"))}
        >
          <span className="bangla text-sm font-semibold">{mode === "letters" ? "অ" : "শব্দ"}</span>
        </CircleButton>

        <MicFAB active={running} onClick={toggle} />

        <CircleButton label="Modes & voice" onClick={() => { /* Phase 6: open mode/voice sheet */ }}>
          <GridIcon width={22} height={22} />
        </CircleButton>
      </div>
    </main>
  );
}
