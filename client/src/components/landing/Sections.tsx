import { FileText, MessageSquareQuote, Mic, Sparkles } from "lucide-react";
import { ROLES } from "@poise/shared";
import { Orb } from "@/components/brand/Orb";
import { Reveal } from "@/components/brand/Reveal";
import { Waveform } from "@/components/brand/Waveform";
import { ButtonLink } from "@/components/ui/Button";
import { RoleIcon } from "@/lib/roles";
import { useAuth } from "@/providers/AuthProvider";

export const Container = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <div className={`mx-auto max-w-[1200px] px-5 sm:px-8 ${className}`}>{children}</div>
);

/* ── "Designed to help you…" ─────────────────────────────────────────── */

const PILLARS = [
  {
    icon: Sparkles,
    title: "Smart Question Generation",
    body: "Questions for ten role tracks and four interview formats — tailored to the job description you paste in.",
  },
  {
    icon: Mic,
    title: "Realistic Mock Interviews",
    body: "Answer out loud with a live transcript, a timer and an interviewer who asks follow-ups when you're vague.",
  },
  {
    icon: MessageSquareQuote,
    title: "Automated, Specific Feedback",
    body: "Scores across five dimensions, the evidence behind them and a stronger sample answer in your own voice.",
  },
];

export function Intro() {
  return (
    <section id="features" className="relative scroll-mt-24 pt-10 sm:pt-16">
      <Container>
        <div className="grid items-end gap-10 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <h2 className="font-display text-[44px] font-semibold leading-[0.98] sm:text-[64px] lg:text-[72px]">
              Designed to Help
              <br />
              You Answer <span className="serif-accent font-normal">With</span>
              <br />
              <span className="serif-accent font-normal">Quiet Confidence</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-[380px] text-[19px] leading-[1.45] text-ink-2 sm:text-[21px] lg:mb-3">
              Poise is built for students and early-career professionals who want honest practice — not generic tips
              they've read a hundred times.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {PILLARS.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 0.08}>
              <pillar.icon className="mb-4 size-5 text-ink" strokeWidth={1.75} />
              <h3 className="text-[16px] font-semibold">{pillar.title}</h3>
              <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-muted">{pillar.body}</p>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* soft aurora fade into the next section */}
      <div className="pointer-events-none relative mt-10 h-40 overflow-hidden" aria-hidden="true">
        <div className="absolute -bottom-24 left-[5%] h-56 w-[45%] rounded-full bg-[#d8b4fe] opacity-60 blur-[70px]" />
        <div className="absolute -bottom-24 left-[35%] h-56 w-[40%] rounded-full bg-[#fbcfe8] opacity-70 blur-[70px]" />
        <div className="absolute -bottom-24 right-[3%] h-56 w-[40%] rounded-full bg-[#fde68a] opacity-70 blur-[70px]" />
      </div>
    </section>
  );
}

/* ── Gradient panel ──────────────────────────────────────────────────── */

export function GradientPanel() {
  const { user } = useAuth();
  return (
    <section className="relative">
      <div className="noise relative overflow-hidden bg-brand-gradient">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(60% 90% at 18% 30%, rgb(76 29 149 / 0.85), transparent 70%), radial-gradient(50% 70% at 90% 80%, rgb(255 200 61 / 0.75), transparent 70%)",
          }}
        />
        <Container className="relative grid min-h-[560px] items-end gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1fr]">
          <div className="relative order-2 lg:order-1">
            <Reveal>
              <p className="serif-accent text-[22px] text-white/85">No pressure. Just practice.</p>
              <h2 className="mt-2 font-display text-[44px] font-semibold leading-[1] text-white sm:text-[60px]">
                Ready for Your
                <br />
                Next Interview?
              </h2>
            </Reveal>
          </div>
          <div className="relative order-1 flex flex-col items-center gap-10 lg:order-2 lg:items-end">
            <Orb size={260} state="speaking" className="lg:mr-16" />
            <Reveal className="max-w-[320px] lg:text-right">
              <p className="text-[15px] leading-relaxed text-white/85">
                Ten minutes, one role, a handful of questions. Start your first mock interview and see exactly where
                you stand.
              </p>
              <ButtonLink to={user ? "/app/new" : "/signup"} variant="light" caps arrow className="mt-5">
                Start practicing
              </ButtonLink>
            </Reveal>
          </div>
        </Container>
      </div>
      <div className="pointer-events-none h-24 bg-gradient-to-b from-[#fde4f0] to-white" aria-hidden="true" />
    </section>
  );
}

