import { Types } from "mongoose";
import {
  INTERVIEW_TYPE_INFO,
  LIMITS,
  analyzeAnswer,
  getRole,
  weightedOverall,
  type AnswerMode,
  type InterviewConfig,
  type InterviewSession,
  type QuestionEvaluation,
  type SessionReport,
  type SessionSummary,
} from "@poise/shared";
import { localEngine, runEngine } from "../ai";
import { skippedEvaluation } from "../ai/local/feedback";
import { assembleReport, reportInputFor } from "../core/report";
import { questionContext as contextOf, toStoredQuestion as toStored } from "../core/session";
import { InterviewSessionModel, type StoredSession } from "../models/InterviewSession";
import { badRequest, conflict, notFound } from "../utils/errors";
import { logger } from "../utils/logger";
import { serializeSession, summarizeSession } from "../core/serialize";

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

export async function buildSessionReport(
  session: Pick<StoredSession, "questions" | "config">,
  options: { offline?: boolean } = {},
): Promise<SessionReport> {
  const input = reportInputFor(session);
  const { value: narrative, engine } = options.offline
    ? { value: await localEngine.generateReport(input), engine: "local" as const }
    : await runEngine("report", (e) => e.generateReport(input));
  return assembleReport(session, input, narrative, engine);
}
