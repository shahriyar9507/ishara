"use client";

import { GlassCard } from "./GlassCard";
import { CircleButton } from "./CircleButton";
import { SpeakerIcon, TrashIcon } from "./Icons";

/**
 * Live recognized-text panel. Shows the instant on-device text (letters/words) and,
 * a beat later, the polished Bangla sentence (Gemini, Phase 4). Speak + Clear controls.
 */
export function CaptionPanel({
  text,
  sentence,
  lastConfidence,
  speaking,
  onSpeak,
  onClear,
}: {
  text: string;
  sentence?: string | null;
  lastConfidence?: number;
  speaking?: boolean;
  onSpeak: () => void;
  onClear: () => void;
}) {
  const hasText = text.trim().length > 0;

  return (
    <GlassCard className="w-full p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-secondary">
          চেনা লেখা
        </span>
        {typeof lastConfidence === "number" && hasText && (
          <span className="text-xs text-secondary">
            {Math.round(lastConfidence * 100)}%
          </span>
        )}
      </div>

      <p
        className="bangla min-h-[2.5rem] text-2xl font-semibold leading-snug text-primary"
        aria-live="polite"
      >
        {hasText ? text : <span className="text-secondary">ইশারা দেখাও…</span>}
      </p>

      {sentence && (
        <p className="bangla mt-2 border-t border-glassborder pt-2 text-base text-secondary" aria-live="polite">
          {sentence}
        </p>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        <CircleButton label="Clear" onClick={onClear} disabled={!hasText}>
          <TrashIcon width={20} height={20} />
        </CircleButton>
        <CircleButton
          label="Speak"
          onClick={onSpeak}
          disabled={!hasText}
          className={speaking ? "text-accent" : ""}
        >
          <SpeakerIcon width={20} height={20} />
        </CircleButton>
      </div>
    </GlassCard>
  );
}
