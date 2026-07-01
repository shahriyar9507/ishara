"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { HandFrame } from "@/lib/recognizer/types";

// MediaPipe hand skeleton edges (21 landmarks).
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

/**
 * Draws a glowing hand skeleton over the (mirrored) camera. Runs its own rAF loop reading
 * the latest frame from `frameRef`, so drawing stays smooth (60fps) even though detection
 * is throttled to ~18fps. Accent color follows the active theme.
 */
export function TrackingOverlay({
  frameRef,
  mirrored = true,
  className = "",
}: {
  frameRef: RefObject<HandFrame | null>;
  mirrored?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const accent = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2e7dff";
    const glow = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--orb-glow").trim() || "#60a5fa";

    const draw = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const w = parent.clientWidth, h = parent.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
      }
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const frame = frameRef.current;
      if (frame?.hands?.length) {
        const a = accent(), g = glow();
        const px = (x: number) => (mirrored ? 1 - x : x) * W;
        const py = (y: number) => y * H;
        for (const hand of frame.hands) {
          // connections
          ctx.lineWidth = 3;
          ctx.strokeStyle = a;
          ctx.shadowColor = g;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          for (const [i, j] of HAND_CONNECTIONS) {
            if (!hand[i] || !hand[j]) continue;
            ctx.moveTo(px(hand[i].x), py(hand[i].y));
            ctx.lineTo(px(hand[j].x), py(hand[j].y));
          }
          ctx.stroke();
          // points
          for (const p of hand) {
            ctx.beginPath();
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = a;
            ctx.shadowBlur = 10;
            ctx.arc(px(p.x), py(p.y), 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [frameRef, mirrored]);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
