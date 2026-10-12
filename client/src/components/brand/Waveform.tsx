import { cn } from "@/lib/cn";

/**
 * Audio bars. With `level` it reacts to a live microphone; without, it plays
 * a looping idle animation (used in marketing mockups).
 */
export function Waveform({
  bars = 28,
  level,
  active = true,
  className,
  barClassName,
}: {
  bars?: number;
  level?: number;
  active?: boolean;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn("flex h-10 items-center gap-[3px]", className)} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => {
        // A smooth envelope so the middle bars are tallest.
        const envelope = 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / bars);
        const jitter = 0.55 + 0.45 * Math.abs(Math.sin(i * 12.9898));
        const live = level !== undefined;
        const height = live ? Math.max(0.12, Math.min(1, level * 2.4 * envelope * jitter + 0.08)) : envelope;
        return (
          <span
            key={i}
            className={cn(
              "h-full w-[3px] origin-center rounded-full bg-current transition-transform duration-100",
              !live && active && "animate-wave",
              barClassName,
            )}
            style={
              live
                ? { transform: `scaleY(${active ? height : 0.12})` }
                : { animationDelay: `${(i % 7) * -0.13 - i * 0.04}s`, transform: active ? undefined : "scaleY(0.15)", height: `${envelope * 100}%` }
            }
          />
        );
      })}
    </div>
  );
}
