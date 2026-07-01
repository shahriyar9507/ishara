"use client";

import { MicIcon, StopIcon } from "./Icons";

/** Central mic FAB — toggles camera recognition; shows pulse rings while active. */
export function MicFAB({
  active,
  onClick,
  size = 76,
}: {
  active: boolean;
  onClick: () => void;
  size?: number;
}) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {active && (
        <>
          <span className="pulse-ring" />
          <span className="pulse-ring" style={{ animationDelay: "1s" }} />
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={active ? "Stop recognition" : "Start recognition"}
        className="accent-gradient relative z-10 flex items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95"
        style={{
          width: size,
          height: size,
          boxShadow: "0 10px 30px color-mix(in srgb, var(--accent) 50%, transparent)",
        }}
      >
        {active ? <StopIcon width={30} height={30} /> : <MicIcon width={30} height={30} />}
      </button>
    </div>
  );
}
