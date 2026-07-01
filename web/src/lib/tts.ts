// Text-to-speech. Prefers an on-device Bangla Web Speech voice (instant, offline). If the
// device has no Bangla voice (common on Windows), falls back to cloud Bangla TTS via the
// /api/tts proxy — so the app ALWAYS speaks proper Bangla.

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function isBangla(v: SpeechSynthesisVoice): boolean {
  return /^bn(-|_)?/i.test(v.lang) || /bangla|bengali/i.test(v.name);
}

/** Best available Bangla voice, else null. */
export function pickBanglaVoice(): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  return window.speechSynthesis.getVoices().find(isBangla) || null;
}

export function hasBanglaVoice(): boolean {
  return pickBanglaVoice() !== null;
}

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  voiceURI?: string | null;
  onstart?: () => void;
  onend?: () => void;
}

function voiceByURI(uri: string): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  return window.speechSynthesis.getVoices().find((v) => v.voiceURI === uri) || null;
}

let cloudAudio: HTMLAudioElement | null = null;

function speakCloud(text: string, opts: SpeakOptions): void {
  try {
    cloudAudio?.pause();
    const url = `/api/tts?text=${encodeURIComponent(text.slice(0, 200))}&lang=bn`;
    const audio = new Audio(url);
    audio.playbackRate = Math.min(1.5, Math.max(0.6, opts.rate ?? 1));
    cloudAudio = audio;
    opts.onstart && (audio.onplay = opts.onstart);
    audio.onended = () => opts.onend?.();
    audio.onerror = () => opts.onend?.();
    audio.play().catch(() => opts.onend?.());
  } catch {
    opts.onend?.();
  }
}

/** Speak Bangla text (device voice if available, else cloud). */
export function speak(text: string, opts: SpeakOptions = {}): void {
  const clean = text.trim();
  if (!clean) {
    opts.onend?.();
    return;
  }

  const chosen = opts.voiceURI ? voiceByURI(opts.voiceURI) : null;
  const voice = chosen || pickBanglaVoice();

  // Use Web Speech only when we actually have a Bangla-capable voice; otherwise an
  // English voice would silently skip Bangla text. Fall back to cloud in that case.
  if (ttsSupported() && voice && (chosen || isBangla(voice))) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.voice = voice;
    u.lang = opts.lang ?? voice.lang ?? "bn-BD";
    u.rate = opts.rate ?? 1;
    u.pitch = opts.pitch ?? 1;
    if (opts.onstart) u.onstart = opts.onstart;
    if (opts.onend) u.onend = opts.onend;
    synth.speak(u);
    return;
  }

  speakCloud(clean, opts);
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
  cloudAudio?.pause();
  cloudAudio = null;
}
