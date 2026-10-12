import {
  DIMENSIONS,
  DIMENSION_INFO,
  type DashboardStats,
  type DimensionScores,
  type RoleId,
} from "@poise/shared";
import { InterviewSessionModel } from "../models/InterviewSession";
import { summarizeSession } from "./serialize";

function dayKey(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD, which sorts and compares cleanly.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function safeTimeZone(timeZone: string | undefined): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** Consecutive days, ending today or yesterday, with at least one session. */
function streak(dates: Date[], timeZone: string): number {
  const days = new Set(dates.map((date) => dayKey(date, timeZone)));
  const cursor = new Date();
  if (!days.has(dayKey(cursor, timeZone))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (days.has(dayKey(cursor, timeZone))) {
    count++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}

const average = (values: number[]) =>
  values.length === 0 ? null : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

export async function dashboardStats(userId: string, timeZoneInput?: string): Promise<DashboardStats> {
  const timeZone = safeTimeZone(timeZoneInput);
  const sessions = await InterviewSessionModel.find(
    { user: userId },
    { "questions.referenceAnswer": 0, "questions.evaluation.sampleAnswer": 0, "questions.hint": 0 },
  )
    .sort({ startedAt: 1 })
    .lean();

  const completed = sessions.filter((s) => s.status === "completed" && s.report);
  const answers = sessions.flatMap((s) => s.questions.filter((q) => q.answer && !q.answer.skipped && q.metrics));

  // Weight recent performance: dimensions reflect the last ten sessions.
  const recentReports = completed.slice(-10).map((s) => s.report!);
  const dimensions: DimensionScores | null =
    recentReports.length === 0
      ? null
      : (Object.fromEntries(
          DIMENSIONS.map((key) => [key, average(recentReports.map((r) => r.dimensions[key])) ?? 0]),
        ) as DimensionScores);

  const weakest = dimensions ? [...DIMENSIONS].sort((a, b) => dimensions[a] - dimensions[b])[0]! : null;

  const roles = new Map<RoleId, number[]>();
  const roleSessions = new Map<RoleId, number>();
  for (const session of sessions) {
    roleSessions.set(session.config.role, (roleSessions.get(session.config.role) ?? 0) + 1);
    if (session.report) roles.set(session.config.role, [...(roles.get(session.config.role) ?? []), session.report.overall]);
  }

  const totalWords = answers.reduce((sum, q) => sum + q.metrics!.wordCount, 0);
  const totalFillers = answers.reduce((sum, q) => sum + q.metrics!.fillerCount, 0);
  const wpms = answers.map((q) => q.metrics!.wpm).filter((w): w is number => w !== null);
  const scores = completed.map((s) => s.report!.overall);
  const inProgress = [...sessions].reverse().find((s) => s.status === "in_progress");

  return {
    totals: {
      sessions: sessions.length,
      completed: completed.length,
      questionsAnswered: answers.length,
      practiceMinutes: Math.round(sessions.reduce((sum, s) => sum + s.totalDurationSec, 0) / 60),
      averageScore: average(scores),
      bestScore: scores.length ? Math.max(...scores) : null,
      streakDays: streak(
        sessions.map((s) => s.startedAt),
        timeZone,
      ),
    },
    dimensions,
    trend: completed.slice(-20).map((s) => ({
      id: s._id.toString(),
      date: (s.completedAt ?? s.startedAt).toISOString(),
      score: s.report!.overall,
      role: s.config.role,
      title: s.title,
    })),
    byRole: [...roleSessions.entries()]
      .map(([role, count]) => ({ role, sessions: count, averageScore: average(roles.get(role) ?? []) }))
      .sort((a, b) => b.sessions - a.sessions),
    habits: {
      fillersPer100Words: totalWords > 0 ? Math.round((totalFillers / totalWords) * 1000) / 10 : null,
      averageWpm: average(wpms),
      averageAnswerWords: answers.length ? Math.round(totalWords / answers.length) : null,
    },
    focus:
      dimensions && weakest
        ? { dimension: weakest, score: dimensions[weakest], tip: DIMENSION_INFO[weakest].tip }
        : null,
    recent: [...sessions].reverse().slice(0, 6).map(summarizeSession),
    inProgress: inProgress ? summarizeSession(inProgress) : null,
  };
}
