import { ArrowRight, Check, ChevronDown, Copy, CornerDownRight, Minus, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  DIMENSIONS,
  DIMENSION_INFO,
  annotateAnswer,
  type InterviewConfig,
  type InterviewQuestion,
} from "@poise/shared";
import { Chip } from "@/components/ui/primitives";
import { ScorePill } from "@/components/ui/ScoreRing";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";

export function AnnotatedAnswer({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("whitespace-pre-wrap text-[15px] leading-[1.75] text-ink-2", className)}>
      {annotateAnswer(text).map((segment, index) =>
        segment.kind ? (
          <mark key={index} className={cn("text-inherit", segment.kind === "filler" ? "mark-filler" : "mark-hedge")} title={segment.kind === "filler" ? "Filler word" : "Hedging phrase"}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

function MiniBars({ scores }: { scores: NonNullable<NonNullable<InterviewQuestion["evaluation"]>["scores"]> }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
      {DIMENSIONS.map((key) => (
        <div key={key}>
          <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
            <span className="text-muted">{DIMENSION_INFO[key].label}</span>
            <span className="font-semibold tabular-nums">{scores[key]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-data-track)]">
            <div className="h-full rounded-full bg-[var(--color-data)]" style={{ width: `${Math.max(2, scores[key])}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuestionReview({
  question,
  index,
  open,
  onToggle,
  config,
}: {
  question: InterviewQuestion;
  index: number;
  open: boolean;
  onToggle: () => void;
  config: InterviewConfig;
}) {
  const evaluation = question.evaluation;
  const answer = question.answer;
  const skipped = answer?.skipped ?? false;
  const unanswered = !answer;
  const missed = new Set(evaluation?.missedPoints ?? []);
  const keyPoints = question.keyPoints ?? [];
  const keyPointsMatch = keyPoints.length > 0 && [...missed].every((point) => keyPoints.includes(point));
  const extraMissed = keyPointsMatch ? [] : [...missed];

  const copySample = async () => {
    if (!evaluation?.sampleAnswer) return;
    try {
      await navigator.clipboard.writeText(evaluation.sampleAnswer);
      toast.success("Sample answer copied.");
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  return (
    <div className={cn("print-break rounded-[22px] border transition-colors", open ? "border-line-strong bg-white" : "border-line bg-white hover:border-line-strong")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-4 p-5 text-left sm:p-6">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold",
            question.kind === "follow-up" ? "bg-[#fde7ef] text-[#a8174a]" : "bg-mist text-ink",
          )}
          aria-hidden="true"
        >
          {question.kind === "follow-up" ? <CornerDownRight className="size-4" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-faint">
              {question.kind === "follow-up" ? "Follow-up" : `Question ${index}`} · {question.category}
            </span>
          </div>
          <p className={cn("text-[16px] font-medium leading-snug", !open && "line-clamp-2")}>{question.text}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {unanswered ? (
            <Chip tone="outline">Not reached</Chip>
          ) : skipped ? (
            <Chip tone="outline">Skipped</Chip>
          ) : evaluation?.status === "done" ? (
            <ScorePill score={evaluation.overall ?? 0} />
          ) : evaluation?.status === "failed" ? (
            <Chip tone="outline">Not scored</Chip>
          ) : (
            <Chip>Analysing…</Chip>
          )}
          <ChevronDown className={cn("size-5 text-muted transition-transform duration-300", open && "rotate-180")} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-6 border-t border-line px-5 pb-6 pt-5 sm:px-6">
              {unanswered ? (
                <p className="text-[14.5px] text-muted">The interview ended before this question, so it doesn't affect your score.</p>
              ) : (
                <>
                  <div>
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">Your answer</h4>
                      {!skipped && question.metrics && (
                        <div className="flex flex-wrap gap-1.5 text-[12px]">
                          <Chip tone="outline">{question.metrics.wordCount} words</Chip>
                          <Chip tone="outline">{formatDuration(question.metrics.durationSec)}</Chip>
                          {question.metrics.wpm !== null && <Chip tone="outline">{question.metrics.wpm} wpm</Chip>}
                          <Chip tone="outline">
                            <span className="size-2 rounded-full bg-[var(--color-serious)]" /> {question.metrics.fillerCount} fillers
                          </Chip>
                          <Chip tone="outline">
                            <span className="size-2 rounded-full bg-[var(--color-ocean)]" /> {question.metrics.hedgeCount} hedges
                          </Chip>
                        </div>
                      )}
                    </div>
                    {skipped ? (
                      <p className="text-[15px] italic text-muted">You skipped this question.</p>
                    ) : (
                      <div className="rounded-2xl bg-cloud p-4">
                        <AnnotatedAnswer text={answer!.text} />
                      </div>
                    )}
                  </div>

                  {evaluation?.status === "done" && (
                    <>
                      {evaluation.summary && <p className="serif-accent text-[22px] leading-snug text-ink">“{evaluation.summary}”</p>}
                      {evaluation.scores && !skipped && <MiniBars scores={evaluation.scores} />}

                      <div className="grid gap-4 md:grid-cols-2">
                        {evaluation.strengths.length > 0 && (
                          <div className="rounded-2xl border border-line p-4">
                            <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">What worked</h4>
                            <ul className="space-y-2.5">
                              {evaluation.strengths.map((item) => (
                                <li key={item} className="flex gap-2.5 text-[14.5px] leading-relaxed">
                                  <Check className="mt-1 size-4 shrink-0 text-[var(--color-good)]" aria-hidden="true" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {evaluation.improvements.length > 0 && (
                          <div className={cn("rounded-2xl border border-line p-4", evaluation.strengths.length === 0 && "md:col-span-2")}>
                            <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">What to improve</h4>
                            <ul className="space-y-2.5">
                              {evaluation.improvements.map((item) => (
                                <li key={item} className="flex gap-2.5 text-[14.5px] leading-relaxed">
                                  <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--color-data)]" aria-hidden="true" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {(keyPoints.length > 0 || extraMissed.length > 0) && (
                        <div>
                          <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">Key points</h4>
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {keyPoints.map((point) => {
                              const covered = keyPointsMatch ? !missed.has(point) : null;
                              return (
                                <li key={point} className="flex gap-2.5 rounded-xl bg-cloud px-3 py-2.5 text-[14px] leading-snug">
                                  {covered === null ? (
                                    <Minus className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
                                  ) : covered ? (
                                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-good)]" aria-label="Covered" />
                                  ) : (
                                    <X className="mt-0.5 size-4 shrink-0 text-[var(--color-critical)]" aria-label="Missed" />
                                  )}
                                  <span className={cn(covered === false && "text-muted")}>{point}</span>
                                </li>
                              );
                            })}
                            {extraMissed.map((point) => (
                              <li key={point} className="flex gap-2.5 rounded-xl bg-cloud px-3 py-2.5 text-[14px] leading-snug text-muted">
                                <X className="mt-0.5 size-4 shrink-0 text-[var(--color-critical)]" aria-label="Missed" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evaluation.sampleAnswer && (
                        <div className="relative overflow-hidden rounded-2xl bg-night p-5 text-white">
                          <div className="absolute -right-16 -top-20 size-56 rounded-full opacity-40 blur-[60px]" style={{ background: "radial-gradient(closest-side,#e8336f,transparent)" }} />
                          <div className="relative">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/70">
                                <Sparkles className="size-4" /> A stronger answer
                              </h4>
                              <button type="button" onClick={copySample} className="no-print inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-white/60 hover:bg-white/10 hover:text-white">
                                <Copy className="size-3.5" /> Copy
                              </button>
                            </div>
                            <p className="text-[15px] leading-[1.75] text-white/85">{evaluation.sampleAnswer}</p>
                          </div>
                        </div>
                      )}

                      <Link
                        to="/app/practice"
                        state={{
                          practice: {
                            question: {
                              text: question.text,
                              category: question.category,
                              difficulty: question.difficulty,
                              hint: question.hint ?? "",
                              keyPoints,
                              sampleAnswer: evaluation.sampleAnswer,
                            },
                            role: config.role,
                            type: config.type,
                          },
                        }}
                        className="no-print inline-flex items-center gap-1.5 text-[14px] font-medium hover:underline"
                      >
                        Practise this question again <ArrowRight className="size-4" />
                      </Link>
                    </>
                  )}
                  {evaluation?.status === "failed" && (
                    <p className="text-[14.5px] text-muted">{evaluation.error ?? "This answer couldn't be scored."}</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
