import { cn } from "@/lib/cn";

export type OrbState = "idle" | "speaking" | "listening" | "thinking";

/**
 * Poise's interviewer: a living gradient orb. It breathes when idle, emits
 * rings while speaking, swells with your voice while listening and spins
 * faster while thinking.
 */
export function Orb({
  size = 160,
  state = "idle",
  level = 0,
  className,
  glow = true,
}: {
  size?: number;
  state?: OrbState;
  /** Microphone level 0–1, used while listening. */
  level?: number;
  className?: string;
  glow?: boolean;
}) {
  const spin = state === "thinking" ? "3.5s" : state === "speaking" ? "8s" : "16s";
  const scale = state === "listening" ? 1 + Math.min(level, 1) * 0.12 : 1;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} aria-hidden="true">
      {glow && (
        <div
          className="absolute -inset-[35%] rounded-full opacity-80 blur-[48px] transition-opacity duration-700"
          style={{
            background:
              "radial-gradient(circle, rgb(236 72 137 / 0.55) 0%, rgb(255 122 47 / 0.32) 40%, rgb(109 40 217 / 0.18) 60%, transparent 72%)",
          }}
        />
      )}

      {state === "speaking" &&
        [0, 1, 2].map((ring) => (
          <span
            key={ring}
            className="absolute inset-0 animate-pulse-ring rounded-full border border-white/40"
            style={{ animationDelay: `${ring * 0.8}s` }}
          />
        ))}

      <div
        className="absolute inset-0 overflow-hidden rounded-full transition-transform duration-150 ease-out"
        style={{ transform: `scale(${scale})` }}
      >
        <div
          className="absolute -inset-1/4 animate-spin-slow"
          style={{
            animationDuration: spin,
            background:
              "conic-gradient(from 0deg, #ff7a2f, #ec4889, #c026d3, #6d28d9, #3b5bff, #ec4889, #ffb020, #ff7a2f)",
            filter: `blur(${size * 0.11}px)`,
          }}
        />
        <div
          className="absolute -inset-1/4 animate-spin-slow mix-blend-screen"
          style={{
            animationDuration: `calc(${spin} * 1.6)`,
            animationDirection: "reverse",
            background: "conic-gradient(from 90deg, transparent, rgb(255 210 140 / 0.65), transparent 40%, rgb(255 90 160 / 0.5), transparent 75%)",
            filter: `blur(${size * 0.08}px)`,
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 26%, rgb(255 255 255 / 0.85) 0%, rgb(255 255 255 / 0.18) 26%, transparent 52%)",
          }}
        />
        <div className="absolute inset-0 rounded-full shadow-[inset_0_-14px_36px_rgb(46_8_70/0.5),inset_0_8px_20px_rgb(255_255_255/0.35)]" />
      </div>
    </div>
  );
}
