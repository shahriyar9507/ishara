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
        <h2 className="bangla mb-3 text-sm font-medium uppercase tracking-wide text-secondary">কণ্ঠ</h2>
        <button
          type="button"
          onClick={() => update({ autoSpeak: !settings.autoSpeak })}
          className="glass flex w-full items-center justify-between rounded-2xl px-4 py-3"
          aria-pressed={settings.autoSpeak}
        >
          <span className="bangla text-left text-primary">
            স্বয়ংক্রিয় কণ্ঠ
            <span className="block text-xs text-secondary">চেনা অক্ষর/শব্দ/বাক্য নিজে থেকেই বলবে</span>
          </span>
          <span
            className={`relative h-6 w-11 rounded-full transition ${settings.autoSpeak ? "accent-gradient" : "bg-black/25"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${settings.autoSpeak ? "left-[22px]" : "left-0.5"}`}
            />
          </span>
        </button>
        <p className="bangla mt-2 text-xs text-secondary">
          এই ডিভাইসে বাংলা ভয়েস না থাকলে অ্যাপ স্বয়ংক্রিয়ভাবে ক্লাউড বাংলা কণ্ঠ ব্যবহার করবে।
        </p>
      </section>

      <section>
        <h2 className="bangla mb-3 text-sm font-medium uppercase tracking-wide text-secondary">ট্র্যাকিং</h2>
        <button
          type="button"
          onClick={() => update({ fullTracking: !settings.fullTracking })}
          className="glass flex w-full items-center justify-between rounded-2xl px-4 py-3"
          aria-pressed={settings.fullTracking}
        >
          <span className="bangla text-left text-primary">
            মুখ ও শরীর ট্র্যাকিং
            <span className="block text-xs text-secondary">হাতের সাথে মুখ ও শরীরও ট্র্যাক করবে (ভারী — ধীর ডিভাইসে বন্ধ রাখো)</span>
          </span>
          <span className={`relative h-6 w-11 rounded-full transition ${settings.fullTracking ? "accent-gradient" : "bg-black/25"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${settings.fullTracking ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </button>
        <p className="bangla mt-2 text-xs text-secondary">
          মুখভঙ্গি ও শরীরের ভঙ্গি ইশারা ভাষার ব্যাকরণে গুরুত্বপূর্ণ — এটা চালু করলে বোঝা সহজ হয়।
        </p>
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
