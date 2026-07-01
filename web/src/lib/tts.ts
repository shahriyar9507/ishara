// Text-to-speech — Web Speech API (free, on-device, instant). Bangla ("bn-BD"/"bn-IN")
// voices exist on many Android/desktop systems. Cloud/Gemini TTS fallback is added in Phase 5.

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Pick the best available Bangla voice, else any voice. */
export function pickBanglaVoice(): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /^bn(-|_)?/i.test(v.lang)) ||
    voices.find((v) => /bangla|bengali/i.test(v.name)) ||
    null
  );
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

/** Speak Bangla text. Resolves when playback ends (or immediately if unsupported). */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!ttsSupported() || !text.trim()) {
    opts.onend?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel(); // interrupt any current utterance
  const u = new SpeechSynthesisUtterance(text);
  const voice = (opts.voiceURI && voiceByURI(opts.voiceURI)) || pickBanglaVoice();
  if (voice) u.voice = voice;
  u.lang = opts.lang ?? voice?.lang ?? "bn-BD";
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  if (opts.onstart) u.onstart = opts.onstart;
  if (opts.onend) u.onend = opts.onend;
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
