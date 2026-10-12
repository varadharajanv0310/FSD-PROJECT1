import { ArrowRight, ArrowUpRight, CheckCircle2, CircleAlert, Clock, Flame, MessageSquareText, Play, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  DIMENSIONS,
  DIMENSION_INFO,
  INTERVIEW_TYPE_INFO,
  getRole,
  type DashboardStats,
  type DimensionKey,
  type InterviewType,
  type SessionSummary,
} from "@poise/shared";
import { ScoreTrendChart } from "@/components/app/charts";
import { Orb } from "@/components/brand/Orb";
import { Reveal } from "@/components/brand/Reveal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Meter } from "@/components/ui/Meter";
import { Card, Chip, SectionHeading, Skeleton } from "@/components/ui/primitives";
import { ScorePill } from "@/components/ui/ScoreRing";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/cn";
import { firstName, formatMinutes, greeting, pluralize, relativeDate } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useLoadSampleHistory, useStats } from "@/lib/queries";
import { RoleIcon, ROLE_GRADIENTS } from "@/lib/roles";
import { useAuth } from "@/providers/AuthProvider";

/** Which interview format best exercises each dimension. */
const PRACTICE_FOR: Record<DimensionKey, InterviewType> = {
  relevance: "mixed",
  depth: "technical",
  structure: "behavioral",
  clarity: "mixed",
  confidence: "behavioral",
};

function StatTile({
  label,
  value,
  suffix,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  detail?: React.ReactNode;
  icon: typeof Clock;
}) {
  return (
    <Card className="flex flex-col justify-between gap-5 p-5 sm:p-6">
      <div className="flex items-center justify-between text-[13.5px] text-muted">
        {label}
        <Icon className="size-4 text-faint" aria-hidden="true" />
      </div>
      <div>
        <p className="font-display text-[34px] font-semibold leading-none tabular-nums">
          {value}
          {suffix && <span className="ml-1 text-[15px] font-medium text-faint">{suffix}</span>}
        </p>
        {detail && <p className="mt-2 text-[12.5px] text-muted">{detail}</p>}
      </div>
    </Card>
  );
}

