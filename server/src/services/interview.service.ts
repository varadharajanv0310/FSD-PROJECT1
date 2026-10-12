import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import {
  DIMENSIONS,
  INTERVIEW_TYPE_INFO,
  LIMITS,
  analyzeAnswer,
  getRole,
  scoreBand,
  weightedOverall,
  type AnswerMode,
  type DimensionScores,
  type InterviewConfig,
  type InterviewSession,
  type QuestionEvaluation,
  type SessionReport,
  type SessionSummary,
} from "@poise/shared";
import { localEngine, runEngine, type DraftQuestion, type QuestionContext, type ReportItem } from "../ai";
import { skippedEvaluation } from "../ai/local/feedback";
import {
  InterviewSessionModel,
  type StoredQuestion,
  type StoredSession,
} from "../models/InterviewSession";
import { badRequest, conflict, notFound } from "../utils/errors";
import { logger } from "../utils/logger";
import { serializeSession, summarizeSession } from "./serialize";

const newQuestionId = () => randomUUID().slice(0, 8);

function toStored(draft: DraftQuestion, kind: StoredQuestion["kind"], parentId?: string): StoredQuestion {
  return {
    id: newQuestionId(),
    text: draft.text,
    category: draft.category,
    kind,
    parentId,
    difficulty: draft.difficulty,
    hint: draft.hint,
    keyPoints: draft.keyPoints,
    referenceAnswer: draft.referenceAnswer,
  };
}

function contextOf(question: StoredQuestion): QuestionContext {
  return {
    text: question.text,
    category: question.category,
    kind: question.kind,
    keyPoints: question.keyPoints,
    referenceAnswer: question.referenceAnswer,
  };
}

async function loadOwned(userId: string, sessionId: string) {
  if (!Types.ObjectId.isValid(sessionId)) throw notFound("We couldn't find that interview.");
  const session = await InterviewSessionModel.findOne({ _id: sessionId, user: userId }).lean();
  if (!session) throw notFound("We couldn't find that interview.");
  return session;
}

/** Question texts from the user's recent sessions, to keep practice varied. */
async function recentQuestionTexts(userId: string): Promise<string[]> {
  const recent = await InterviewSessionModel.find({ user: userId }, { "questions.text": 1 })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  return recent.flatMap((session) => session.questions.map((q) => q.text));
}

export async function createSession(userId: string, config: InterviewConfig): Promise<InterviewSession> {
  const avoid = await recentQuestionTexts(userId);
  const { value: drafts, engine } = await runEngine("question generation", (e) =>
    e.generateQuestions({ config, count: config.questionCount, avoid }),
  );

  // Top up from the offline bank if the engine returned too few questions.
  if (drafts.length < config.questionCount) {
    const extra = await localEngine.generateQuestions({ config, count: config.questionCount, avoid });
    const seen = new Set(drafts.map((d) => d.text.toLowerCase()));
    for (const draft of extra) {
      if (drafts.length >= config.questionCount) break;
      if (!seen.has(draft.text.toLowerCase())) drafts.push(draft);
    }
  }

  const role = getRole(config.role);
  const session = await InterviewSessionModel.create({
    user: userId,
    title: `${role?.label ?? "Interview"} · ${INTERVIEW_TYPE_INFO[config.type].label}`,
    config,
    status: "in_progress",
    questions: drafts.map((draft) => toStored(draft, "core")),
    currentIndex: 0,
    engine,
    startedAt: new Date(),
  });
  return serializeSession(session.toObject());
}

export async function getSession(userId: string, sessionId: string): Promise<InterviewSession> {
  const session = await loadOwned(userId, sessionId);
  if (session.status === "evaluating") resumeSession(sessionId, session);
  return serializeSession(session);
}

export interface ListOptions {
  status?: StoredSession["status"];
  role?: string;
  limit?: number;
}

export async function listSessions(userId: string, options: ListOptions = {}): Promise<SessionSummary[]> {
  const filter: Record<string, unknown> = { user: userId };
  if (options.status) filter.status = options.status;
  if (options.role) filter["config.role"] = options.role;
  const sessions = await InterviewSessionModel.find(filter, {
    "questions.referenceAnswer": 0,
    "questions.evaluation.sampleAnswer": 0,
  })
    .sort({ startedAt: -1 })
    .limit(Math.min(options.limit ?? 50, 200))
    .lean();
  return sessions.map(summarizeSession);
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  const result = await InterviewSessionModel.deleteOne({ _id: sessionId, user: userId });
  if (result.deletedCount === 0) throw notFound("We couldn't find that interview.");
}

export interface AnswerInput {
  questionId: string;
  text: string;
  durationSec: number;
  mode: AnswerMode;
  skipped: boolean;
}

