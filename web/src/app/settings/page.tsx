"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { OptionList, type Option } from "@/components/OptionList";
import { useTheme, type ThemePref } from "@/lib/useTheme";
import { useSettings } from "@/lib/useSettings";
import { ttsSupported, speak } from "@/lib/tts";

const THEME_OPTIONS: Option[] = [
  { id: "system", label: "সিস্টেম অনুযায়ী", sublabel: "ডিভাইসের লাইট/ডার্ক অনুসরণ", leading: "🌗" },
  { id: "light", label: "লাইট — Lavender", sublabel: "নরম বেগুনি থিম", leading: "☀️" },
  { id: "dark", label: "ডার্ক — Aurora", sublabel: "গাঢ় নীল থিম", leading: "🌙" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { pref, setTheme } = useTheme();
  const { settings, update } = useSettings();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!ttsSupported()) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      // Bangla voices first, then the rest.
      all.sort((a, b) => Number(/bn/i.test(b.lang)) - Number(/bn/i.test(a.lang)));
      setVoices(all);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const voiceOptions: Option[] = [
    { id: "", label: "স্বয়ংক্রিয় (সেরা বাংলা ভয়েস)", sublabel: "ডিফল্ট", leading: "🔊" },
    ...voices.map((v) => ({
      id: v.voiceURI,
      label: v.name,
      sublabel: v.lang + (/bn/i.test(v.lang) ? " · বাংলা" : ""),
      leading: /bn/i.test(v.lang) ? "🇧🇩" : "🌐",
    })),
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8">
      <TopBar title="সেটিংস" onBack={() => router.back()} />

      <section>
        <h2 className="bangla mb-3 text-sm font-medium uppercase tracking-wide text-secondary">থিম</h2>
        <OptionList options={THEME_OPTIONS} selectedId={pref} onSelect={(id) => setTheme(id as ThemePref)} />
      </section>

      <section>
        <h2 className="bangla mb-2 text-sm font-medium uppercase tracking-wide text-secondary">
          কণ্ঠের স্পিড — {settings.rate.toFixed(1)}×
        </h2>
        <div className="glass flex items-center gap-3 p-4">
          <span className="text-xs text-secondary">0.5×</span>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={settings.rate}
            onChange={(e) => update({ rate: Number(e.target.value) })}
            className="flex-1 accent-[var(--accent)]"
            aria-label="Speech rate"
          />
          <span className="text-xs text-secondary">1.5×</span>
        </div>
        <button
          type="button"
          className="glass mt-3 w-full rounded-2xl px-4 py-3 text-primary"
          onClick={() =>
            speak("আমি ইশারা, তোমার বাংলা সহকারী।", {
              rate: settings.rate,
              lang: "bn-BD",
            })
          }
        >
          <span className="bangla">ভয়েস পরীক্ষা করুন</span>
        </button>
      </section>

      <section>
        <h2 className="bangla mb-3 text-sm font-medium uppercase tracking-wide text-secondary">
          কণ্ঠ (TTS ভয়েস)
        </h2>
        {ttsSupported() ? (
          <OptionList
            options={voiceOptions}
            selectedId={settings.voiceURI ?? ""}
            onSelect={(id) => update({ voiceURI: id || null })}
          />
        ) : (
          <p className="bangla glass rounded-2xl p-4 text-sm text-secondary">
            এই ব্রাউজারে Web Speech সাপোর্ট নেই। Cloud TTS পরে যোগ হবে।
          </p>
        )}
      </section>
    </main>
  );
}
