// Pure-TS inference for the exported Dense classifier (web/public/models/<task>/model.json).
// The model is tiny (126 -> 256 -> 128 -> N), so a plain forward pass per frame is fast
// and needs no ML library in the browser.

export interface DenseLayer {
  units: number;
  activation: string; // "relu" | "softmax" | "linear"
  W: number[][]; // [in, out]
  b: number[]; // [out]
}

export interface ModelSpec {
  task: string;
  featureDim: number;
  numHands: number;
  landmarksPerHand: number;
  normalization: string;
  classes: string[];
  layers: DenseLayer[];
}

function relu(v: number[]): number[] {
  return v.map((x) => (x > 0 ? x : 0));
}

function softmax(v: number[]): number[] {
  const m = Math.max(...v);
  const ex = v.map((x) => Math.exp(x - m));
  const s = ex.reduce((a, b) => a + b, 0) || 1;
  return ex.map((x) => x / s);
}

/** y = x·W + b  (x:[in], W:[in,out], b:[out]) -> [out] */
function dense(x: number[], layer: DenseLayer): number[] {
  const out = layer.b.slice();
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    if (xi === 0) continue;
    const row = layer.W[i];
    for (let j = 0; j < out.length; j++) out[j] += xi * row[j];
  }
  if (layer.activation === "relu") return relu(out);
  if (layer.activation === "softmax") return softmax(out);
  return out;
}

export class DenseModel {
  constructor(private spec: ModelSpec) {}

  get classes() {
    return this.spec.classes;
  }
  get featureDim() {
    return this.spec.featureDim;
  }

  /** Run the forward pass; return the top class label and its probability. */
  predict(features: number[]): { label: string; confidence: number; index: number } {
    let x = features;
    for (const layer of this.spec.layers) x = dense(x, layer);
    let best = 0;
    for (let i = 1; i < x.length; i++) if (x[i] > x[best]) best = i;
    return { label: this.spec.classes[best], confidence: x[best], index: best };
  }

  static async load(url: string): Promise<DenseModel | null> {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      const spec = (await res.json()) as ModelSpec;
      if (!spec.layers?.length || !spec.classes?.length) return null;
      return new DenseModel(spec);
    } catch {
      return null;
    }
  }
}
