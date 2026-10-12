import { ArrowRight, Bookmark, BookmarkCheck, Check, ChevronDown, Lightbulb, ListChecks, Mic, MicOff, Sparkles, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  LEVELS,
  LEVEL_INFO,
  ROLES,
  getRole,
  type AnswerMetrics,
  type Difficulty,
  type ExperienceLevel,
  type GeneratedQuestion,
  type InterviewType,
  type QuestionEvaluation,
  type RoleId,
} from "@poise/shared";
import { EngineBadge } from "@/components/app/AppShell";
import { Orb } from "@/components/brand/Orb";
import { AnnotatedAnswer } from "@/components/report/QuestionReview";
import { Button } from "@/components/ui/Button";
import { Field, Segmented, Select, Textarea } from "@/components/ui/form";
import { Meter } from "@/components/ui/Meter";
import { Card, Chip, EmptyState, Skeleton } from "@/components/ui/primitives";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useElapsed } from "@/hooks/useMedia";
import { appendDictation, useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { keys, useSavedQuestions } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";

interface PracticeContext {
  role: RoleId;
  type: InterviewType;
  level: ExperienceLevel;
  difficulty: Difficulty;
}

function Feedback({ evaluation, metrics }: { evaluation: QuestionEvaluation; metrics: AnswerMetrics }) {
  const scores = evaluation.scores!;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 rounded-2xl border border-line bg-cloud p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ScoreRing score={evaluation.overall ?? 0} size={104} stroke={8} />
        <div className="flex-1">
          {evaluation.summary && <p className="serif-accent text-[21px] leading-snug">“{evaluation.summary}”</p>}
          <p className="mt-2 text-[13px] text-muted">
            {metrics.wordCount} words · {metrics.fillerCount} filler words · {metrics.hedgeCount} hedges
            {metrics.wpm ? ` · ${metrics.wpm} wpm` : ""}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        {(Object.keys(scores) as (keyof typeof scores)[]).map((key) => (
          <Meter key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={scores[key]} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {evaluation.strengths.length > 0 && (
          <ul className="space-y-2">
            {evaluation.strengths.map((item) => (
              <li key={item} className="flex gap-2 text-[14px] leading-relaxed">
                <Check className="mt-1 size-4 shrink-0 text-[var(--color-good)]" /> {item}
              </li>
            ))}
          </ul>
        )}
        <ul className="space-y-2">
          {evaluation.improvements.map((item) => (
            <li key={item} className="flex gap-2 text-[14px] leading-relaxed">
              <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--color-data)]" /> {item}
            </li>
          ))}
        </ul>
      </div>
      {evaluation.sampleAnswer && (
        <div className="rounded-2xl bg-night p-5 text-white">
          <p className="mb-2 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-white/65">
            <Sparkles className="size-4" /> A stronger answer
          </p>
          <p className="text-[14.5px] leading-[1.7] text-white/85">{evaluation.sampleAnswer}</p>
        </div>
      )}
    </motion.div>
  );
}

function PracticePanel({ question, context }: { question: GeneratedQuestion; context: PracticeContext }) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ evaluation: QuestionEvaluation; metrics: AnswerMetrics; text: string } | null>(null);
  const speech = useSpeechRecognition();
  const elapsed = useElapsed(!result, question.text);
  const [usedVoice, setUsedVoice] = useState(false);

  const submit = async () => {
    speech.stop();
    setLoading(true);
    try {
      const response = await api.practiceEvaluate({
        ...context,
        question,
        answer,
        durationSec: Math.round(elapsed),
        mode: usedVoice ? "voice" : "text",
      });
      setResult({ ...response, text: answer });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't evaluate your answer.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-line p-4">
          <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">Your answer</p>
          <AnnotatedAnswer text={result.text} />
        </div>
        <Feedback evaluation={result.evaluation} metrics={result.metrics} />
        <Button
          variant="soft"
          size="sm"
          onClick={() => {
            setResult(null);
            setAnswer("");
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        rows={5}
        value={speech.listening && speech.interim ? appendDictation(answer, speech.interim) : answer}
        onChange={(event) => setAnswer(event.target.value)}
        readOnly={speech.listening}
        placeholder="Answer as you would in the interview…"
        aria-label="Your practice answer"
      />
      {speech.error && <p className="text-[13px] text-[#b4532a]">{speech.error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {speech.supported ? (
          <Button
            variant={speech.listening ? "solid" : "soft"}
            size="sm"
            onClick={() => {
              if (speech.listening) speech.stop();
              else {
                setUsedVoice(true);
                speech.start((phrase) => setAnswer((current) => appendDictation(current, phrase)));
              }
            }}
          >
            {speech.listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {speech.listening ? "Stop" : "Speak"}
          </Button>
        ) : (
          <span />
        )}
        <Button size="sm" arrow onClick={submit} disabled={!answer.trim()} loading={loading}>
          Get feedback
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  context,
  saved,
  onToggleSave,
  defaultOpen = false,
}: {
  question: GeneratedQuestion;
  context: PracticeContext;
  saved: boolean;
  onToggleSave: () => void;
  defaultOpen?: boolean;
}) {
  const [panel, setPanel] = useState<"practice" | "points" | "hint" | null>(defaultOpen ? "practice" : null);
  const toggle = (next: typeof panel) => setPanel((current) => (current === next ? null : next));

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Chip>{question.category}</Chip>
            <Chip tone="outline" className="capitalize">
              {question.difficulty}
            </Chip>
            <Chip tone="outline">{getRole(context.role)?.short}</Chip>
          </div>
          <p className="font-display text-[19px] font-medium leading-snug tracking-[-0.02em]">{question.text}</p>
        </div>
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save question"}
          className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors", saved ? "bg-ink text-white" : "text-muted hover:bg-mist")}
        >
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant={panel === "practice" ? "solid" : "soft"} size="sm" onClick={() => toggle("practice")}>
          <Wand2 className="size-4" /> Practise
        </Button>
        {question.hint && (
          <Button variant={panel === "hint" ? "solid" : "ghost"} size="sm" onClick={() => toggle("hint")}>
            <Lightbulb className="size-4" /> Hint
          </Button>
        )}
        {question.keyPoints.length > 0 && (
          <Button variant={panel === "points" ? "solid" : "ghost"} size="sm" onClick={() => toggle("points")}>
            <ListChecks className="size-4" /> Key points
          </Button>
        )}
      </div>
      <AnimatePresence initial={false} mode="wait">
        {panel && (
          <motion.div
            key={panel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {panel === "practice" && <PracticePanel question={question} context={context} />}
              {panel === "hint" && <p className="rounded-2xl bg-[#fff6e0] px-4 py-3 text-[14px] leading-relaxed text-[#7a4b00]">{question.hint}</p>}
              {panel === "points" && (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {question.keyPoints.map((point) => (
                    <li key={point} className="flex gap-2 rounded-xl bg-cloud px-3 py-2.5 text-[14px] leading-snug">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-good)]" /> {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function PracticeLab() {
  useDocumentTitle("Question lab");
  const { user } = useAuth();
  const location = useLocation();
  const client = useQueryClient();
  const incoming = (location.state as { practice?: { question: GeneratedQuestion; role: RoleId; type: InterviewType } } | null)?.practice;

  const [tab, setTab] = useState<"generate" | "saved">("generate");
  const [role, setRole] = useState<RoleId>(incoming?.role ?? user?.targetRole ?? "software-engineer");
  const [type, setType] = useState<InterviewType>(incoming?.type === "mixed" ? "technical" : (incoming?.type ?? "technical"));
  const [level, setLevel] = useState<ExperienceLevel>(user?.level ?? "entry");
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY[user?.level ?? "entry"]);
  const [count, setCount] = useState("5");
  const [jdOpen, setJdOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(incoming ? [incoming.question] : []);
  const [loading, setLoading] = useState(false);
  const saved = useSavedQuestions();

  const roleInfo = getRole(role)!;
  useEffect(() => {
    if (type === "system-design" && !roleInfo.systemDesign) setType("technical");
  }, [type, roleInfo.systemDesign]);

  const context: PracticeContext = { role, type, level, difficulty };
  const savedByText = useMemo(() => new Map((saved.data ?? []).map((q) => [q.text, q.id])), [saved.data]);

  const generate = async () => {
    setLoading(true);
    try {
      const result = await api.practiceQuestions({
        role,
        type,
        level,
        difficulty,
        count: Number(count),
        jobDescription: jobDescription.trim() || undefined,
      });
      setQuestions(result.questions);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't generate questions.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async (question: GeneratedQuestion, ctx: { role: RoleId; type: InterviewType }) => {
    const id = savedByText.get(question.text);
    try {
      if (id) {
        await api.unsaveQuestion(id);
        toast("Removed from saved questions.");
      } else {
        await api.saveQuestion({ ...question, role: ctx.role, type: ctx.type });
        toast.success("Saved to your question bank.");
      }
      await client.invalidateQueries({ queryKey: keys.saved });
    } catch {
      toast.error("Couldn't update saved questions.");
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="serif-accent text-[21px] text-muted">Generate. Practise. Repeat.</p>
          <h1 className="font-display text-[40px] font-semibold leading-[1.04] sm:text-[48px]">Question lab</h1>
          <p className="mt-2 max-w-[520px] text-[15px] text-muted">
            Drill single questions with instant feedback — no full interview needed. Save the ones you want to master.
          </p>
        </div>
        <Segmented
          ariaLabel="View"
          value={tab}
          onChange={setTab}
          options={[
            { value: "generate", label: "Generate" },
            { value: "saved", label: `Saved${saved.data?.length ? ` · ${saved.data.length}` : ""}` },
          ]}
        />
      </div>

      {tab === "generate" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="min-w-0 space-y-5 p-6 lg:sticky lg:top-24">
            <Field label="Role" htmlFor="lab-role">
              <Select id="lab-role" value={role} onChange={(e) => setRole(e.target.value as RoleId)}>
                {ROLES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-2">Format</p>
              <Segmented<InterviewType>
                ariaLabel="Format"
                size="sm"
                value={type}
                onChange={setType}
                options={[
                  { value: "technical", label: "Technical" },
                  { value: "behavioral", label: "Behavioral" },
                  { value: "system-design", label: "Design", disabled: !roleInfo.systemDesign },
                ]}
              />
            </div>
            <Field label="Level" htmlFor="lab-level">
              <Select
                id="lab-level"
                value={level}
                onChange={(e) => {
                  const next = e.target.value as ExperienceLevel;
                  setLevel(next);
                  setDifficulty(DEFAULT_DIFFICULTY[next]);
                }}
              >
                {LEVELS.map((value) => (
                  <option key={value} value={value}>
                    {LEVEL_INFO[value].label}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-2">Difficulty</p>
              <Segmented
                ariaLabel="Difficulty"
                size="sm"
                value={difficulty}
                onChange={setDifficulty}
                options={DIFFICULTIES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-2">How many</p>
              <Segmented ariaLabel="Number of questions" size="sm" value={count} onChange={setCount} options={["3", "5", "8"].map((value) => ({ value, label: value }))} />
            </div>
            <div>
              <button type="button" onClick={() => setJdOpen((v) => !v)} className="flex w-full items-center justify-between text-sm font-medium text-ink-2" aria-expanded={jdOpen}>
                Tailor to a job description
                <ChevronDown className={cn("size-4 text-muted transition-transform", jdOpen && "rotate-180")} />
              </button>
              {jdOpen && (
                <Textarea
                  className="mt-2"
                  rows={5}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste a job description…"
                  aria-label="Job description"
                />
              )}
            </div>
            <Button block arrow onClick={generate} loading={loading}>
              Generate questions
            </Button>
            <div className="flex justify-center">
              <EngineBadge />
            </div>
          </Card>

          <div className="min-w-0 space-y-4">
            {loading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)
            ) : questions.length === 0 ? (
              <Card className="flex flex-col items-center px-6 py-16 text-center">
                <Orb size={120} state="idle" />
                <h2 className="mt-10 font-display text-[24px] font-semibold">Your practice questions appear here</h2>
                <p className="mt-2 max-w-sm text-[15px] text-muted">
                  Choose a role and format, then generate a fresh set. Each one comes with a hint, key points and a model answer.
                </p>
              </Card>
            ) : (
              questions.map((question, index) => (
                <QuestionCard
                  key={question.text}
                  question={question}
                  context={context}
                  saved={savedByText.has(question.text)}
                  onToggleSave={() => void toggleSave(question, { role, type })}
                  defaultOpen={Boolean(incoming) && index === 0}
                />
              ))
            )}
          </div>
        </div>
      ) : saved.isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !saved.data?.length ? (
        <Card>
          <EmptyState
            icon={<Bookmark className="size-6" />}
            title="No saved questions yet"
            body="Bookmark questions from the generator to build your personal practice set."
            action={
              <Button variant="soft" onClick={() => setTab("generate")}>
                Generate questions
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {saved.data.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              context={{ role: question.role, type: question.type, level, difficulty: question.difficulty }}
              saved
              onToggleSave={() => void toggleSave(question, { role: question.role, type: question.type })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
