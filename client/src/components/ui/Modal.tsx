import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  tone = "light",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button, input, textarea")?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full max-w-md rounded-[26px] p-7 shadow-2xl",
              tone === "light" ? "bg-white text-ink" : "border border-white/10 bg-[#17121f] text-white",
              className,
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full",
                tone === "light" ? "text-muted hover:bg-mist" : "text-white/60 hover:bg-white/10",
              )}
            >
              <X className="size-4" />
            </button>
            <h2 className="pr-8 font-display text-[22px] font-semibold leading-tight">{title}</h2>
            {description && (
              <p className={cn("mt-2 text-[15px] leading-relaxed", tone === "light" ? "text-muted" : "text-white/65")}>
                {description}
              </p>
            )}
            {children && <div className="mt-6">{children}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
