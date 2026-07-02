"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { GlassCard } from "@/components/GlassCard";
import { CircleButton } from "@/components/CircleButton";
import { MicIcon, StopIcon, SpeakerIcon, TrashIcon, CheckIcon } from "@/components/Icons";
import { ActivityWave } from "@/components/ActivityWave";
import { startRecognition, speechRecognitionSupported, type RecognitionHandle } from "@/lib/speechRecognition";
import { speak } from "@/lib/tts";

export default function DictationPage() {
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [corrected, setCorrected] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const recRef = useRef<RecognitionHandle | null>(null);
  const correctTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCorrect = useCallback((text: string) => {
    if (!text.trim()) return;
    setCorrecting(true);
    fetch("/api/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((d: { text?: string }) => setCorrected(d.text || text))
      .catch(() => setCorrected(text))
      .finally(() => setCorrecting(false));
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) { recRef.current?.stop(); return; }
    setInterim("");
    const h = startRecognition({
      lang: "bn-BD",
      continuous: true,
      interim: true,
      onResult: (t, isFinal) => {
        if (isFinal) {
          setInterim("");
          setFinalText((prev) => {
            const next = (prev ? prev + " " : "") + t.trim();
            if (correctTimer.current) clearTimeout(correctTimer.current);
            correctTimer.current = setTimeout(() => runCorrect(next), 1200);
            return next;
          });
        } else {
          setInterim(t);
        }
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (h) { recRef.current = h; setListening(true); }
  }, [listening, runCorrect]);

  const clear = () => { setFinalText(""); setInterim(""); setCorrected(""); };
  const copy = () => {
    navigator.clipboard?.writeText(corrected || finalText).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  };

  useEffect(() => () => recRef.current?.stop(), []);

  const liveText = (finalText + (interim ? " " + interim : "")).trim();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col gap-4 px-4 pb-8">
      <TopBar title="কথা → লেখা (AI সংশোধন)" onBack={() => { recRef.current?.stop(); router.back(); }} />

      {/* live transcript */}
      <GlassCard className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="bangla text-xs font-medium uppercase tracking-wide text-secondary">যা শুনছি</span>
          {listening && <ActivityWave active bars={12} />}
        </div>
        <p className="bangla min-h-[3rem] text-lg text-primary" aria-live="polite">
          {liveText || <span className="text-secondary">মাইকে চেপে বাংলায় বলো…</span>}
          {interim && <span className="text-secondary"> {""}</span>}
        </p>
      </GlassCard>

      {/* corrected output */}
      <GlassCard className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="bangla text-xs font-medium uppercase tracking-wide text-secondary">
            AI-সংশোধিত {correcting && "…"}
          </span>
        </div>
        <p className="bangla min-h-[3rem] text-lg font-medium text-primary" aria-live="polite">
          {corrected || <span className="text-secondary">এখানে পরিষ্কার, শুদ্ধ বাংলা আসবে</span>}
        </p>
        <div className="mt-3 flex items-center justify-end gap-3">
          <CircleButton label="Clear" onClick={clear} disabled={!liveText && !corrected}>
            <TrashIcon width={20} height={20} />
          </CircleButton>
          <CircleButton label="Copy" onClick={copy} disabled={!corrected && !finalText}>
            {copied ? <CheckIcon width={20} height={20} /> : <span className="text-xs font-semibold">কপি</span>}
          </CircleButton>
          <CircleButton label="Speak" onClick={() => speak(corrected || finalText)} disabled={!corrected && !finalText}>
            <SpeakerIcon width={20} height={20} />
          </CircleButton>
        </div>
      </GlassCard>

      {/* mic */}
      <div className="flex flex-col items-center gap-2">
        {!speechRecognitionSupported() && (
          <p className="bangla text-center text-xs text-secondary">এই ব্রাউজারে ভয়েস রেকগনিশন নেই — Chrome/Edge ব্যবহার করো।</p>
        )}
        <button
          type="button"
          onClick={toggleMic}
          disabled={!speechRecognitionSupported()}
          className="accent-gradient flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg disabled:opacity-40"
          style={{ boxShadow: "0 10px 30px color-mix(in srgb, var(--accent) 50%, transparent)" }}
        >
          {listening ? <StopIcon width={26} height={26} /> : <MicIcon width={26} height={26} />}
        </button>
        <span className="bangla text-sm text-secondary">{listening ? "শুনছি… (থামাতে চাপো)" : "বলা শুরু করতে চাপো"}</span>
      </div>
    </main>
  );
}
