// Thin wrapper over the browser SpeechRecognition API (Web Speech). Free, on-device,
// supports Bangla ("bn-BD"). Used for Voice→Sign and the Whisper-like dictation feature.

/* eslint-disable @typescript-eslint/no-explicit-any */

export function speechRecognitionSupported(): boolean {
  return typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export interface RecognitionHandle {
  stop: () => void;
}

export function startRecognition(opts: {
  lang?: string;
  interim?: boolean;
  continuous?: boolean;
  onResult: (text: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (e: string) => void;
}): RecognitionHandle | null {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = opts.lang ?? "bn-BD";
  rec.interimResults = opts.interim ?? true;
  rec.continuous = opts.continuous ?? true;
  rec.maxAlternatives = 1;

  rec.onresult = (ev: any) => {
    let interim = "", final = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (final) opts.onResult(final, true);
    else if (interim) opts.onResult(interim, false);
  };
  rec.onerror = (e: any) => opts.onError?.(e?.error || "error");
  rec.onend = () => opts.onEnd?.();

  try { rec.start(); } catch { /* already started */ }
  return { stop: () => { try { rec.stop(); } catch { /* noop */ } } };
}
