import { Briefcase, Check, ChevronDown, Clock, Keyboard, ListChecks, Mic, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  INTERVIEW_TYPES,
  INTERVIEW_TYPE_INFO,
  LEVELS,
  LEVEL_INFO,
  LIMITS,
  ROLES,
  getRole,
  isRoleId,
  type AnswerMode,
  type Difficulty,
  type ExperienceLevel,
  type InterviewConfig,
  type InterviewType,
  type RoleId,
} from "@poise/shared";
import { EngineBadge } from "@/components/app/AppShell";
import { Orb } from "@/components/brand/Orb";
import { Button } from "@/components/ui/Button";
import { Field, Input, Range, Segmented, Textarea, Toggle } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { speechRecognitionSupported } from "@/hooks/useSpeechRecognition";
import { ApiError } from "@/lib/api";
import { isStandalone } from "@/lib/env";
import { cn } from "@/lib/cn";
import { useCreateSession, useEngine } from "@/lib/queries";
import { RoleIcon, ROLE_GRADIENTS } from "@/lib/roles";
import { useAuth } from "@/providers/AuthProvider";

const TIME_OPTIONS = [
  { value: "0", label: "Untimed" },
  { value: "60", label: "1 min" },
  { value: "120", label: "2 min" },
  { value: "180", label: "3 min" },
  { value: "300", label: "5 min" },
];

const LOADING_LINES = [
  "Reading the brief…",
  "Choosing questions for your role…",
  "Calibrating the difficulty…",
  "Warming up the interviewer…",
];

function Section({ step, title, description, children }: { step: number; title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="mb-5 flex items-start gap-4">
        <span className="serif-accent mt-0.5 text-[20px] text-faint">0{step}</span>
        <div>
          <h2 className="text-[18px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[14px] text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function OptionCard({
  selected,
  onClick,
  disabled,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border p-4 text-left transition-all duration-300 ease-[var(--ease-out-expo)] disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-ink bg-white shadow-[0_0_0_1px_var(--color-ink),0_12px_30px_-18px_rgb(0_0_0/0.35)]"
          : "border-line bg-cloud hover:border-line-strong hover:bg-white",
        className,
      )}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-ink text-white">
          <Check className="size-3" />
        </span>
      )}
      {children}
    </button>
  );
}

