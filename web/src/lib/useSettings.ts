"use client";

import { useCallback, useEffect, useState } from "react";
import type { RecoMode } from "@/lib/recognizer/types";

export interface Settings {
  mode: RecoMode;
  rate: number; // TTS speech rate 0.5–1.5
  voiceURI: string | null; // preferred TTS voice
  autoSpeak: boolean; // speak recognized letters/words/sentences automatically
}

const KEY = "ishara-settings";
const DEFAULTS: Settings = { mode: "letters", rate: 1, voiceURI: null, autoSpeak: true };

function read(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

/** Shared app settings, persisted to localStorage and synced across tabs/components. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    setSettings(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSettings(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      // notify other hook instances in this tab
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
      return next;
    });
  }, []);

  return { settings, update };
}
