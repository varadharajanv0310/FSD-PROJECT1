import { ArrowLeft, ArrowRight, Calendar, Check, Clock, Cpu, Download, MessageSquare, RotateCcw, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { DIMENSIONS, DIMENSION_INFO, INTERVIEW_TYPE_INFO, LEVEL_INFO, getRole, type InterviewSession } from "@poise/shared";
import { Orb } from "@/components/brand/Orb";
import { Reveal } from "@/components/brand/Reveal";
import { QuestionReview } from "@/components/report/QuestionReview";
import { Button } from "@/components/ui/Button";
import { Meter } from "@/components/ui/Meter";
import { Card, Chip, SectionHeading, Skeleton } from "@/components/ui/primitives";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ApiError } from "@/lib/api";
import { isStandalone } from "@/lib/env";
import { formatDate, formatMinutes, pluralize } from "@/lib/format";
import { useCreateSession, useSession } from "@/lib/queries";

function Analysing({ session }: { session: InterviewSession }) {
  const responded = session.questions.filter((q) => q.answer);
  const done = responded.filter((q) => q.evaluation?.status !== "pending").length;
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center py-12 text-center">
      <Orb size={160} state="thinking" />
      <p className="serif-accent mt-10 text-[22px] text-muted">Reviewing your answers…</p>
      <h1 className="mt-1 font-display text-[36px] font-semibold leading-tight">Building your debrief</h1>
      <p className="mt-3 text-[15px] text-muted">
        {done} of {pluralize(responded.length, "answer")} analysed. This usually takes a few seconds.
      </p>
      <div className="mt-8 h-1.5 w-full max-w-[320px] overflow-hidden rounded-full bg-[var(--color-data-track)]">
        <motion.div
          className="h-full rounded-full bg-[var(--color-data)]"
          animate={{ width: `${Math.max(8, (done / Math.max(1, responded.length)) * 100)}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <ul className="mt-10 w-full space-y-2 text-left">
        {responded.map((question) => (
          <li key={question.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-[14px]">
            {question.evaluation?.status === "pending" ? (
              <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-label="Analysing" />
            ) : (
              <Check className="size-4 text-[var(--color-good)]" aria-label="Done" />
            )}
            <span className="truncate">{question.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListCard({ title, items, tone }: { title: string; items: string[]; tone: "good" | "next" }) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">{title}</h3>
      <ul className="space-y-3.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
            {tone === "good" ? (
              <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e7f6e7]">
                <Check className="size-3 text-[var(--color-good)]" />
              </span>
            ) : (
              <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-data-track)]">
                <ArrowRight className="size-3 text-[var(--color-data)]" />
              </span>
            )}
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Report() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: session, isLoading, error } = useSession(id);
  const createSession = useCreateSession();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  useDocumentTitle(session ? `Debrief · ${session.title}` : "Debrief");

  useEffect(() => {
    // Open the weakest answered question by default — that's where the learning is.
    if (!session?.report || openIds.size) return;
    const weakest = [...session.questions]
      .filter((q) => q.evaluation?.status === "done" && !q.answer?.skipped)
      .sort((a, b) => (a.evaluation!.overall ?? 0) - (b.evaluation!.overall ?? 0))[0];
    if (weakest) setOpenIds(new Set([weakest.id]));
  }, [session?.report, session?.questions, openIds.size]);

  const habits = useMemo(() => {
    const answers = session?.questions.filter((q) => q.answer && !q.answer.skipped && q.metrics) ?? [];
    const words = answers.reduce((sum, q) => sum + q.metrics!.wordCount, 0);
    const fillers = answers.reduce((sum, q) => sum + q.metrics!.fillerCount, 0);
    const hedges = answers.reduce((sum, q) => sum + q.metrics!.hedgeCount, 0);
    const wpms = answers.map((q) => q.metrics!.wpm).filter((w): w is number => w !== null);
    return {
      fillers: words ? Math.round((fillers / words) * 1000) / 10 : null,
      hedges: words ? Math.round((hedges / words) * 1000) / 10 : null,
      wpm: wpms.length ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : null,
      length: answers.length ? Math.round(words / answers.length) : null,
    };
  }, [session?.questions]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  if (error || !session) {
    return <p className="py-20 text-center text-muted">{error instanceof ApiError ? error.message : "We couldn't load this debrief."}</p>;
  }
  if (session.status === "in_progress") {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">This interview is still in progress.</p>
        <Button className="mt-4" arrow onClick={() => navigate(`/app/interview/${session.id}`)}>
          Resume interview
        </Button>
      </div>
    );
  }
  if (session.status === "evaluating" || !session.report) return <Analysing session={session} />;

  const report = session.report;
  const role = getRole(session.config.role);
  let coreIndex = 0;

  const practiceAgain = async () => {
    try {
      const next = await createSession.mutateAsync(session.config);
      navigate(`/app/interview/${next.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start a new interview.");
    }
  };

  const downloadPdf = () => {
    flushSync(() => setOpenIds(new Set(session.questions.map((q) => q.id))));
    setTimeout(() => window.print(), 450);
  };

  const toggle = (questionId: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/app" className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <div className="flex gap-2">
          {!isStandalone && (
            <Button variant="soft" size="sm" onClick={downloadPdf}>
              <Download className="size-4" /> Save as PDF
            </Button>
          )}
          <Button size="sm" onClick={practiceAgain} loading={createSession.isPending}>
            <RotateCcw className="size-4" /> Practise again
          </Button>
        </div>
      </div>

      {/* Hero */}
      <Card className="relative overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full opacity-60 blur-[90px]" style={{ background: "radial-gradient(closest-side, #ffd0e2, transparent)" }} />
        <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <div>
            <p className="serif-accent text-[21px] text-muted">Interview debrief</p>
            <h1 className="mt-1 font-display text-[34px] font-semibold leading-[1.05] sm:text-[44px]">{report.headline}</h1>
            <p className="mt-4 max-w-[640px] text-[15.5px] leading-relaxed text-ink-2">{report.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Chip tone="outline">{role?.label}</Chip>
              <Chip tone="outline">{INTERVIEW_TYPE_INFO[session.config.type].label}</Chip>
              <Chip tone="outline">{LEVEL_INFO[session.config.level].label}</Chip>
              <Chip tone="outline">
                <Calendar className="size-3.5" /> {formatDate(session.completedAt ?? session.startedAt, { day: "numeric", month: "short", year: "numeric" })}
              </Chip>
              <Chip tone="outline">
                <Clock className="size-3.5" /> {formatMinutes(session.totalDurationSec)}
              </Chip>
              <Chip tone="outline">
                <MessageSquare className="size-3.5" /> {pluralize(report.answeredCount, "answer")}
                {report.skippedCount ? ` · ${report.skippedCount} skipped` : ""}
              </Chip>
              <Chip tone="outline" title={report.engine === "claude" ? "Feedback written by Claude" : "Feedback from Poise's offline engine"}>
                {report.engine === "claude" ? <Cpu className="size-3.5" /> : <WifiOff className="size-3.5" />}
                {report.engine === "claude" ? "AI feedback" : "Offline engine"}
              </Chip>
            </div>
          </div>
          <ScoreRing score={report.overall} size={190} stroke={12} label="Overall score" className="mx-auto" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <SectionHeading eyebrow="How you were scored" title="Five dimensions" />
          <div className="grid gap-5">
            {DIMENSIONS.map((key) => (
              <Meter key={key} label={DIMENSION_INFO[key].label} value={report.dimensions[key]} description={DIMENSION_INFO[key].question} />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading eyebrow="How you sounded" title="Delivery" />
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Filler words", habits.fillers, "per 100 words", "Aim for under 2"],
              ["Hedges", habits.hedges, "per 100 words", "Aim for under 1.5"],
              ["Pace", habits.wpm, "words / min", "Aim for 130–160"],
              ["Answer length", habits.length, "words on average", "Aim for 90–180"],
            ].map(([label, value, unit, target]) => (
              <div key={label as string} className="rounded-2xl bg-cloud p-4">
                <dt className="text-[13px] text-muted">{label}</dt>
                <dd className="mt-1 font-display text-[28px] font-semibold tabular-nums">{value ?? "—"}</dd>
                <dd className="text-[12px] text-faint">{value === null ? "Not measured" : unit}</dd>
                <dd className="mt-2 text-[12px] text-muted">{target}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[12.5px] leading-relaxed text-muted">Pace is measured for spoken answers only.</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard title="Strengths" items={report.strengths} tone="good" />
        <ListCard title="Biggest opportunities" items={report.improvements} tone="next" />
      </div>

      <Reveal>
        <div className="print-break rounded-[26px] bg-brand-soft p-6 sm:p-8">
          <p className="serif-accent text-[21px] text-ink-2">Your plan for the week</p>
          <h2 className="font-display text-[26px] font-semibold">Three drills, in order</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {report.practicePlan.map((item, index) => (
              <div key={item.title} className="rounded-[20px] bg-white/80 p-5 shadow-sm backdrop-blur">
                <span className="serif-accent text-[22px] text-faint">0{index + 1}</span>
                <h3 className="mt-2 text-[16px] font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <div>
        <SectionHeading
          eyebrow="Question by question"
          title="Your answers, reviewed"
          action={
            <button
              type="button"
              className="no-print text-[13.5px] font-medium text-muted hover:text-ink"
              onClick={() =>
                setOpenIds((current) => (current.size === session.questions.length ? new Set() : new Set(session.questions.map((q) => q.id))))
              }
            >
              {openIds.size === session.questions.length ? "Collapse all" : "Expand all"}
            </button>
          }
        />
        <div className="space-y-3">
          {session.questions.map((question) => {
            if (question.kind === "core") coreIndex++;
            return (
              <QuestionReview
                key={question.id}
                question={question}
                index={coreIndex}
                open={openIds.has(question.id)}
                onToggle={() => toggle(question.id)}
                config={session.config}
              />
            );
          })}
        </div>
      </div>

      <Card className="no-print relative overflow-hidden border-0 bg-night p-8 text-white sm:p-10">
        <div className="absolute inset-0" style={{ background: "radial-gradient(60% 90% at 90% 50%, rgb(232 51 111 / 0.45), transparent 70%)" }} />
        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="serif-accent text-[21px] text-white/70">Ready for another round?</p>
            <h2 className="font-display text-[28px] font-semibold leading-tight">Lock in what you learned while it's fresh.</h2>
          </div>
          <Button variant="light" size="lg" arrow onClick={practiceAgain} loading={createSession.isPending}>
            Practise again
          </Button>
        </div>
      </Card>
    </div>
  );
}