function TagInput({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const tag = draft.trim().replace(/,$/, "");
    if (tag && !value.includes(tag) && value.length < 6) onChange([...value, tag.slice(0, 40)]);
    setDraft("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 focus-within:border-ink/60 focus-within:shadow-[0_0_0_4px_rgb(11_11_15/0.06)]">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-mist py-1 pl-3 pr-1.5 text-[13px]">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`} className="rounded-full p-0.5 hover:bg-line">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id="focus-areas"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={value.length ? "" : "e.g. React hooks, system design, SQL"}
        className="min-w-[160px] flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-faint"
        disabled={value.length >= 6}
      />
    </div>
  );
}

export default function NewInterview() {
  useDocumentTitle("New interview");
  const { user } = useAuth();
  const { data: engine } = useEngine();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const createSession = useCreateSession();
  const voiceSupported = useMemo(() => speechRecognitionSupported(), []);

  const initialRole = params.get("role");
  const initialType = params.get("type");
  const [role, setRole] = useState<RoleId>(
    initialRole && isRoleId(initialRole) ? initialRole : (user?.targetRole ?? "software-engineer"),
  );
  const [type, setType] = useState<InterviewType>(
    INTERVIEW_TYPES.includes(initialType as InterviewType) ? (initialType as InterviewType) : "mixed",
  );
  const [level, setLevel] = useState<ExperienceLevel>(user?.level ?? "entry");
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY[user?.level ?? "entry"]);
  const [difficultyTouched, setDifficultyTouched] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState("180");
  const [answerMode, setAnswerMode] = useState<AnswerMode>(voiceSupported ? "voice" : "text");
  const [followUps, setFollowUps] = useState(true);
  const [tailorOpen, setTailorOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [loadingLine, setLoadingLine] = useState(0);

  const roleInfo = getRole(role)!;
  const systemDesignAllowed = roleInfo.systemDesign;

  useEffect(() => {
    if (type === "system-design" && !systemDesignAllowed) setType("technical");
  }, [type, systemDesignAllowed]);

  useEffect(() => {
    if (!difficultyTouched) setDifficulty(DEFAULT_DIFFICULTY[level]);
  }, [level, difficultyTouched]);

  useEffect(() => {
    if (!createSession.isPending) return;
    setLoadingLine(0);
    const timer = setInterval(() => setLoadingLine((line) => (line + 1) % LOADING_LINES.length), 1800);
    return () => clearInterval(timer);
  }, [createSession.isPending]);

  const seconds = Number(timePerQuestion);
  const maxFollowUps = followUps ? Math.floor(questionCount * LIMITS.maxFollowUpsRatio) : 0;
  const estimatedMinutes = Math.round((questionCount * (seconds ? Math.min(seconds, 180) : 150) + maxFollowUps * 0.5 * 120) / 60);
  const tailored = Boolean(jobDescription.trim() || companyName.trim() || focusAreas.length);

  const start = async () => {
    const config: InterviewConfig = {
      role,
      type,
      level,
      difficulty,
      questionCount,
      answerMode,
      adaptiveFollowUps: followUps,
      timePerQuestionSec: seconds,
      jobDescription: jobDescription.trim() || undefined,
      companyName: companyName.trim() || undefined,
      focusAreas: focusAreas.length ? focusAreas : undefined,
    };
    try {
      const session = await createSession.mutateAsync(config);
      navigate(`/app/interview/${session.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "We couldn't create your interview. Please try again.");
    }
  };

  const summary: [string, ReactNode][] = [
    ["Role", roleInfo.label],
    ["Format", INTERVIEW_TYPE_INFO[type].label],
    ["Level", LEVEL_INFO[level].label],
    ["Difficulty", difficulty.charAt(0).toUpperCase() + difficulty.slice(1)],
    ["Questions", `${questionCount}${maxFollowUps ? ` + up to ${maxFollowUps} follow-ups` : ""}`],
    ["Per question", TIME_OPTIONS.find((t) => t.value === timePerQuestion)?.label],
    ["Answers", answerMode === "voice" ? "Spoken" : "Typed"],
    ["Tailored", tailored ? "Yes — to your brief" : "General"],
  ];

  return (
    <div>
      {params.get("welcome") && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-brand-soft px-5 py-4 text-[14.5px]">
          <Sparkles className="size-4 shrink-0 text-[#c2410c]" />
          <p>
            <span className="font-semibold">Your account is ready.</span> Set up your first mock interview — it takes about ten
            minutes.
          </p>
        </div>
      )}

      <div className="mb-8">
        <p className="serif-accent text-[21px] text-muted">Let's set the stage.</p>
        <h1 className="font-display text-[40px] font-semibold leading-[1.04] sm:text-[48px]">New mock interview</h1>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Section step={1} title="Choose a role" description="Questions are written for this role's interview loop.">
            <div role="radiogroup" aria-label="Role" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {ROLES.map((item) => (
                <OptionCard key={item.id} selected={role === item.id} onClick={() => setRole(item.id)} className="p-3.5">
                  <span className="flex size-10 items-center justify-center rounded-xl text-white" style={{ background: ROLE_GRADIENTS[item.id] }}>
                    <RoleIcon role={item.id} className="size-[18px]" />
                  </span>
                  <span className="mt-3 block pr-4 text-[14px] font-semibold leading-snug">{item.label}</span>
                </OptionCard>
              ))}
            </div>
            <p className="mt-4 text-[13.5px] text-muted">{roleInfo.blurb}</p>
          </Section>

          <Section step={2} title="Pick a format">
            <div role="radiogroup" aria-label="Interview format" className="grid gap-3 sm:grid-cols-2">
              {INTERVIEW_TYPES.map((item) => {
                const disabled = item === "system-design" && !systemDesignAllowed;
                return (
                  <OptionCard key={item} selected={type === item} onClick={() => setType(item)} disabled={disabled}>
                    <span className="block pr-6 text-[15px] font-semibold">{INTERVIEW_TYPE_INFO[item].label}</span>
                    <span className="mt-1 block text-[13.5px] leading-snug text-muted">
                      {item === "technical" ? `${roleInfo.technicalLabel}. ` : ""}
                      {disabled ? "Available for engineering roles." : INTERVIEW_TYPE_INFO[item].blurb}
                    </span>
                  </OptionCard>
                );
              })}
            </div>
          </Section>

          <Section step={3} title="Level & difficulty" description="Difficulty follows your level unless you change it.">
            <div className="flex flex-wrap gap-x-10 gap-y-6">
              <div className="min-w-0 max-w-full">
                <p className="mb-2.5 text-[13px] font-medium text-muted">Experience</p>
                <Segmented
                  ariaLabel="Experience level"
                  value={level}
                  onChange={setLevel}
                  options={LEVELS.map((value) => ({ value, label: LEVEL_INFO[value].label, title: LEVEL_INFO[value].years }))}
                />
              </div>
              <div className="min-w-0 max-w-full">
                <p className="mb-2.5 text-[13px] font-medium text-muted">Difficulty</p>
                <Segmented
                  ariaLabel="Difficulty"
                  value={difficulty}
                  onChange={(value) => {
                    setDifficulty(value);
                    setDifficultyTouched(true);
                  }}
                  options={DIFFICULTIES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
                />
              </div>
            </div>
          </Section>

          <Section step={4} title="Length & pace">
            <div className="grid gap-8 xl:grid-cols-2">
              <div className="min-w-0">
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="text-[13px] font-medium text-muted">Questions</p>
                  <p className="font-display text-[22px] font-semibold tabular-nums">{questionCount}</p>
                </div>
                <Range value={questionCount} min={LIMITS.minQuestions} max={LIMITS.maxQuestions} onChange={setQuestionCount} ariaLabel="Number of questions" />
                <div className="mt-2 flex justify-between text-[12px] text-faint">
                  <span>Quick · {LIMITS.minQuestions}</span>
                  <span>Full loop · {LIMITS.maxQuestions}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-3 text-[13px] font-medium text-muted">Time per question</p>
                <Segmented ariaLabel="Time per question" size="sm" value={timePerQuestion} onChange={setTimePerQuestion} options={TIME_OPTIONS} />
                <p className="mt-2.5 text-[12.5px] text-muted">You can always finish your thought — the timer is a guide, not a guillotine.</p>
              </div>
            </div>
          </Section>

          <Section step={5} title="How you'll answer">
            <div role="radiogroup" aria-label="Answer mode" className="grid gap-3 sm:grid-cols-2">
              <OptionCard selected={answerMode === "voice"} onClick={() => setAnswerMode("voice")} disabled={!voiceSupported}>
                <Mic className="size-5" />
                <span className="mt-3 block text-[15px] font-semibold">Speak</span>
                <span className="mt-1 block text-[13.5px] leading-snug text-muted">
                  {voiceSupported
                    ? "Answer out loud. Poise transcribes live and measures pace and filler words."
                    : isStandalone
                      ? "Spoken answers need microphone access, which this preview doesn't have. Run Poise locally to answer out loud."
                      : "Spoken answers need Chrome, Edge or Safari."}
                </span>
              </OptionCard>
              <OptionCard selected={answerMode === "text"} onClick={() => setAnswerMode("text")}>
                <Keyboard className="size-5" />
                <span className="mt-3 block text-[15px] font-semibold">Type</span>
                <span className="mt-1 block text-[13.5px] leading-snug text-muted">
                  Write your answers. Great for quiet places — you can switch to voice any time.
                </span>
              </OptionCard>
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <Toggle
                checked={followUps}
                onChange={setFollowUps}
                label="Adaptive follow-up questions"
                description="When an answer is vague or misses something, the interviewer probes — just like a real panel."
              />
            </div>
          </Section>

          <Card className="overflow-hidden">
            <button
              type="button"
              onClick={() => setTailorOpen((v) => !v)}
              aria-expanded={tailorOpen}
              className="flex w-full items-center gap-4 p-6 text-left sm:p-7"
            >
              <span className="serif-accent text-[20px] text-faint">06</span>
              <div className="flex-1">
                <h2 className="flex items-center gap-2 text-[18px] font-semibold">
                  Tailor to a job <span className="rounded-full bg-mist px-2 py-0.5 text-[11.5px] font-medium text-muted">Optional</span>
                </h2>
                <p className="mt-0.5 text-[14px] text-muted">Paste a job description and the questions follow its skills.</p>
              </div>
              <ChevronDown className={cn("size-5 text-muted transition-transform duration-300", tailorOpen && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {tailorOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-5 border-t border-line px-6 py-6 sm:px-7">
                    <Field label="Company" htmlFor="company" optional>
                      <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Zoho, Swiggy, Google" maxLength={80} />
                    </Field>
                    <Field
                      label="Job description"
                      htmlFor="jd"
                      optional
                      hint={`${jobDescription.length.toLocaleString()} / ${LIMITS.maxJobDescriptionChars.toLocaleString()} characters`}
                    >
                      <Textarea
                        id="jd"
                        rows={6}
                        value={jobDescription}
                        maxLength={LIMITS.maxJobDescriptionChars}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the responsibilities and requirements from the job posting…"
                      />
                    </Field>
                    <Field label="Focus areas" htmlFor="focus-areas" optional hint="Press Enter to add up to six topics.">
                      <TagInput value={focusAreas} onChange={setFocusAreas} />
                    </Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Summary */}
        <aside className="min-w-0 lg:sticky lg:top-24">
          <Card className="overflow-hidden">
            <div className="relative overflow-hidden bg-night px-6 pb-6 pt-7 text-white">
              <div className="absolute inset-0" style={{ background: "radial-gradient(80% 90% at 90% 0%, rgb(232 51 111 / 0.55), transparent 70%)" }} />
              <div className="relative flex items-center gap-4">
                <Orb size={52} state="idle" glow={false} />
                <div>
                  <p className="serif-accent text-[17px] text-white/70">Your session</p>
                  <p className="font-display text-[22px] font-semibold leading-tight">~{Math.max(estimatedMinutes, 3)} minutes</p>
                </div>
              </div>
            </div>
            <dl className="divide-y divide-line px-6">
              {summary.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-3 text-[14px]">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-3 p-6 pt-3">
              <Button variant="gradient" size="lg" block arrow onClick={start} loading={createSession.isPending}>
                Start interview
              </Button>
              <div className="flex items-center justify-center gap-2 text-[12.5px] text-muted">
                Questions by <EngineBadge />
              </div>
            </div>
          </Card>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px] text-muted">
            <div className="rounded-2xl bg-mist px-2 py-3">
              <Briefcase className="mx-auto mb-1 size-4 text-ink" /> Real loops
            </div>
            <div className="rounded-2xl bg-mist px-2 py-3">
              <ListChecks className="mx-auto mb-1 size-4 text-ink" /> 5 dimensions
            </div>
            <div className="rounded-2xl bg-mist px-2 py-3">
              <Clock className="mx-auto mb-1 size-4 text-ink" /> Pause anytime
            </div>
          </div>
        </aside>
      </div>

      {/* Generating overlay */}
      <AnimatePresence>
        {createSession.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night/95 text-white backdrop-blur"
            role="status"
            aria-live="polite"
          >
            <Orb size={180} state="thinking" />
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingLine}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="serif-accent mt-12 text-[26px] text-white/85"
              >
                {LOADING_LINES[loadingLine]}
              </motion.p>
            </AnimatePresence>
            <p className="mt-2 text-[14px] text-white/50">
              {engine?.provider === "claude" ? `${engine.label} is writing your questions` : "Preparing your questions"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
