// Browser hand-landmark capture via MediaPipe Tasks Vision, plus normalization that
// matches the Python trainer (wrist-centered, scaled by max |x,y| per hand, up to 2 hands
// -> 126-dim vector). WASM + model are fetched from CDNs at runtime.

import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const MP_VERSION = "0.10.14";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const LANDMARKS_PER_HAND = 21;
const FEATURES_PER_HAND = LANDMARKS_PER_HAND * 3; // 63

export async function createHandLandmarker(numHands = 2): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
    runningMode: "VIDEO",
    numHands,
  });
}

type Landmark = { x: number; y: number; z: number };

/** Normalize one hand's 21 landmarks to a 63-vector (wrist-centered, unit-scaled). */
function normalizeHand(pts: Landmark[]): number[] {
  const wrist = pts[0];
  const centered = pts.map((p) => [p.x - wrist.x, p.y - wrist.y, p.z - wrist.z]);
  let scale = 0;
  for (const [x, y] of centered) scale = Math.max(scale, Math.abs(x), Math.abs(y));
  if (scale < 1e-6) scale = 1;
  const out: number[] = [];
  for (const [x, y, z] of centered) out.push(x / scale, y / scale, z / scale);
  return out; // 63
}

/** Build the 126-dim feature vector (2 hands, zero-padded) from a detection result. */
export function featuresFromResult(
  landmarksList: Landmark[][],
  numHands = 2,
): number[] | null {
  if (!landmarksList || landmarksList.length === 0) return null;
  const vec = new Array(numHands * FEATURES_PER_HAND).fill(0);
  for (let i = 0; i < Math.min(numHands, landmarksList.length); i++) {
    const h = normalizeHand(landmarksList[i]);
    for (let k = 0; k < h.length; k++) vec[i * FEATURES_PER_HAND + k] = h[k];
  }
  return vec;
}
