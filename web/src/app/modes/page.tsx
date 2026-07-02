"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ModeGrid, type ModeCard } from "@/components/ModeGrid";
import { CircleButton } from "@/components/CircleButton";
import { GridIcon, MicIcon, SpeakerIcon } from "@/components/Icons";
import { useSettings } from "@/lib/useSettings";
import type { RecoMode } from "@/lib/recognizer/types";

const CARDS: ModeCard[] = [
  { id: "letters", title: "অক্ষর", subtitle: "ফিঙ্গার-স্পেলিং — একেকটি বাংলা অক্ষর চেনা", icon: <span className="bangla text-lg font-bold">অ</span> },
  { id: "words", title: "শব্দ", subtitle: "দৈনন্দিন শব্দ চেনা ও জমানো", icon: <MicIcon width={20} height={20} /> },
  { id: "sentences", title: "বাক্য", subtitle: "শব্দ জুড়ে স্বাভাবিক বাংলা বাক্য (Gemini)", icon: <GridIcon width={20} height={20} /> },
];

export default function ModesPage() {
  const router = useRouter();
  const { settings, update } = useSettings();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col gap-5 px-4 pb-8">
      <TopBar title="মোড ও কণ্ঠ" onBack={() => router.back()} action={<ThemeToggle />} />

      <section>
        <h2 className="bangla mb-3 text-sm font-medium uppercase tracking-wide text-secondary">
          চেনার মোড
        </h2>
        <ModeGrid
          cards={CARDS}
          selectedId={settings.mode}
          onSelect={(id) => {
            update({ mode: id as RecoMode });
            router.push("/");
          }}
        />
      </section>

      <button
        type="button"
        onClick={() => router.push("/voice-to-sign")}
        className="glass flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="accent-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <MicIcon width={20} height={20} />
          </span>
          <div>
            <p className="bangla font-medium text-primary">কথা → ইশারা</p>
            <p className="bangla text-xs text-secondary">কথা বললে 3D অবতার ইশারায় দেখাবে</p>
          </div>
        </div>
        <GridIcon width={18} height={18} />
      </button>

      <button
        type="button"
        onClick={() => router.push("/analyze")}
        className="glass flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="accent-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white text-lg">🎬</span>
          <div>
            <p className="bangla font-medium text-primary">ভিডিও বিশ্লেষণ</p>
            <p className="bangla text-xs text-secondary">ইশারার ভিডিও আপলোড → AI সারসংক্ষেপ</p>
          </div>
        </div>
        <GridIcon width={18} height={18} />
      </button>

      <button
        type="button"
        onClick={() => router.push("/dictation")}
        className="glass flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="accent-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <SpeakerIcon width={20} height={20} />
          </span>
          <div>
            <p className="bangla font-medium text-primary">কথা → লেখা (AI সংশোধন)</p>
            <p className="bangla text-xs text-secondary">বললে শুদ্ধ বাংলা লেখা হবে (Whisper-এর মতো)</p>
          </div>
        </div>
        <GridIcon width={18} height={18} />
      </button>

      <button
        type="button"
        onClick={() => router.push("/practice")}
        className="glass flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="accent-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <span className="bangla text-lg font-bold">শি</span>
          </span>
          <div>
            <p className="bangla font-medium text-primary">শেখো ও অনুশীলন</p>
            <p className="bangla text-xs text-secondary">রেফারেন্স দেখে ইশারা শিখে টেস্ট করো</p>
          </div>
        </div>
        <GridIcon width={18} height={18} />
      </button>

      <section className="glass flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/20 text-primary">
            <SpeakerIcon width={20} height={20} />
          </span>
          <div>
            <p className="bangla font-medium text-primary">কণ্ঠ ও সেটিংস</p>
            <p className="text-xs text-secondary">TTS ভয়েস, স্পিড, থিম</p>
          </div>
        </div>
        <CircleButton label="Open settings" onClick={() => router.push("/settings")}>
          <GridIcon width={18} height={18} />
        </CircleButton>
      </section>
    </main>
  );
}
