import { ChevronDown } from "lucide-react";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-2xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-200 hover:border-line-strong focus:border-ink/60 focus:shadow-[0_0_0_4px_rgb(11_11_15/0.06)] focus:outline-none disabled:bg-mist disabled:text-muted";

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
  optional,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-medium text-ink-2">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-faint">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-critical" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-[13px] leading-relaxed text-muted">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-12", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "min-h-28 resize-y py-3 leading-relaxed", className)} {...props} />;
  },
);

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(fieldBase, "h-12 appearance-none pr-10")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-6", disabled && "opacity-50")}>
      <div>
        <label htmlFor={id} className="text-[15px] font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300",
          checked ? "bg-ink" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "inline-block size-5.5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[var(--ease-spring)]",
            checked ? "translate-x-[23px]" : "translate-x-[3px]",
          )}
        />
      </button>
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("scrollbar-none inline-flex max-w-full flex-nowrap gap-1 overflow-x-auto rounded-full bg-mist p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full font-medium transition-all duration-300 ease-[var(--ease-out-expo)] disabled:cursor-not-allowed disabled:opacity-40",
              size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
              active ? "bg-white text-ink shadow-[0_1px_3px_rgb(0_0_0/0.1),0_4px_12px_-6px_rgb(0_0_0/0.15)]" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className="range w-full"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ ["--fill" as string]: `${fill}%` }}
    />
  );
}
