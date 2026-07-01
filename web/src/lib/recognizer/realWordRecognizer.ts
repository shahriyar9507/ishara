// Real word recognizer: MediaPipe landmarks -> rolling 30-frame sequence -> LSTM word model.
// Implements the Recognizer interface (same as letters/mock), so the UI is unchanged.

import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { Prediction, RecoMode, Recognizer } from "./types";
import type { WordModel } from "./wordModel";
import { createHandLandmarker, featuresFromResult } from "./handLandmarks";
import { toBn } from "./wordLabelsBn";

const CONF_THRESHOLD = 0.6;
const PREDICT_EVERY = 4;     // run the LSTM every N frames (throttle)
const STABLE_NEEDED = 3;     // consecutive same top word to emit
const REEMIT_MS = 1800;      // don't repeat the same word within this window

export class RealWordRecognizer implements Recognizer {
  mode: RecoMode;
  private model: WordModel;
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private raf = 0;
  private running = false;
  private buffer: number[][] = [];
  private frame = 0;
  private streak = { index: -1, n: 0 };
  private last = { index: -1, t: 0 };
  private listeners = new Set<(p: Prediction) => void>();

  constructor(model: WordModel, mode: RecoMode = "words") {
    this.model = model;
    this.mode = mode;
  }

  async start(video?: HTMLVideoElement | null): Promise<void> {
    if (!video) throw new Error("RealWordRecognizer needs a <video> element");
    this.video = video;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = this.stream;
    await video.play().catch(() => {});
    this.landmarker = await createHandLandmarker(2);
    this.running = true;
    this.buffer = [];
    this.loop();
  }

  private loop = () => {
    if (!this.running || !this.landmarker || !this.video) return;
    if (this.video.readyState >= 2) {
      const res = this.landmarker.detectForVideo(this.video, performance.now());
      const feats = featuresFromResult(res.landmarks as never, 2) ?? new Array(this.model.featureDim).fill(0);
      this.buffer.push(feats);
      if (this.buffer.length > this.model.seqLen) this.buffer.shift();
      this.frame++;
      if (this.buffer.length === this.model.seqLen && this.frame % PREDICT_EVERY === 0) {
        this.classify();
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private classify() {
    const nonZero = this.buffer.some((f) => f.some((v) => v !== 0));
    if (!nonZero) return; // no hands in the window
    const { index, confidence } = this.model.predict(this.buffer);
    if (confidence < CONF_THRESHOLD) {
      this.streak = { index: -1, n: 0 };
      return;
    }
    this.streak = index === this.streak.index ? { index, n: this.streak.n + 1 } : { index, n: 1 };
    const now = performance.now();
    const fresh = index !== this.last.index || now - this.last.t > REEMIT_MS;
    if (this.streak.n >= STABLE_NEEDED && fresh) {
      this.last = { index, t: now };
      const label = toBn(this.model.classes[index]);
      this.listeners.forEach((cb) => cb({ label, confidence }));
    }
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.landmarker?.close();
    this.landmarker = null;
    this.buffer = [];
  }

  onResult(cb: (p: Prediction) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}
