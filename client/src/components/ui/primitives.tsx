import { Loader2 } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[22px] border border-line bg-white shadow-[0_1px_2px_rgb(16_16_24/0.04)]", className)}
      {...props}
    />
  );
}

export function Chip({
  className,
  tone = "neutral",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "ink" | "rose" | "glass" | "outline" }) {
  const tones = {
    neutral: "bg-mist text-ink-2",
    ink: "bg-ink text-white",
    rose: "bg-[#fde7ef] text-[#a8174a]",
    glass: "bg-white/10 text-white/85 border border-white/10",
    outline: "border border-line text-muted",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-muted", className)} aria-label={label} role="status" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden="true" />;
}

export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("serif-accent text-[19px] text-muted sm:text-[21px]", className)}>{children}</p>;
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-current/20 px-1 font-sans text-[10.5px] font-medium opacity-70",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-mist text-ink">{icon}</div>}
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="serif-accent text-[17px] text-muted">{eyebrow}</p>}
        <h2 className="font-display text-[22px] font-semibold leading-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}
