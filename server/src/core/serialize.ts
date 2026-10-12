import type {
  InterviewQuestion,
  InterviewSession,
  SavedQuestion,
  SessionSummary,
  User,
} from "@poise/shared";
import type { StoredQuestion } from "../models/InterviewSession";
import type { StoredSavedQuestion } from "../models/SavedQuestion";
import type { UserRecord } from "../models/User";
import type { SessionRecord, WithId } from "./session";

const iso = (date: Date | string | undefined) => (date ? new Date(date).toISOString() : undefined);
const idOf = (record: { _id: { toString(): string } | string }) => record._id.toString();

export function serializeUser(user: WithId<Omit<UserRecord, "createdAt" | "updatedAt"> & { createdAt?: Date | string }>): User {
  return {
    id: idOf(user),
    name: user.name,
    email: user.email,
    targetRole: (user.targetRole ?? undefined) as User["targetRole"],
    level: (user.level ?? undefined) as User["level"],
    isDemo: Boolean(user.isDemo),
    preferences: {
      autoReadQuestions: user.preferences?.autoReadQuestions ?? true,
      voiceRate: user.preferences?.voiceRate ?? 1,
      showLiveMetrics: user.preferences?.showLiveMetrics ?? true,
      cameraByDefault: user.preferences?.cameraByDefault ?? false,
    },
    createdAt: iso(user.createdAt) ?? new Date(0).toISOString(),
  };
}

/**
 * Shapes a question for the client. While an interview is running, the
 * candidate only sees questions they've reached, and key points stay hidden
 * until they've answered — just like a real interview.
 */
function serializeQuestion(question: StoredQuestion, index: number, session: SessionRecord): InterviewQuestion {
  const inProgress = session.status === "in_progress";
  const reached = !inProgress || index <= session.currentIndex;
  const answered = Boolean(question.answer);
  return {
    id: question.id,
    text: reached ? question.text : "",
    category: question.category,
    kind: question.kind,
    parentId: question.parentId,
    difficulty: question.difficulty,
    hint: reached ? question.hint : undefined,
    keyPoints: answered || !inProgress ? question.keyPoints : undefined,
    answer: question.answer,
    metrics: question.metrics,
    evaluation: question.evaluation,
  };
}

export function serializeSession(session: WithId<SessionRecord>): InterviewSession {
  return {
    id: idOf(session),
    title: session.title,
    config: session.config,
    status: session.status,
    questions: session.questions.map((question, index) => serializeQuestion(question, index, session)),
    currentIndex: session.currentIndex,
    report: session.report,
    engine: session.engine,
    startedAt: iso(session.startedAt)!,
    completedAt: iso(session.completedAt),
    totalDurationSec: session.totalDurationSec,
  };
}

export function summarizeSession(session: WithId<SessionRecord>): SessionSummary {
  return {
    id: idOf(session),
    title: session.title,
    role: session.config.role,
    type: session.config.type,
    level: session.config.level,
    difficulty: session.config.difficulty,
    status: session.status,
    overall: session.report?.overall ?? null,
    band: session.report?.band ?? null,
    questionCount: session.questions.length,
    answeredCount: session.questions.filter((q) => q.answer && !q.answer.skipped).length,
    startedAt: iso(session.startedAt)!,
    completedAt: iso(session.completedAt),
    totalDurationSec: session.totalDurationSec,
    engine: session.engine,
  };
}

export function serializeSavedQuestion(question: WithId<Omit<StoredSavedQuestion, "user" | "createdAt" | "updatedAt"> & { createdAt: Date | string }>): SavedQuestion {
  return {
    id: idOf(question),
    text: question.text,
    category: question.category,
    difficulty: question.difficulty,
    hint: question.hint,
    keyPoints: question.keyPoints,
    sampleAnswer: question.sampleAnswer,
    role: question.role,
    type: question.type,
    createdAt: iso(question.createdAt)!,
  };
}
