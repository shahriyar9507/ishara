/** Animated waveform bars reflecting live recognition activity (like the reference). */
export function ActivityWave({
  active = false,
  bars = 28,
}: {
  active?: boolean;
  bars?: number;
}) {
  return (
    <div className="wave" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            height: active ? undefined : "18%",
            opacity: active ? undefined : 0.35,
            animationPlayState: active ? "running" : "paused",
            // Vary phase/speed per bar for an organic look.
            animationDelay: `${(i % 7) * 0.09}s`,
            animationDuration: `${0.8 + (i % 5) * 0.14}s`,
          }}
        />
      ))}
    </div>
  );
}
