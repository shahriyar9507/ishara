// Real recognizer: MediaPipe hand landmarks -> Dense classifier, with temporal smoothing.
// Implements the same Recognizer interface as MockRecognizer, so the UI is unchanged.

import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandFrame, LandmarkPoint, Prediction, RecoMode, Recognizer } from "./types";
import { DenseModel } from "./denseModel";
import { createHandLandmarker, featuresFromResult } from "./handLandmarks";

const CONF_THRESHOLD = 0.7; // min probability to consider a prediction
const WINDOW = 8; // frames of history for majority vote
const NEEDED = 5; // how many of WINDOW must agree to emit
const REEMIT_MS = 900; // don't emit the same label again within this window
const DETECT_INTERVAL = 55; // throttle detection to ~18fps so the UI never hangs

export class RealRecognizer implements Recognizer {
  mode: RecoMode;
  private model: DenseModel;
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private raf = 0;
  private running = false;
  private history: number[] = [];
  private last = { index: -1, t: 0 };
  private lastDetect = 0;
  private listeners = new Set<(p: Prediction) => void>();
  private lmListeners = new Set<(f: HandFrame) => void>();

  constructor(model: DenseModel, mode: RecoMode = "letters") {
    this.model = model;
    this.mode = mode;
  }

  async start(video?: HTMLVideoElement | null): Promise<void> {
    if (!video) throw new Error("RealRecognizer needs a <video> element");
    this.video = video;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = this.stream;
    await video.play().catch(() => {});
    this.landmarker = await createHandLandmarker(2);
    this.running = true;
    this.loop();
  }

  private loop = () => {
    if (!this.running || !this.landmarker || !this.video) return;
    const now = performance.now();
    if (this.video.readyState >= 2 && now - this.lastDetect >= DETECT_INTERVAL) {
      this.lastDetect = now;
      const res = this.landmarker.detectForVideo(this.video, now);
      const hands = (res.landmarks || []) as LandmarkPoint[][];
      if (this.lmListeners.size) this.lmListeners.forEach((cb) => cb({ hands }));
      const feats = featuresFromResult(res.landmarks as never, 2);
      if (feats && feats.length === this.model.featureDim) {
        const { index, confidence } = this.model.predict(feats);
        if (confidence >= CONF_THRESHOLD) this.push(index, confidence);
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private push(index: number, confidence: number) {
    this.history.push(index);
    if (this.history.length > WINDOW) this.history.shift();
    const count = this.history.filter((i) => i === index).length;
    const now = performance.now();
    const stable = count >= NEEDED;
    const fresh = index !== this.last.index || now - this.last.t > REEMIT_MS;
    if (stable && fresh) {
      this.last = { index, t: now };
      const label = this.model.classes[index];
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
    this.history = [];
  }

  onResult(cb: (p: Prediction) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onLandmarks(cb: (f: HandFrame) => void): () => void {
    this.lmListeners.add(cb);
    return () => this.lmListeners.delete(cb);
  }
}
