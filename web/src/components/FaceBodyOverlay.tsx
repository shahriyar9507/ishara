"use client";

import { useEffect, useRef, type RefObject } from "react";

// Optional "full tracking" overlay: face mesh (mouth/eyes/oval) + body pose skeleton, on top
// of the camera. Runs its own FaceLandmarker + PoseLandmarker (lazy-loaded) only while active,
// throttled to ~15fps. Default OFF so the base experience stays smooth. Facial expression and
// body posture carry BdSL grammar, so this helps convey *how* something is said.

const MP_VERSION = "0.10.14";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const INTERVAL = 66; // ~15fps

type Pt = { x: number; y: number };

export function FaceBodyOverlay({
  videoRef,
  active,
  mirrored = true,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  mirrored?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let face: any = null, pose: any = null;
    let lastDetect = 0;
    let faceLm: Pt[][] = [], poseLm: Pt[][] = [];
    let faceConns: { start: number; end: number }[] = [];
    let poseConns: { start: number; end: number }[] = [];

    (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const { FilesetResolver, FaceLandmarker, PoseLandmarker } = vision;
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      if (cancelled) return;
      face = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
      });
      pose = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      faceConns = [
        ...FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        ...FaceLandmarker.FACE_LANDMARKS_LIPS,
        ...FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        ...FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
      ];
      poseConns = PoseLandmarker.POSE_CONNECTIONS as { start: number; end: number }[];

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const css = (v: string, f: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(v).trim() || f;

      const loop = () => {
        if (cancelled) return;
        const video = videoRef.current;
        const parent = canvas.parentElement;
        if (parent) {
          if (canvas.width !== parent.clientWidth) canvas.width = parent.clientWidth;
          if (canvas.height !== parent.clientHeight) canvas.height = parent.clientHeight;
        }
        const now = performance.now();
        if (video && video.readyState >= 2 && now - lastDetect >= INTERVAL) {
          lastDetect = now;
          try {
            faceLm = (face.detectForVideo(video, now).faceLandmarks || []) as Pt[][];
            poseLm = (pose.detectForVideo(video, now).landmarks || []) as Pt[][];
          } catch { /* transient */ }
        }

        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        const px = (x: number) => (mirrored ? 1 - x : x) * W;
        const py = (y: number) => y * H;
        const accent = css("--accent", "#2e7dff");
        const glow = css("--orb-glow", "#60a5fa");

        // pose skeleton
        ctx.strokeStyle = glow; ctx.lineWidth = 3; ctx.shadowColor = accent; ctx.shadowBlur = 8;
        for (const p of poseLm) {
          ctx.beginPath();
          for (const c of poseConns) {
            if (!p[c.start] || !p[c.end]) continue;
            ctx.moveTo(px(p[c.start].x), py(p[c.start].y));
            ctx.lineTo(px(p[c.end].x), py(p[c.end].y));
          }
          ctx.stroke();
        }
        // face mesh contours
        ctx.strokeStyle = "#e879f9"; ctx.lineWidth = 1.5; ctx.shadowColor = "#e879f9"; ctx.shadowBlur = 6;
        for (const f of faceLm) {
          ctx.beginPath();
          for (const c of faceConns) {
            if (!f[c.start] || !f[c.end]) continue;
            ctx.moveTo(px(f[c.start].x), py(f[c.start].y));
            ctx.lineTo(px(f[c.end].x), py(f[c.end].y));
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      face?.close?.();
      pose?.close?.();
    };
  }, [active, videoRef, mirrored]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
