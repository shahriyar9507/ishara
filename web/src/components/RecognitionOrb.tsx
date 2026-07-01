import type { OrbState } from "@/lib/recognizer/types";

/** Glowing energy sphere — the recognition-status indicator (idle/capturing/recognizing/speaking). */
export function RecognitionOrb({
  state = "idle",
  size = 200,
}: {
  state?: OrbState;
  size?: number;
}) {
  return (
    <div
      className="orb"
      data-state={state}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Recognition status: ${state}`}
    />
  );
}
