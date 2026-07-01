// Recognition engine abstraction.
// The mock recognizer (Phase 3) and the real MediaPipe + TF.js engine (Phase 3+/after
// Phase 2 training) both implement `Recognizer`, so the UI never changes when we swap.

export type RecoMode = "letters" | "words" | "sentences";

export type OrbState = "idle" | "capturing" | "recognizing" | "speaking";

export interface Prediction {
  /** Recognized label in Bangla (letter or word). */
  label: string;
  /** 0..1 model confidence. */
  confidence: number;
}

export interface Recognizer {
  /** Begin capture/inference. Attach camera stream to the given video element if needed. */
  start(video?: HTMLVideoElement | null): Promise<void>;
  /** Stop capture/inference and release resources. */
  stop(): void;
  /** Subscribe to confirmed predictions. Returns an unsubscribe fn. */
  onResult(cb: (p: Prediction) => void): () => void;
  /** Which recognition mode this engine is producing. */
  mode: RecoMode;
}
