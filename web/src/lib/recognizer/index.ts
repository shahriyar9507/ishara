// Factory: use the real MediaPipe + Dense engine when a trained model is present,
// otherwise fall back to the mock so the app always runs. The UI only sees `Recognizer`.

import type { RecoMode, Recognizer } from "./types";
import { MockRecognizer } from "./mockRecognizer";
import { DenseModel } from "./denseModel";

// letters model lives at /models/letters/model.json (words model added later)
const MODEL_URL: Record<string, string> = {
  letters: "/models/letters/model.json",
  words: "/models/words/model.json",
  sentences: "/models/words/model.json",
};

export async function createRecognizer(mode: RecoMode): Promise<Recognizer> {
  const url = MODEL_URL[mode] ?? MODEL_URL.letters;
  const model = await DenseModel.load(url);
  if (model) {
    // Lazy-import the heavy MediaPipe engine only when a real model exists.
    const { RealRecognizer } = await import("./realRecognizer");
    return new RealRecognizer(model, mode);
  }
  return new MockRecognizer(mode);
}

/** True if a trained model is available for this mode (for UI hints). */
export async function hasTrainedModel(mode: RecoMode): Promise<boolean> {
  return (await DenseModel.load(MODEL_URL[mode] ?? MODEL_URL.letters)) !== null;
}