/* ── Role tracks (the "trusted by" grid) ─────────────────────────────── */

export function Tracks() {
  return (
    <section id="roles" className="scroll-mt-24 py-10 sm:py-14">
      <Container>
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <p className="text-[15px] font-semibold">Practice for</p>
          <p className="text-[14px] text-muted">
            {ROLES.length} role tracks · 115 curated questions · unlimited AI-generated ones
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ROLES.map((role, index) => (
            <Reveal key={role.id} delay={(index % 5) * 0.05} y={14}>
              <div className="group flex h-[72px] items-center justify-center gap-2.5 rounded-2xl bg-mist px-4 text-[14.5px] font-semibold text-ink-2 transition-colors duration-300 hover:bg-[#efeff3]">
                <RoleIcon role={role.id} className="size-[18px] text-ink transition-transform duration-500 group-hover:scale-110" />
                {role.short}
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ── How it works ────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Configure",
    body: "Pick a role, level and format. Paste a job description and Poise tailors the questions to it.",
    visual: (
      <div className="flex flex-wrap gap-2">
        {["Frontend Engineer", "Entry level", "Mixed round", "6 questions", "Voice answers"].map((chip, i) => (
          <span
            key={chip}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${i === 0 ? "bg-ink text-white" : "bg-white text-ink-2 shadow-sm"}`}
          >
            {chip}
          </span>
        ))}
        <span className="flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-[12px] text-muted">
          <FileText className="size-3.5" /> job-description.txt
        </span>
      </div>
    ),
  },
  {
    n: "02",
    title: "Rehearse",
    body: "Answer out loud or type. Poise reads each question, listens, and probes with follow-ups — like a real panel.",
    visual: (
      <div className="flex items-center gap-4 rounded-2xl bg-night p-4 text-white">
        <Orb size={46} state="listening" level={0.3} glow={false} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium">How would you cache a slow endpoint?</p>
          <Waveform bars={22} className="mt-1.5 h-6 text-white/60" />
        </div>
      </div>
    ),
  },
  {
    n: "03",
    title: "Improve",
    body: "Get scores with the evidence behind them, a stronger sample answer and a focused practice plan.",
    visual: (
      <div className="space-y-2.5 rounded-2xl bg-white p-4 shadow-sm">
        {[
          ["Relevance", 88],
          ["Structure", 64],
          ["Confidence", 76],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 text-[12px]">
            <span className="w-20 text-muted">{label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-data-track)]">
              <span className="block h-full rounded-full bg-[var(--color-data)]" style={{ width: `${value}%` }} />
            </span>
            <span className="w-6 text-right font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-28">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <Reveal>
            <p className="serif-accent text-[21px] text-muted">Make every rep count</p>
            <h2 className="mt-2 font-display text-[40px] font-semibold leading-[1.02] sm:text-[56px]">
              Configure. Rehearse.
              <br />
              Improve. Repeat.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-[400px] text-[15px] leading-relaxed text-muted lg:ml-auto">
              A complete loop in under fifteen minutes. Every session builds on the last, so you can watch your weakest
              dimension become your strongest.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.n} delay={index * 0.1}>
              <div className="flex h-full flex-col rounded-[26px] bg-mist p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="serif-accent text-[26px] text-muted">{step.n}</span>
                </div>
                <h3 className="mt-6 font-display text-[24px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{step.body}</p>
                <div className="mt-8">{step.visual}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