export async function submitAnswer(userId: string, sessionId: string, input: AnswerInput): Promise<InterviewSession> {
  const session = await loadOwned(userId, sessionId);
  if (session.status !== "in_progress") throw conflict("This interview has already finished.");

  const index = session.questions.findIndex((q) => q.id === input.questionId);
  const question = session.questions[index];
  if (!question) throw notFound("That question isn't part of this interview.");
  if (question.answer) throw conflict("You've already answered this question.");
  if (index !== session.currentIndex) throw conflict("Please answer the questions in order.");

  const text = input.skipped ? "" : input.text.trim();
  if (!input.skipped && text.length === 0) throw badRequest("Your answer is empty — type or speak an answer, or skip the question.");

  const durationSec = Math.max(0, Math.min(Math.round(input.durationSec), 60 * 60));
  const metrics = analyzeAnswer(text, { durationSec, mode: input.mode });
  const answer = { text, durationSec, mode: input.mode, skipped: input.skipped, submittedAt: new Date().toISOString() };
  const pending: QuestionEvaluation = { status: "pending", strengths: [], improvements: [], missedPoints: [] };

  const saved = await InterviewSessionModel.updateOne(
    { _id: sessionId, user: userId, status: "in_progress", currentIndex: index, "questions.id": question.id },
    {
      $set: {
        "questions.$.answer": answer,
        "questions.$.metrics": metrics,
        "questions.$.evaluation": pending,
        currentIndex: index + 1,
      },
      $inc: { totalDurationSec: durationSec },
    },
  );
  if (saved.modifiedCount === 0) throw conflict("This answer was already recorded.");
  scheduleEvaluation(sessionId, question.id);

  // Adaptive follow-up: probe the answer like a real interviewer would.
  const followUps = session.questions.filter((q) => q.kind === "follow-up").length;
  const maxFollowUps = Math.floor(session.config.questionCount * LIMITS.maxFollowUpsRatio);
  if (session.config.adaptiveFollowUps && !input.skipped && question.kind === "core" && followUps < maxFollowUps) {
    try {
      const { value: followUp } = await runEngine("follow-up", (e) =>
        e.generateFollowUp({
          config: session.config,
          question: contextOf(question),
          answer: text,
          metrics,
          askedQuestions: session.questions.map((q) => q.text),
        }),
      );
      if (followUp) {
        await InterviewSessionModel.updateOne(
          { _id: sessionId },
          { $push: { questions: { $each: [toStored(followUp, "follow-up", question.id)], $position: index + 1 } } },
        );
      }
    } catch (error) {
      logger.warn("Follow-up generation failed; continuing without one.", error);
    }
  }

  return serializeSession(await loadOwned(userId, sessionId));
}

export async function completeSession(userId: string, sessionId: string): Promise<InterviewSession> {
  const session = await loadOwned(userId, sessionId);
  if (session.status === "in_progress") {
    if (!session.questions.some((q) => q.answer)) {
      throw badRequest("Answer at least one question before finishing — or discard this interview.");
    }
    await InterviewSessionModel.updateOne(
      { _id: sessionId, status: "in_progress" },
      { $set: { status: "evaluating", completedAt: new Date() } },
    );
  }
  const updated = await loadOwned(userId, sessionId);
  if (updated.status === "evaluating") resumeSession(sessionId, updated);
  return serializeSession(updated);
}

// ── Background evaluation ────────────────────────────────────────────────
// Answers are evaluated asynchronously so the candidate moves straight to
// the next question. Writes use targeted positional updates, so concurrent
// evaluations never overwrite each other.

const inFlight = new Set<string>();

function scheduleEvaluation(sessionId: string, questionId: string) {
  const key = `${sessionId}:${questionId}`;
  if (inFlight.has(key)) return;
  inFlight.add(key);
  void evaluateQuestion(sessionId, questionId)
    .catch((error) => logger.error(`Evaluation crashed for ${key}`, error))
    .finally(() => {
      inFlight.delete(key);
      void finalizeIfReady(sessionId);
    });
}

async function evaluateQuestion(sessionId: string, questionId: string): Promise<void> {
  const session = await InterviewSessionModel.findById(sessionId).lean();
  const question = session?.questions.find((q) => q.id === questionId);
  if (!session || !question?.answer || question.evaluation?.status !== "pending") return;

  let evaluation: QuestionEvaluation;
  try {
    if (question.answer.skipped) {
      const result = skippedEvaluation(question.referenceAnswer, question.keyPoints);
      evaluation = { status: "done", engine: "local", overall: 0, ...result };
    } else {
      const { value, engine } = await runEngine("evaluation", (e) =>
        e.evaluateAnswer({
          config: session.config,
          question: contextOf(question),
          answer: { text: question.answer!.text, mode: question.answer!.mode, durationSec: question.answer!.durationSec },
          metrics: question.metrics ?? analyzeAnswer(question.answer!.text),
        }),
      );
      evaluation = {
        status: "done",
        engine,
        overall: weightedOverall(value.scores),
        ...value,
        sampleAnswer: value.sampleAnswer || question.referenceAnswer,
      };
    }
  } catch (error) {
    logger.error(`Could not evaluate question ${questionId}`, error);
    evaluation = {
      status: "failed",
      strengths: [],
      improvements: [],
      missedPoints: [],
      error: "We couldn't evaluate this answer.",
    };
  }

  await InterviewSessionModel.updateOne(
    { _id: sessionId, "questions.id": questionId },
    { $set: { "questions.$.evaluation": evaluation } },
  );
}

