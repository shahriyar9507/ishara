// Mock recognizer — emits plausible Bangla predictions on a timer so the whole UI
// (orb, waveform, caption panel, TTS) is fully runnable before the real TF.js model
// exists. Swap for the MediaPipe + TF.js engine once Phase 2 training is done; the
// UI depends only on the `Recognizer` interface.

import type { Prediction, RecoMode, Recognizer } from "./types";
import { SAMPLE_LETTERS, SAMPLE_WORDS } from "./sampleVocab";

export class MockRecognizer implements Recognizer {
  mode: RecoMode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(p: Prediction) => void>();
  private stream: MediaStream | null = null;

  constructor(mode: RecoMode = "letters") {
    this.mode = mode;
  }

  async start(video?: HTMLVideoElement | null): Promise<void> {
    // Try to show the real camera behind the UI (recognition itself is still mocked).
    if (video && typeof navigator !== "undefined" && navigator.mediaDevices) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        video.srcObject = this.stream;
        await video.play().catch(() => {});
      } catch {
        // No camera / permission denied — mock still emits predictions.
      }
    }

    const vocab = this.mode === "words" ? SAMPLE_WORDS : SAMPLE_LETTERS;
    this.timer = setInterval(() => {
      const label = vocab[Math.floor(Math.random() * vocab.length)];
      const confidence = 0.8 + Math.random() * 0.19; // 0.80–0.99
      this.listeners.forEach((cb) => cb({ label, confidence }));
    }, this.mode === "words" ? 1800 : 1100);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  onResult(cb: (p: Prediction) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}
