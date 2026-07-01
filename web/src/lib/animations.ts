// Loads the coordinate sign-animation library (extracted from the sign clips) and builds
// playable sequences for the 3D avatar. Maps Bangla words -> known sign keys.

import type { AnimFrame } from "@/components/SignAvatar";
import { toBn } from "@/lib/recognizer/wordLabelsBn";

type AnimLib = Record<string, { fps: number; frames: AnimFrame[] }>;

let cache: AnimLib | null = null;
let enToBn: Record<string, string> = {};
let bnToEn: Record<string, string> = {};

export async function loadAnimations(): Promise<AnimLib | null> {
  if (cache) return cache;
  try {
    const res = await fetch("/animations/sign_animations.json", { cache: "force-cache" });
    if (!res.ok) return null;
    cache = (await res.json()) as AnimLib;
    for (const en of Object.keys(cache)) {
      const bn = toBn(en);
      enToBn[en] = bn;
      bnToEn[bn] = en;
    }
    return cache;
  } catch {
    return null;
  }
}

/** List of available sign words (english key + bangla display). */
export function availableWords(): { en: string; bn: string }[] {
  return Object.keys(enToBn).map((en) => ({ en, bn: enToBn[en] })).sort((a, b) => a.bn.localeCompare(b.bn, "bn"));
}

/** Resolve a Bangla (or english) token to a known sign key, or null. */
export function resolveKey(token: string): string | null {
  const t = token.trim();
  if (cache?.[t]) return t; // english key
  if (bnToEn[t]) return bnToEn[t]; // exact bangla
  return null;
}

/** Build one continuous avatar sequence from a list of sign keys (with a short rest between). */
export function sequenceForKeys(keys: string[]): AnimFrame[] {
  if (!cache) return [];
  const out: AnimFrame[] = [];
  const rest: AnimFrame = { hands: [], pose: [] };
  for (const k of keys) {
    const a = cache[k];
    if (!a) continue;
    out.push(...a.frames);
    out.push(rest, rest, rest); // brief pause between words
  }
  return out;
}
