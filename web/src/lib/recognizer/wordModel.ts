// Word (Layer-2) model: rebuild the trained Keras LSTM in TF.js from exported weights.
// We ship plain weights (not a converted graph) and reconstruct the exact architecture,
// so no fragile tensorflowjs converter is involved. Loaded lazily (TF.js is ~heavy).

import type { DenseLayer } from "./denseModel";

export interface WordSpec {
  task: "words";
  seqLen: number;
  featureDim: number;
  classes: string[];
  lstm: { units: number; kernel: number[][]; recurrentKernel: number[][]; bias: number[] };
  dense: DenseLayer[];
}

export class WordModel {
  private constructor(
    private tf: typeof import("@tensorflow/tfjs"),
    private model: import("@tensorflow/tfjs").LayersModel,
    private spec: WordSpec,
  ) {}

  get classes() { return this.spec.classes; }
  get seqLen() { return this.spec.seqLen; }
  get featureDim() { return this.spec.featureDim; }

  /** sequence: [seqLen][featureDim] -> {label, confidence}. */
  predict(sequence: number[][]): { label: string; confidence: number; index: number } {
    return this.tf.tidy(() => {
      const x = this.tf.tensor3d([sequence], [1, this.spec.seqLen, this.spec.featureDim]);
      const out = this.model.predict(x) as import("@tensorflow/tfjs").Tensor;
      const probs = out.dataSync();
      let best = 0;
      for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
      return { label: this.spec.classes[best], confidence: probs[best], index: best };
    });
  }

  static async load(url: string): Promise<WordModel | null> {
    let spec: WordSpec;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      spec = (await res.json()) as WordSpec;
      if (!spec.lstm || !spec.classes?.length) return null;
    } catch {
      return null;
    }

    const tf = await import("@tensorflow/tfjs");

    const model = tf.sequential();
    model.add(tf.layers.masking({ maskValue: 0, inputShape: [spec.seqLen, spec.featureDim] }));
    // recurrentActivation 'sigmoid' matches Keras default (TF.js defaults to hardSigmoid).
    model.add(tf.layers.lstm({ units: spec.lstm.units, activation: "tanh", recurrentActivation: "sigmoid" }));
    for (let i = 0; i < spec.dense.length; i++) {
      const d = spec.dense[i];
      model.add(tf.layers.dense({ units: d.units, activation: d.activation as "relu" | "softmax" }));
    }

    // Set weights: LSTM = [kernel, recurrentKernel, bias]; each Dense = [W, b].
    const lstmLayer = model.layers[1];
    lstmLayer.setWeights([
      tf.tensor2d(spec.lstm.kernel),
      tf.tensor2d(spec.lstm.recurrentKernel),
      tf.tensor1d(spec.lstm.bias),
    ]);
    for (let i = 0; i < spec.dense.length; i++) {
      const d = spec.dense[i];
      model.layers[2 + i].setWeights([tf.tensor2d(d.W), tf.tensor1d(d.b)]);
    }

    return new WordModel(tf, model, spec);
  }
}
