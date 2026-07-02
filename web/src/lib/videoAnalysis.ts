// Analyze an uploaded sign-language video: play it through the word model (MediaPipe hands
// -> rolling 30-frame LSTM) and collect the recognized Bangla words in order. The words then
// go to Gemini for a summary + detailed interpretation.

import { WordModel } from "./recognizer/wordModel";
import { createHandLandmarker, featuresFromResult } from "./recognizer/handLandmarks";
import { toBn } from "./recognizer/wordLabelsBn";

const CONF = 0.6;
const STABLE = 3;
const REEMIT_MS = 1500;
const DETECT_MS = 60;

export async function analyzeSignVideo(
  file: File,
  onProgress?: (frac: number, partial: string[]) => void,
): Promise<{ words: string[] }> {
  const model = await WordModel.load("/models/words/word_model.json");
  if (!model) throw new Error("word model not available");
  const landmarker = await createHandLandmarker(2);

  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error("cannot load video"));
  });

  const buffer: number[][] = [];
  const words: string[] = [];
  let streak = { i: -1, n: 0 };
  let last = { i: -1, t: 0 };
  let lastDetect = 0;

  await video.play().catch(() => {});

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    video.onended = done;

    const step = () => {
      if (video.ended || video.paused) return done();
      const now = performance.now();
      if (now - lastDetect >= DETECT_MS && video.readyState >= 2) {
        lastDetect = now;
        const res = landmarker.detectForVideo(video, now);
        const feats = featuresFromResult(res.landmarks as never, 2) ?? new Array(model.featureDim).fill(0);
        buffer.push(feats);
        if (buffer.length > model.seqLen) buffer.shift();
        if (buffer.length === model.seqLen && buffer.some((f) => f.some((v) => v !== 0))) {
          const { index, confidence } = model.predict(buffer);
          if (confidence >= CONF) {
            streak = index === streak.i ? { i: index, n: streak.n + 1 } : { i: index, n: 1 };
            const fresh = index !== last.i || now - last.t > REEMIT_MS;
            if (streak.n >= STABLE && fresh) {
              last = { i: index, t: now };
              words.push(toBn(model.classes[index]));
              onProgress?.(video.currentTime / (video.duration || 1), [...words]);
            }
          }
        }
      }
      onProgress?.(video.currentTime / (video.duration || 1), words);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  landmarker.close();
  URL.revokeObjectURL(video.src);
  return { words };
}
