import { cn } from "@/lib/cn";

/** The signature warm aurora: soft, blurred bands of orange, pink and violet. */
export function GlowBand({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-0", className)} aria-hidden="true" style={{ opacity: intensity }}>
      <div
        className="absolute left-[-10%] top-[10%] h-[70%] w-[60%] rounded-full blur-[70px]"
        style={{ background: "radial-gradient(closest-side, rgb(255 128 50 / 0.9), transparent)" }}
      />
      <div
        className="absolute left-[25%] top-[25%] h-[65%] w-[55%] rounded-full blur-[80px]"
        style={{ background: "radial-gradient(closest-side, rgb(236 60 130 / 0.85), transparent)" }}
      />
      <div
        className="absolute right-[-12%] top-[5%] h-[70%] w-[55%] rounded-full blur-[80px]"
        style={{ background: "radial-gradient(closest-side, rgb(255 170 40 / 0.7), transparent)" }}
      />
      <div
        className="absolute left-[40%] top-[45%] h-[55%] w-[45%] rounded-full blur-[90px]"
        style={{ background: "radial-gradient(closest-side, rgb(192 38 211 / 0.55), transparent)" }}
      />
    </div>
  );
}

/** A quiet corner wash for app pages. */
export function PageGlow({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden", className)} aria-hidden="true">
      <div
        className="absolute -top-40 left-[8%] h-[360px] w-[520px] rounded-full opacity-60 blur-[90px]"
        style={{ background: "radial-gradient(closest-side, rgb(255 160 110 / 0.55), transparent)" }}
      />
      <div
        className="absolute -top-48 right-[5%] h-[380px] w-[560px] rounded-full opacity-50 blur-[100px]"
        style={{ background: "radial-gradient(closest-side, rgb(236 72 137 / 0.4), transparent)" }}
      />
    </div>
  );
}