const finalizing = new Set<string>();

async function finalizeIfReady(sessionId: string): Promise<void> {
  if (finalizing.has(sessionId)) return;
  finalizing.add(sessionId);
  try {
    const session = await InterviewSessionModel.findById(sessionId).lean();
    if (!session || session.status !== "evaluating") return;
    const responded = session.questions.filter((q) => q.answer);
    if (responded.some((q) => q.evaluation?.status === "pending")) return;

    const report = await buildSessionReport(session);
    await InterviewSessionModel.updateOne(
      { _id: sessionId, status: "evaluating" },
      { $set: { status: "completed", report } },
    );
  } catch (error) {
    logger.error(`Could not finalise session ${sessionId}`, error);
  } finally {
    finalizing.delete(sessionId);
  }
}

/** Re-queues any unfinished work — used after restarts or when polling. */
function resumeSession(sessionId: string, session: StoredSession) {
  const pending = session.questions.filter((q) => q.answer && q.evaluation?.status === "pending");
  for (const question of pending) scheduleEvaluation(sessionId, question.id);
  if (pending.length === 0) void finalizeIfReady(sessionId);
}

export async function resumeUnfinishedWork(): Promise<void> {
  const sessions = await InterviewSessionModel.find({
    $or: [{ status: "evaluating" }, { "questions.evaluation.status": "pending" }],
  }).lean();
  for (const session of sessions) resumeSession(session._id.toString(), session);
  if (sessions.length > 0) logger.info(`Resumed background work for ${sessions.length} interview(s).`);
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

const round1 = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

export async function buildSessionReport(
  session: Pick<StoredSession, "questions" | "config">,
  options: { offline?: boolean } = {},
): Promise<SessionReport> {
  const scored = session.questions.filter((q) => q.answer && q.evaluation?.status === "done" && q.evaluation.scores);
  const spoken = session.questions.filter((q) => q.answer && !q.answer.skipped && q.metrics);

  const dimensions = Object.fromEntries(
    DIMENSIONS.map((key) => [key, Math.round(mean(scored.map((q) => q.evaluation!.scores![key])) ?? 0)]),
  ) as DimensionScores;
  const overall = Math.round(mean(scored.map((q) => q.evaluation!.overall ?? 0)) ?? 0);

  const totalWords = spoken.reduce((sum, q) => sum + q.metrics!.wordCount, 0);
  const totalFillers = spoken.reduce((sum, q) => sum + q.metrics!.fillerCount, 0);
  const totalHedges = spoken.reduce((sum, q) => sum + q.metrics!.hedgeCount, 0);
  const wpms = spoken.map((q) => q.metrics!.wpm).filter((w): w is number => w !== null);
  const habits = {
    fillersPer100Words: totalWords > 0 ? round1((totalFillers / totalWords) * 100) : null,
    hedgesPer100Words: totalWords > 0 ? round1((totalHedges / totalWords) * 100) : null,
    averageWpm: wpms.length > 0 ? Math.round(mean(wpms)!) : null,
    averageAnswerWords: spoken.length > 0 ? Math.round(totalWords / spoken.length) : null,
  };

  const items: ReportItem[] = session.questions
    .filter((q) => q.answer)
    .map((q) => ({
      question: q.text,
      category: q.category,
      kind: q.kind,
      answer: q.answer!.skipped ? null : q.answer!.text,
      skipped: q.answer!.skipped,
      overall: q.evaluation?.overall ?? null,
      scores: q.evaluation?.scores ?? null,
      summary: q.evaluation?.summary ?? null,
      missedPoints: q.evaluation?.missedPoints ?? [],
    }));

  const reportInput = { config: session.config, items, overall, dimensions, habits };
  const { value: narrative, engine } = options.offline
    ? { value: await localEngine.generateReport(reportInput), engine: "local" as const }
    : await runEngine("report", (e) => e.generateReport(reportInput));

  return {
    overall,
    band: scoreBand(overall).label,
    dimensions,
    ...narrative,
    answeredCount: session.questions.filter((q) => q.answer && !q.answer.skipped).length,
    skippedCount: session.questions.filter((q) => q.answer?.skipped).length,
    unansweredCount: session.questions.filter((q) => !q.answer).length,
    engine,
    generatedAt: new Date().toISOString(),
  };
}
