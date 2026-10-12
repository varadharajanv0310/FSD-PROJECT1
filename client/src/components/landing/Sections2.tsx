import { Code2, Plus, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ROLES, type RoleId } from "@poise/shared";
import { LogoMark } from "@/components/brand/Logo";
import { Orb } from "@/components/brand/Orb";
import { Reveal } from "@/components/brand/Reveal";
import { Waveform } from "@/components/brand/Waveform";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { isStandalone } from "@/lib/env";
import { RoleIcon, ROLE_GRADIENTS } from "@/lib/roles";
import { useAuth } from "@/providers/AuthProvider";
import { Container } from "./Sections";

/* ── Bento ───────────────────────────────────────────────────────────── */

export function Bento() {
  return (
    <section className="pb-20 sm:pb-28">
      <Container>
        <div className="grid gap-5 lg:grid-cols-6">
          <Reveal className="lg:col-span-4">
            <div className="flex h-full flex-col justify-between gap-8 overflow-hidden rounded-[28px] bg-mist p-7 sm:flex-row sm:p-9">
              <div className="max-w-[260px]">
                <h3 className="font-display text-[26px] font-semibold leading-tight">Adaptive follow-ups</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">
                  Vague answer? Missing result? Poise notices and probes — the way a sharp interviewer would.
                </p>
              </div>
              <div className="flex w-full max-w-[360px] flex-col gap-2.5 text-[13px]">
                <div className="self-start rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
                  How would you add caching to a slow endpoint?
                </div>
                <div className="self-end rounded-2xl rounded-tr-md bg-ink px-4 py-3 text-white">
                  I'd put Redis in front of the database with a TTL…
                </div>
                <div className="self-start rounded-2xl rounded-tl-md bg-brand-gradient px-4 py-3 text-white shadow-[0_10px_30px_-12px_rgb(232_51_111/0.7)]">
                  <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/75">
                    Follow-up
                  </span>
                  What happens when that cache goes stale?
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-2">
            <div className="noise relative flex h-full min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-[#5b21b6] via-[#a21caf] to-[#ec4889] p-7 text-white sm:p-9">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium">Filler radar</span>
                <span className="text-[12px] text-white/70">3 this answer</span>
              </div>
              <p className="text-[15px] leading-relaxed text-white/90">
                So <span className="mark-filler text-white">basically</span> I owned the API, and{" "}
                <span className="mark-filler text-white">like,</span> we cut latency by half.{" "}
                <span className="mark-hedge text-white">I think</span> it worked.
              </p>
              <h3 className="font-display text-[22px] font-semibold leading-tight">Hear yourself the way they do.</h3>
            </div>
          </Reveal>

          <Reveal delay={0.04} className="lg:col-span-2">
            <div className="flex h-full min-h-[280px] flex-col justify-between rounded-[28px] bg-mist p-7 sm:p-9">
              <h3 className="font-display text-[22px] font-semibold leading-tight">Progress you can measure</h3>
              <svg viewBox="0 0 240 90" className="w-full" role="img" aria-label="Average score rising from 44 to 81 over seven sessions">
                <path d="M0 78 L40 52 L80 46 L120 40 L160 33 L200 24 L240 20 L240 90 L0 90 Z" fill="var(--color-data)" fillOpacity="0.1" />
                <path d="M0 78 L40 52 L80 46 L120 40 L160 33 L200 24 L240 20" fill="none" stroke="var(--color-data)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx="236" cy="20" r="4.5" fill="var(--color-data)" stroke="var(--color-mist)" strokeWidth="2" />
              </svg>
              <p className="text-[13px] text-muted">
                Demo candidate: <span className="font-semibold text-ink">44 → 81</span> in seven sessions
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="lg:col-span-4">
            <div className="relative flex h-full min-h-[280px] flex-col justify-between gap-8 overflow-hidden rounded-[28px] bg-night p-7 text-white sm:flex-row sm:items-center sm:p-9">
              <div
                className="absolute -right-20 -top-20 size-80 rounded-full opacity-50 blur-[80px]"
                style={{ background: "radial-gradient(closest-side,#e8336f,transparent)" }}
              />
              <div className="relative max-w-[360px]">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/80">
                  <WifiOff className="size-3.5" /> Works offline
                </span>
                <h3 className="mt-4 font-display text-[26px] font-semibold leading-tight">Claude when you have it. A coach when you don't.</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/65">
                  With an API key, Claude writes questions and feedback. Without one, Poise's built-in engine — a curated
                  bank and a transparent scoring rubric — keeps every session running.
                </p>
              </div>
              <Orb size={150} state="thinking" className="relative mx-auto sm:mx-0" />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ── Why it works ────────────────────────────────────────────────────── */

const REASONS = [
  {
    title: "Feedback you can act on",
    body: "Every score comes with the evidence behind it, the key points you missed and a stronger sample answer.",
  },
  {
    title: "Practice that feels real",
    body: "Timed questions, spoken answers and follow-ups that probe — the pressure of a panel, without the stakes.",
  },
  {
    title: "Progress you can see",
    body: "Five dimensions tracked over time, with a weekly practice plan aimed squarely at your weakest one.",
  },
];

function ReasonVisual({ index }: { index: number }) {
  if (index === 0)
    return (
      <div className="w-full max-w-[340px] rounded-3xl bg-white p-6 shadow-[0_30px_60px_-30px_rgb(60_20_60/0.35)]">
        <div className="flex items-center gap-4">
          <div className="relative size-16">
            <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
              <circle cx="32" cy="32" r="27" fill="none" strokeWidth="6" stroke="color-mix(in oklab, var(--color-good) 16%, white)" />
              <circle cx="32" cy="32" r="27" fill="none" strokeWidth="6" strokeLinecap="round" stroke="var(--color-good)" strokeDasharray="169.6" strokeDashoffset="37" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-semibold">78</span>
          </div>
          <div>
            <p className="font-semibold">Strong answer</p>
            <p className="text-[13px] text-muted">Structure could be tighter</p>
          </div>
        </div>
        <div className="mt-5 space-y-2 text-[13px]">
          <p className="rounded-xl bg-[#ecfaec] px-3 py-2 text-[#14532d]">✓ You quantified the impact — “cut load time by 40%”.</p>
          <p className="rounded-xl bg-[#fff4ec] px-3 py-2 text-[#7c2d12]">→ Close with what you learned, in one sentence.</p>
        </div>
      </div>
    );
  if (index === 1)
    return (
      <div className="w-full max-w-[340px] rounded-3xl bg-night p-6 text-white shadow-[0_30px_60px_-30px_rgb(60_20_60/0.6)]">
        <div className="flex items-center justify-between text-[12px] text-white/60">
          <span>Follow-up · Caching</span>
          <span className="tabular-nums">00:48</span>
        </div>
        <div className="my-6 flex justify-center">
          <Orb size={92} state="speaking" />
        </div>
        <p className="text-center font-display text-[17px] leading-snug">What happens when that cache goes stale?</p>
        <Waveform bars={26} className="mx-auto mt-5 h-7 justify-center text-white/50" />
      </div>
    );
  return (
    <div className="w-full max-w-[340px] rounded-3xl bg-white p-6 shadow-[0_30px_60px_-30px_rgb(60_20_60/0.35)]">
      <p className="text-[13px] font-semibold">Your five dimensions</p>
      <div className="mt-4 space-y-3">
        {[
          ["Relevance", 82],
          ["Depth", 71],
          ["Structure", 63],
          ["Clarity", 78],
          ["Confidence", 74],
        ].map(([label, value]) => (
          <div key={label} className="grid grid-cols-[84px_1fr_24px] items-center gap-3 text-[12.5px]">
            <span className="text-muted">{label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-[var(--color-data-track)]">
              <span className="block h-full rounded-full bg-[var(--color-data)]" style={{ width: `${value}%` }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-xl bg-mist px-3 py-2 text-[12.5px] text-ink-2">
        <span className="font-semibold">Focus next:</span> Structure — drill the STAR skeleton.
      </p>
    </div>
  );
}

export function WhyItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setActive((value) => (value + 1) % REASONS.length), 5000);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <Reveal>
            <p className="serif-accent text-[21px] text-muted">Why it works</p>
            <h2 className="mt-1 font-display text-[36px] font-semibold leading-[1.05] sm:text-[48px]">
              Built for focus, made
              <br />
              for real interviews.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-[380px] text-[15px] leading-relaxed text-muted lg:ml-auto">
              Reading tips doesn't change how you sound under pressure. Deliberate practice with honest feedback does.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <ol className="divide-y divide-line border-y border-line">
            {REASONS.map((reason, index) => {
              const isActive = index === active;
              return (
                <li key={reason.title} className="relative">
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-expanded={isActive}
                    className="flex w-full items-start gap-5 py-6 text-left"
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-0 h-full w-[2px] origin-top transition-transform duration-700 ease-[var(--ease-out-expo)]",
                        isActive ? "scale-y-100 bg-[var(--color-data)]" : "scale-y-0",
                      )}
                    />
                    <span className={cn("serif-accent pl-5 text-[20px] transition-colors", isActive ? "text-[var(--color-data)]" : "text-faint")}>
                      0{index + 1}
                    </span>
                    <span className="flex-1">
                      <span className={cn("block text-[17px] font-semibold transition-colors", isActive ? "text-ink" : "text-muted")}>
                        {reason.title}
                      </span>
                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.span
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="block overflow-hidden"
                          >
                            <span className="block pt-2 text-[14.5px] leading-relaxed text-muted">{reason.body}</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[28px] bg-mist p-8">
            <div
              className="absolute inset-0 opacity-70"
              style={{ background: "radial-gradient(60% 60% at 70% 30%, #ffd6e7, transparent), radial-gradient(50% 50% at 20% 90%, #ffe4cc, transparent)" }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex w-full justify-center"
              >
                <ReasonVisual index={active} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── Curved role carousel ────────────────────────────────────────────── */

const SAMPLE_QUESTIONS: Record<RoleId, string> = {
  "software-engineer": "How does a hash map handle collisions?",
  frontend: "Explain the event loop and microtasks.",
  backend: "Two users book the last seat. Now what?",
  fullstack: "Walk me through a request, click to database.",
  "data-scientist": "How would you evaluate a fraud model?",
  "data-analyst": "Find each customer's latest order in SQL.",
  devops: "The site returns 500s at 2 a.m. Go.",
  mobile: "Build a notes app that works offline.",
  "product-manager": "DAU dropped 10%. How do you investigate?",
  "ui-ux": "Checkout drop-off is 70%. Redesign it.",
};

export function RoleCarousel() {
  const [active, setActive] = useState(0);
  const n = ROLES.length;

  useEffect(() => {
    const timer = setInterval(() => setActive((value) => (value + 1) % n), 2600);
    return () => clearInterval(timer);
  }, [n]);

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <Container className="text-center">
        <Reveal>
          <p className="serif-accent text-[21px] text-muted">No stress, just flow.</p>
          <h2 className="mt-1 font-display text-[38px] font-semibold leading-[1.05] sm:text-[52px]">
            Every Role. Every Round.
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-[15px] text-muted">
            From campus SDE rounds to product sense — start organising, prioritising and nailing your answers today.
          </p>
          <ButtonLink to="/app/new" variant="outline" size="sm" caps arrow className="mt-6">
            Try it for free
          </ButtonLink>
        </Reveal>
      </Container>

      <div className="relative mt-14 h-[330px]" style={{ perspective: "1300px" }} aria-roledescription="carousel" aria-label="Interview tracks">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[220px] -translate-y-1/2 opacity-70" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-full w-[70%] -translate-x-1/2 rounded-full bg-[#ffd3e6] blur-[80px]" />
        </div>
        <div className="absolute left-1/2 top-0 h-full" style={{ transformStyle: "preserve-3d" }}>
          {ROLES.map((role, index) => {
            let offset = (index - active + n) % n;
            if (offset > n / 2) offset -= n;
            const distance = Math.abs(offset);
            const visible = distance <= 3;
            return (
              <article
                key={role.id}
                aria-hidden={offset !== 0}
                className="absolute top-0 h-[300px] w-[210px] -translate-x-1/2 overflow-hidden rounded-[26px] p-5 text-left text-white shadow-[0_30px_60px_-30px_rgb(40_10_50/0.6)] transition-[transform,opacity] duration-[900ms] ease-[var(--ease-out-expo)]"
                style={{
                  background: ROLE_GRADIENTS[role.id],
                  transform: `translateX(calc(${offset} * min(46vw, 226px))) translateZ(${-distance * 70}px) rotateY(${offset * -16}deg)`,
                  opacity: visible ? 1 - distance * 0.12 : 0,
                  zIndex: 10 - distance,
                }}
              >
                <div className="noise absolute inset-0" />
                <div className="relative flex h-full flex-col">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                    <RoleIcon role={role.id} className="size-5" />
                  </span>
                  <p className="mt-auto text-[12px] font-medium uppercase tracking-[0.14em] text-white/70">{role.short}</p>
                  <p className="mt-1 font-display text-[19px] font-semibold leading-snug">{role.label}</p>
                  <p className="serif-accent mt-3 text-[17px] leading-snug text-white/90">“{SAMPLE_QUESTIONS[role.id]}”</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Tips ────────────────────────────────────────────────────────────── */

const TIPS = [
  ["Lead with the answer", "Your first sentence should answer the question. Context comes second."],
  ["Tell stories in STAR", "Situation, task, action, result — the shape interviewers listen for."],
  ["Quantify your impact", "“Cut load time by 40%” beats “made it faster” every time."],
  ["Pause, don't fill", "A beat of silence sounds composed. “Um” and “like” don't."],
  ["Think out loud", "On hard questions, narrate your reasoning — it's what they're grading."],
  ["Close the loop", "End with what you learned or what you'd do differently next time."],
];

export function Tips() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <Reveal>
            <h2 className="font-display text-[40px] font-semibold leading-[1] sm:text-[56px]">
              Interview Smarter
              <br />
              <span className="serif-accent font-normal">Every Day</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-[220px] text-[15px] font-medium leading-snug text-ink-2 sm:text-right">
              Helpful habits. Honest feedback. Better answers.
            </p>
          </Reveal>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.3fr]">
          <Reveal>
            <div className="relative flex aspect-[4/4.2] items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1e40ff] via-[#2f5bff] to-[#0a1a8f]">
              <div
                className="absolute -bottom-16 -left-10 size-72 rounded-full opacity-60 blur-[70px]"
                style={{ background: "radial-gradient(closest-side,#ff5fa2,transparent)" }}
              />
              <Orb size={200} state="speaking" />
              <p className="absolute bottom-6 left-6 right-6 text-[13px] text-white/75">
                Poise reads every question aloud — answer the way you will on the day.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {TIPS.map(([title, body], index) => (
              <Reveal key={title} delay={(index % 2) * 0.08}>
                <span className="serif-accent text-[20px] text-faint">0{index + 1}</span>
                <h3 className="mt-2 text-[16px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: "Do I need to create an account?",
    a: "No. Poise sets up a private profile for your browser the first time you open it, so you can start practising straight away. Add your name and target role in Settings if you like, and erase everything there whenever you want.",
  },
  {
    q: "Do I need an AI API key to use Poise?",
    a: "No. With an Anthropic API key, Claude generates questions and writes feedback. Without one, Poise's built-in engine uses a curated bank of 115 questions and a transparent scoring rubric, so every feature still works — even offline.",
  },
  {
    q: "Is my voice or video recorded?",
    a: "No. Speech is transcribed by your browser, and the camera preview never leaves your device — it's only there so you can practise eye contact. Poise stores the text of your answers so it can give feedback and track progress.",
  },
  {
    q: "Which browsers support spoken answers?",
    a: isStandalone
      ? "In the full app, voice answers use the Web Speech API in Chrome, Edge and Safari. This in-browser preview can't use the microphone, so answers are typed — feedback works exactly the same."
      : "Voice answers use the Web Speech API, available in Chrome, Edge and Safari. In other browsers you can type your answers — feedback works exactly the same.",
  },
  {
    q: "How are answers scored?",
    a: "Every answer is scored from 0–100 on relevance, depth, structure, clarity and confidence. Filler words, hedging, pace and STAR structure are measured directly from your answer, so the feedback always points to evidence.",
  },
  {
    q: "Can I practise for a specific job?",
    a: "Yes. Paste the job description and company name when you set up an interview, and the questions are tailored to the skills and responsibilities it mentions.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 py-16 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
        <Reveal>
          <p className="serif-accent text-[21px] text-muted">Good questions</p>
          <h2 className="mt-1 font-display text-[38px] font-semibold leading-[1.05] sm:text-[48px]">
            Before you
            <br />
            start practising
          </h2>
        </Reveal>
        <div className="divide-y divide-line border-y border-line">
          {FAQS.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-6 py-5 text-left text-[16px] font-medium"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : index)}
                >
                  {item.q}
                  <Plus className={cn("size-5 shrink-0 text-muted transition-transform duration-500 ease-[var(--ease-out-expo)]", isOpen && "rotate-45")} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[620px] pb-6 text-[15px] leading-relaxed text-muted">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/* ── Final CTA ───────────────────────────────────────────────────────── */

export function FinalCTA() {
  const { user } = useAuth();
  return (
    <section className="relative overflow-hidden pt-16 text-center sm:pt-24">
      <Container>
        <Reveal>
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full bg-mist px-4 py-2 text-[13px] text-ink-2">
            <span className="font-semibold">5</span> feedback dimensions
            <span className="text-faint">·</span>
            <span className="font-semibold">10</span> roles
            <span className="text-faint">·</span>
            <span className="font-semibold">4</span> formats
          </div>
          <p className="serif-accent text-[21px] text-muted">Your interview, in perfect rhythm.</p>
          <h2 className="mx-auto mt-2 max-w-[760px] font-display text-[44px] font-semibold leading-[1] sm:text-[68px]">
            Nail the Interview,
            <br />
            Before It Happens
          </h2>
          <p className="mx-auto mt-5 max-w-[460px] text-[15px] leading-relaxed text-muted">
            Take control of your preparation. Rehearse, get honest feedback and walk in knowing exactly what to say.
          </p>
          <ButtonLink to="/app/new" variant="outline" caps arrow className="mt-8 h-12 px-6">
            {user ? "Start a mock interview" : "Try it for free"}
          </ButtonLink>
        </Reveal>
      </Container>
      <div className="relative mt-10 flex h-[340px] items-end justify-center">
        <div className="absolute inset-x-0 bottom-0 h-full">
          <div className="absolute bottom-0 left-1/2 h-[300px] w-[900px] max-w-[140%] -translate-x-1/2 rounded-full bg-[#ff8a3d] opacity-70 blur-[90px]" />
          <div className="absolute bottom-0 left-1/2 h-[240px] w-[620px] max-w-[110%] -translate-x-1/2 rounded-full bg-[#e8336f] opacity-75 blur-[80px]" />
          <div className="absolute -bottom-10 left-1/2 h-[200px] w-[420px] -translate-x-1/2 rounded-full bg-[#7c3aed] opacity-60 blur-[70px]" />
        </div>
        <Orb size={220} state="idle" className="relative -mb-16" />
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────── */

const FOOTER_LINKS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Role tracks", href: "/#roles" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Practice",
    links: [
      { label: "Dashboard", href: "/app" },
      { label: "New interview", href: "/app/new" },
      { label: "Question lab", href: "/app/practice" },
      { label: "History", href: "/app/history" },
      { label: "Settings", href: "/app/settings" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-black text-white">
      <Container className="relative pt-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 font-display text-[19px] font-semibold tracking-[-0.04em]">
              <LogoMark /> Poise
            </Link>
            <p className="serif-accent mt-6 text-[19px] text-white/60">Your interview, in perfect rhythm.</p>
            <p className="mt-1 font-display text-[28px] font-semibold leading-tight">
              Practice smarter.
              <br />
              Interview braver.
            </p>
            <p className="mt-4 max-w-[300px] text-[13.5px] leading-relaxed text-white/50">
              An AI-based interview practice & feedback system — mock interviews, question generation and automated
              feedback.
            </p>
          </div>
          {FOOTER_LINKS.map((column) => (
            <div key={column.title}>
              <p className="text-[13px] font-semibold text-white/90">{column.title}</p>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-[13.5px] text-white/55 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-[12.5px] text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Poise · Final year project</p>
          <p className="flex items-center gap-1.5">
            <Code2 className="size-3.5" /> Built with React, Express, MongoDB & Claude
          </p>
        </div>
      </Container>
      <div className="pointer-events-none relative -mb-[6vw] select-none text-center" aria-hidden="true">
        <span
          className="block font-display text-[28vw] font-semibold leading-[0.8] tracking-[-0.06em]"
          style={{ background: "linear-gradient(180deg, rgb(255 255 255 / 0.16), rgb(255 255 255 / 0))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
        >
          Poise
        </span>
      </div>
    </footer>
  );
}
