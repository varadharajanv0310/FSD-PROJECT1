import { Link } from "react-router";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block size-[22px] shrink-0 rounded-full", className)}
      style={{
        background:
          "radial-gradient(circle at 35% 30%, #ffd27a 0%, #ff7a3d 32%, #e2337a 64%, #6d28d9 100%)",
      }}
    >
      <span className="absolute inset-[30%] rounded-full bg-white/90" />
    </span>
  );
}

export function Logo({ to = "/", tone = "dark", className }: { to?: string; tone?: "dark" | "light"; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 font-display text-[19px] font-semibold tracking-[-0.04em]",
        tone === "dark" ? "text-ink" : "text-white",
        className,
      )}
      aria-label="Poise home"
    >
      <LogoMark />
      Poise
    </Link>
  );
}