export function SessionRow({ session }: { session: SessionSummary }) {
  const role = getRole(session.role);
  const inProgress = session.status === "in_progress";
  const to = inProgress ? `/app/interview/${session.id}` : `/app/report/${session.id}`;
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-mist sm:px-4"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: ROLE_GRADIENTS[session.role] }}>
        <RoleIcon role={session.role} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{role?.label}</p>
        <p className="truncate text-[13px] text-muted">
          {INTERVIEW_TYPE_INFO[session.type].label} · {relativeDate(session.startedAt)} · {pluralize(session.answeredCount, "answer")}
        </p>
      </div>
      {inProgress ? (
        <Chip tone="rose">
          <Play className="size-3" /> Resume
        </Chip>
      ) : session.status === "evaluating" ? (
        <Chip>Analysing…</Chip>
      ) : (
        <ScorePill score={session.overall} />
      )}
      <ArrowUpRight className="size-4 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

function HabitRow({ label, value, unit, target, good }: { label: string; value: number | null; unit: string; target: string; good: boolean | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p className="text-[14px] font-medium">{label}</p>
        <p className="text-[12.5px] text-muted">Target: {target}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-[22px] font-semibold tabular-nums">
          {value ?? "—"}
          {value !== null && <span className="ml-1 text-[12px] font-medium text-faint">{unit}</span>}
        </p>
        {good !== null && (
          <p className={cn("inline-flex items-center gap-1 text-[12px]", good ? "text-[#0a7a0a]" : "text-[#b4532a]")}>
            {good ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
            {good ? "On target" : "Work on it"}
          </p>
        )}
      </div>
    </div>
  );
}

function Welcome({ name }: { name: string }) {
  const loadSample = useLoadSampleHistory();
  const showSample = () =>
    loadSample.mutate(undefined, {
      onSuccess: ({ added }) => toast.success(`Added ${pluralize(added, "sample interview")}. Explore away!`),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load the sample history."),
    });
  const presets = [
    { role: "software-engineer", type: "mixed", title: "Campus SDE round", detail: "CS fundamentals + HR · 6 questions" },
    { role: "frontend", type: "technical", title: "Frontend deep-dive", detail: "JavaScript, React, performance" },
    { role: "product-manager", type: "behavioral", title: "Behavioural & HR", detail: "Teamwork, conflict, motivation" },
  ] as const;
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-0 bg-night p-8 text-white sm:p-12">
        <div className="absolute inset-0" style={{ background: "radial-gradient(60% 80% at 85% 20%, rgb(232 51 111 / 0.5), transparent 70%), radial-gradient(50% 70% at 10% 100%, rgb(255 122 47 / 0.35), transparent 70%)" }} />
        <div className="relative grid items-center gap-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="serif-accent text-[22px] text-white/75">{name ? `Welcome, ${firstName(name)}.` : "Welcome to Poise."}</p>
            <h1 className="mt-2 font-display text-[38px] font-semibold leading-[1.04] sm:text-[48px]">
              Your first mock interview is ten minutes away.
            </h1>
            <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed text-white/70">
              Pick a role, answer a few questions, and get a detailed debrief. Your dashboard fills in as you
              practise.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink to="/app/new" variant="light" size="lg" arrow>
                Set up my first interview
              </ButtonLink>
              <Button variant="glass" size="lg" loading={loadSample.isPending} onClick={showSample}>
                Explore with sample data
              </Button>
            </div>
            <p className="mt-3 text-[13px] text-white/55">Sample data adds a week of example interviews to look around.</p>
          </div>
          <div className="flex justify-center">
            <Orb size={220} state="speaking" />
          </div>
        </div>
      </Card>
      <div>
        <SectionHeading eyebrow="Or jump straight in" title="Popular starting points" />
        <div className="grid gap-4 sm:grid-cols-3">
          {presets.map((preset) => (
            <Link
              key={preset.title}
              to={`/app/new?role=${preset.role}&type=${preset.type}`}
              className="group rounded-[22px] border border-line bg-white p-5 transition-shadow hover:shadow-[0_20px_40px_-24px_rgb(0_0_0/0.25)]"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl text-white" style={{ background: ROLE_GRADIENTS[preset.role] }}>
                <RoleIcon role={preset.role} className="size-5" />
              </span>
              <p className="mt-5 text-[16px] font-semibold">{preset.title}</p>
              <p className="mt-1 text-[13.5px] text-muted">{preset.detail}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium">
                Start <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useStats();

  if (isLoading || !user) return <DashboardSkeleton />;
  if (error || !stats) return <p className="text-muted">We couldn't load your dashboard. Please refresh the page.</p>;
  if (stats.totals.sessions === 0) return <Welcome name={user.name} />;

  return <DashboardContent stats={stats} name={user.name} targetRole={user.targetRole} />;
}

function DashboardContent({ stats, name, targetRole }: { stats: DashboardStats; name: string; targetRole?: string }) {
  const { totals, trend, dimensions, focus, habits, byRole, recent, inProgress } = stats;
  const first = trend[0]?.score;
  const latest = trend[trend.length - 1]?.score;
  const delta = first !== undefined && latest !== undefined && trend.length > 1 ? latest - first : null;
  const focusRole = targetRole ?? byRole[0]?.role ?? "software-engineer";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="serif-accent text-[21px] text-muted">{name ? `${greeting()},` : `${greeting()}.`}</p>
          <h1 className="font-display text-[40px] font-semibold leading-[1.02] sm:text-[48px]">
            {name ? `${firstName(name)}.` : "Your progress."}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {latest !== undefined
              ? `Your latest interview scored ${latest}. ${delta !== null && delta > 0 ? `That's ${delta} points up since you started.` : "Keep the momentum going."}`
              : "Finish an interview to see your scores here."}
          </p>
        </div>
        <ButtonLink to="/app/new" size="lg" arrow>
          Start a mock interview
        </ButtonLink>
      </div>

      {inProgress && (
        <Reveal y={10}>
          <Link
            to={`/app/interview/${inProgress.id}`}
            className="group flex items-center gap-4 rounded-[22px] border border-[#f7c6d9] bg-[#fff5f9] p-4 pr-5 transition-colors hover:bg-[#ffeef5]"
          >
            <Orb size={44} state="idle" glow={false} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">You have an interview in progress</p>
              <p className="truncate text-[13.5px] text-muted">
                {inProgress.title} · {inProgress.answeredCount} of {inProgress.questionCount} answered
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[14px] font-medium">
              Resume <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </Reveal>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Average score"
          icon={TrendingUp}
          value={totals.averageScore ?? "—"}
          suffix={totals.averageScore !== null ? "/100" : undefined}
          detail={delta !== null ? `${delta >= 0 ? "+" : ""}${delta} since your first interview` : `Best ${totals.bestScore ?? "—"}`}
        />
        <StatTile
          label="Interviews completed"
          icon={MessageSquareText}
          value={totals.completed}
          detail={`${pluralize(totals.questionsAnswered, "question")} answered`}
        />
        <StatTile label="Time practising" icon={Clock} value={formatMinutes(totals.practiceMinutes * 60)} detail="Speaking and thinking time" />
        <StatTile
          label="Day streak"
          icon={Flame}
          value={totals.streakDays}
          suffix={totals.streakDays === 1 ? "day" : "days"}
          detail={totals.streakDays > 0 ? "Practise today to keep it going" : "Practise today to start a streak"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <SectionHeading
            eyebrow="Score over time"
            title="Your progress"
            action={<span className="text-[12.5px] text-muted">{pluralize(trend.length, "interview")}</span>}
          />
          {trend.length > 0 ? (
            <ScoreTrendChart trend={trend} />
          ) : (
            <p className="py-16 text-center text-[14px] text-muted">Complete an interview to start your trend line.</p>
          )}
        </Card>

        <Card className="flex flex-col p-6">
          <SectionHeading eyebrow="Last ten interviews" title="Skill profile" />
          {dimensions ? (
            <div className="flex flex-1 flex-col justify-between gap-4">
              {DIMENSIONS.map((key) => (
                <Meter key={key} label={DIMENSION_INFO[key].label} value={dimensions[key]} />
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-muted">Your five dimensions appear after your first completed interview.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {focus && (
          <Card className="noise relative overflow-hidden border-0 bg-brand-gradient p-6 text-white">
            <div className="absolute inset-0" style={{ background: "radial-gradient(70% 90% at 0% 0%, rgb(76 29 149 / 0.7), transparent 70%)" }} />
            <div className="relative flex h-full flex-col">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium">
                <Target className="size-3.5" /> Focus next
              </span>
              <p className="mt-5 font-display text-[30px] font-semibold leading-none">
                {DIMENSION_INFO[focus.dimension].label}
                <span className="ml-2 text-[16px] font-medium text-white/70">{focus.score}/100</span>
              </p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-white/85">{focus.tip}</p>
              <div className="mt-auto pt-6">
                <ButtonLink to={`/app/new?role=${focusRole}&type=${PRACTICE_FOR[focus.dimension]}`} variant="light" size="sm" arrow>
                  Practise {DIMENSION_INFO[focus.dimension].label.toLowerCase()}
                </ButtonLink>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <SectionHeading eyebrow="How you sound" title="Delivery habits" />
          <div className="divide-y divide-line">
            <HabitRow
              label="Filler words"
              value={habits.fillersPer100Words}
              unit="/100 words"
              target="under 2 per 100 words"
              good={habits.fillersPer100Words === null ? null : habits.fillersPer100Words < 2}
            />
            <HabitRow
              label="Speaking pace"
              value={habits.averageWpm}
              unit="wpm"
              target="130–160 words/min"
              good={habits.averageWpm === null ? null : habits.averageWpm >= 120 && habits.averageWpm <= 170}
            />
            <HabitRow
              label="Answer length"
              value={habits.averageAnswerWords}
              unit="words"
              target="90–180 words"
              good={habits.averageAnswerWords === null ? null : habits.averageAnswerWords >= 80 && habits.averageAnswerWords <= 220}
            />
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading eyebrow="Where you've practised" title="Roles" />
          <ul className="space-y-1">
            {byRole.slice(0, 5).map((entry) => (
              <li key={entry.role} className="flex items-center gap-3 py-2">
                <span className="flex size-9 items-center justify-center rounded-xl text-white" style={{ background: ROLE_GRADIENTS[entry.role] }}>
                  <RoleIcon role={entry.role} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{getRole(entry.role)?.label}</p>
                  <p className="text-[12.5px] text-muted">{pluralize(entry.sessions, "interview")}</p>
                </div>
                <ScorePill score={entry.averageScore} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <SectionHeading
          className="px-2"
          eyebrow="Pick up where you left off"
          title="Recent interviews"
          action={
            <Link to="/app/history" className="text-[13.5px] font-medium text-muted hover:text-ink">
              View all
            </Link>
          }
        />
        <div className="divide-y divide-line/70">
          {recent.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      </Card>
    </div>
  );
}
