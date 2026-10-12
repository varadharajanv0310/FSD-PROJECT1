import { Check, TrendingDown } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { GlowBand } from "@/components/brand/Glow";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/providers/AuthProvider";
import { PhoneMockup } from "./PhoneMockup";

const ease = [0.16, 1, 0.3, 1] as const;

function FloatingCard({
  className,
  delay,
  children,
}: {
  className: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay, ease }}
      className={`absolute z-10 hidden md:block ${className}`}
    >
      <div className="animate-float rounded-2xl border border-white/70 bg-white/80 p-3.5 shadow-[0_20px_50px_-20px_rgb(80_20_60/0.35)] backdrop-blur-xl" style={{ animationDelay: `${delay * -2}s` }}>
        {children}
      </div>
    </motion.div>
  );
}

export function Hero() {
  const { user } = useAuth();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);
  const phoneRotate = useTransform(scrollYProgress, [0, 1], [-8, reduce ? -8 : 0]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-[132px] sm:pt-[150px]">
      <div className="mx-auto max-w-[1200px] px-5 text-center sm:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="serif-accent text-[20px] text-ink-2 sm:text-[23px]"
        >
          Your interview, in perfect rhythm.
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.08, ease }}
          className="mx-auto mt-3 max-w-[820px] font-display text-[46px] font-semibold leading-[0.98] sm:text-[72px] lg:text-[84px]"
        >
          Nail the Interview,
          <br />
          Before It Happens
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.18, ease }}
          className="mx-auto mt-6 max-w-[560px] text-[15.5px] leading-relaxed text-muted sm:text-[16.5px]"
        >
          Poise runs realistic mock interviews, generates questions for your exact role, listens to your answers and
          gives specific, honest feedback — so the real one feels like a rerun.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.26, ease }}
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <ButtonLink to="/app/new" variant="outline" caps arrow className="h-12 px-6">
            {user ? "Start a mock interview" : "Try it for free"}
          </ButtonLink>
          <p className="text-[14px] text-muted">No sign-up needed.</p>
        </motion.div>
      </div>

      {/* Visual: aurora band + device */}
      <div className="relative mx-auto mt-6 h-[640px] max-w-[1280px] sm:mt-2">
        <GlowBand className="top-[100px] h-[440px]" intensity={1} />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-white" />

        <div className="absolute left-1/2 top-12 -translate-x-1/2">
          <motion.div style={{ y: phoneY, rotate: phoneRotate }}>
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease }}
              style={{ perspective: 1400 }}
            >
              <div style={{ transform: "rotateY(-10deg) rotateX(6deg)" }}>
                <PhoneMockup />
              </div>
            </motion.div>
          </motion.div>
        </div>

        <FloatingCard className="left-[calc(50%-420px)] top-[150px]" delay={0.7}>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Relevance</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-[30px] font-semibold leading-none">92</span>
            <div className="mb-1 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-data-track)]">
              <div className="h-full w-[92%] rounded-full bg-[var(--color-data)]" />
            </div>
          </div>
        </FloatingCard>

        <FloatingCard className="left-[calc(50%+190px)] top-[110px]" delay={0.85}>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#fff1e8] text-[#c2410c]">
              <TrendingDown className="size-4.5" />
            </span>
            <div>
              <p className="text-[13px] font-semibold">Filler words −40%</p>
              <p className="text-[12px] text-muted">vs. your last session</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard className="left-[calc(50%-500px)] top-[390px]" delay={1}>
          <p className="mb-2 text-[12px] font-semibold">STAR structure</p>
          <div className="flex gap-1.5">
            {["Situation", "Task", "Action", "Result"].map((part) => (
              <span key={part} className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-1 text-[11px] font-medium text-ink-2">
                <Check className="size-3 text-good" />
                {part}
              </span>
            ))}
          </div>
        </FloatingCard>

        <FloatingCard className="left-[calc(50%+210px)] top-[350px]" delay={1.15}>
          <p className="text-[12px] text-muted">Sample answer</p>
          <p className="mt-1 max-w-[220px] text-[13px] leading-snug text-ink-2">
            <span className="serif-accent text-[15px] text-ink">“I asked why he preferred it —</span> his concern was fair…”
          </p>
        </FloatingCard>
      </div>
    </section>
  );
}
