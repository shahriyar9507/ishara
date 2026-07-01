// Factory: use the real MediaPipe + Dense engine when a trained model is present,
// otherwise fall back to the mock so the app always runs. The UI only sees `Recognizer`.

import type { RecoMode, Recognizer } from "./types";
import { MockRecognizer } from "./mockRecognizer";
import { DenseModel } from "./denseModel";

const LETTERS_URL = "/models/letters/model.json";
const WORDS_URL = "/models/words/word_model.json";

export async function createRecognizer(mode: RecoMode): Promise<Recognizer> {
  // Words / sentences: dynamic LSTM word model (falls back to mock if not present).
  if (mode === "words" || mode === "sentences") {
    const { WordModel } = await import("./wordModel");
    const wm = await WordModel.load(WORDS_URL);
    if (wm) {
      const { RealWordRecognizer } = await import("./realWordRecognizer");
      return new RealWordRecognizer(wm, mode);
    }
    return new MockRecognizer(mode);
  }

  // Letters: static Dense model over MediaPipe landmarks.
  const model = await DenseModel.load(LETTERS_URL);
  if (model) {
    const { RealRecognizer } = await import("./realRecognizer");
    return new RealRecognizer(model, mode);
  }
  return new MockRecognizer(mode);
}
