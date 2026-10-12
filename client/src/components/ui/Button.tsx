import { ArrowRight, Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cn } from "@/lib/cn";

type Variant = "solid" | "outline" | "ghost" | "soft" | "light" | "glass" | "gradient" | "danger";
type Size = "sm" | "md" | "lg";

interface StyleProps {
  variant?: Variant;
  size?: Size;
  /** Small uppercase label, as used on marketing CTAs. */
  caps?: boolean;
  /** Trailing arrow that nudges on hover. */
  arrow?: boolean;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  solid:
    "bg-ink text-white hover:bg-ink-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_10px_24px_-14px_rgb(11_11_15/0.7)]",
  outline: "border border-ink/85 text-ink hover:bg-ink hover:text-white",
  ghost: "text-ink hover:bg-mist",
  soft: "bg-mist text-ink hover:bg-line",
  light: "bg-white text-ink hover:bg-white/90 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.45)]",
  glass: "border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/15",
  gradient:
    "bg-brand-gradient text-white shadow-[0_12px_32px_-12px_rgb(232_51_111/0.65)] hover:shadow-[0_16px_40px_-12px_rgb(232_51_111/0.8)] hover:brightness-[1.05]",
  danger: "bg-critical text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-[52px] px-7 text-base gap-2.5",
};

export function buttonClasses({ variant = "solid", size = "md", caps, block }: StyleProps = {}, className?: string) {
  return cn(
    "group/button relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-medium",
    "transition-[background-color,color,box-shadow,transform,filter] duration-300 ease-[var(--ease-out-expo)]",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    caps && "text-[11.5px] font-semibold uppercase tracking-[0.12em]",
    block && "w-full",
    className,
  );
}

function Content({ children, arrow, loading }: { children: ReactNode; arrow?: boolean; loading?: boolean }) {
  return (
    <>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
      {arrow && !loading && (
        <ArrowRight
          className="size-[1.05em] transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover/button:translate-x-1"
          aria-hidden="true"
        />
      )}
    </>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, caps, arrow, block, loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, caps, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <Content arrow={arrow} loading={loading}>
        {children}
      </Content>
    </button>
  );
});

export function ButtonLink({ variant, size, caps, arrow, block, className, children, ...props }: LinkProps & StyleProps) {
  return (
    <Link className={buttonClasses({ variant, size, caps, block }, className)} {...props}>
      <Content arrow={arrow}>{children}</Content>
    </Link>
  );
}

export function IconButton({
  label,
  className,
  children,
  tone = "light",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "light" | "dark" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-40",
        tone === "light" ? "text-ink hover:bg-mist" : "text-white/80 hover:bg-white/10 hover:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
