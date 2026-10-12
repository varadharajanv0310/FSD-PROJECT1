import {
  INTERVIEW_TYPE_INFO,
  LIMITS,
  analyzeAnswer,
  getRole,
  weightedOverall,
  type AnswerMode,
  type EngineStatus,
  type GeneratedQuestion,
  type InterviewConfig,
  type QuestionEvaluation,
  type User,
  type UserPreferences,
} from "@poise/shared";
import { LocalEngine } from "@server/ai/local/engine";
import { skippedEvaluation } from "@server/ai/local/feedback";
import { buildDemoSessions } from "@server/core/demo";
import { assembleReport, reportInputFor } from "@server/core/report";
import { serializeSavedQuestion, serializeSession, summarizeSession } from "@server/core/serialize";
import { questionContext, toStoredQuestion } from "@server/core/session";
import { computeDashboardStats } from "@server/core/stats";
import { ApiError } from "@/lib/api-error";
import type { httpApi } from "@/lib/http-api";
import { newId, store, type LocalSession, type LocalUser } from "./store";

/**
 * The standalone build's backend: the same contract as the Express API,
 * implemented in the browser on top of the offline engine and device storage.
 * Business rules and messages mirror `server/src/services`.
 */

const engine = new LocalEngine();
let addingSample = false;

const DEFAULT_PREFERENCES: UserPreferences = {
  autoReadQuestions: true,
  voiceRate: 1,
  showLiveMetrics: true,
  cameraByDefault: false,
};

/** Returned data must never alias stored objects, or cached views would change under React Query. */
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const badRequest = (message: string) => new ApiError(400, "bad_request", message);
const unauthorized = (message = "Your session has ended. Refresh the page to continue.") =>
  new ApiError(401, "unauthorized", message);
const notFound = (message = "We couldn't find that.") => new ApiError(404, "not_found", message);
const conflict = (message: string) => new ApiError(409, "conflict", message);

function toUser(user: LocalUser): User {
  return clone({
    id: user.id,
    name: user.name,
    email: "",
    targetRole: user.targetRole,
    level: user.level,
    isDemo: false,
    isGuest: true,
    preferences: { ...DEFAULT_PREFERENCES, ...user.preferences },
    createdAt: user.createdAt,
  });
}

function currentUser(): LocalUser {
  const { currentUserId, users } = store.state;
  const user = users.find((u) => u.id === currentUserId);
  if (!user) throw unauthorized();
  return user;
}

function ownedSession(id: string): LocalSession {
  const user = currentUser();
  const session = store.state.sessions.find((s) => s._id === id && s.userId === user.id);
  if (!session) throw notFound("We couldn't find that interview.");
  return session;
}

function validateConfig(config: InterviewConfig) {
  if (config.questionCount < LIMITS.minQuestions || config.questionCount > LIMITS.maxQuestions) {
    throw badRequest(`Choose between ${LIMITS.minQuestions} and ${LIMITS.maxQuestions} questions.`);
  }
  if (config.type === "system-design" && !getRole(config.role)?.systemDesign) {
    throw badRequest("type: System design rounds are available for engineering roles only.");
  }
}

function evaluate(
  config: InterviewConfig,
  question: LocalSession["questions"][number],
  answer: { text: string; mode: AnswerMode; durationSec: number; skipped: boolean },
  metrics: ReturnType<typeof analyzeAnswer>,
): Promise<QuestionEvaluation> {
  if (answer.skipped) {
    return Promise.resolve({ status: "done", engine: "local", overall: 0, ...skippedEvaluation(question.referenceAnswer, question.keyPoints) });
  }
  const { text, mode, durationSec } = answer;
  return engine
    .evaluateAnswer({ config, question: questionContext(question), answer: { text, mode, durationSec }, metrics })
    .then((value) => ({
      status: "done" as const,
      engine: "local" as const,
      overall: weightedOverall(value.scores),
      ...value,
      sampleAnswer: value.sampleAnswer || question.referenceAnswer,
    }));
}

export const localApi: typeof httpApi = {
  // ── Profile (no sign-up: one profile per device) ─────────────────────────
  async currentUser() {
    const { currentUserId, users } = store.state;
    const user = users.find((u) => u.id === currentUserId);
    return { user: user ? toUser(user) : null };
  },

  async startSession() {
    store.refresh();
    const existing = store.state.users.find((u) => u.id === store.state.currentUserId);
    if (existing) return { user: toUser(existing) };
    const user: LocalUser = {
      id: newId(),
      name: "",
      preferences: { ...DEFAULT_PREFERENCES },
      createdAt: new Date().toISOString(),
    };
    store.update((draft) => {
      draft.users.push(user);
      draft.currentUserId = user.id;
    });
    return { user: toUser(user) };
  },

  async updateProfile(update) {
    const user = currentUser();
    store.update(() => {
      if (update.name !== undefined) user.name = update.name.trim().slice(0, 80);
      if (update.targetRole !== undefined) user.targetRole = update.targetRole ?? undefined;
      if (update.level !== undefined) user.level = update.level ?? undefined;
      if (update.preferences) user.preferences = { ...DEFAULT_PREFERENCES, ...user.preferences, ...update.preferences };
    });
    return { user: toUser(user) };
  },

  async deleteAccount() {
    currentUser();
    // One profile per device: erasing it clears everything this preview stored.
    store.reset();
  },

  // ── Meta ───────────────────────────────────────────────────────────────
  async engine() {
    const engineStatus: EngineStatus = { provider: "local", model: null, label: "Offline engine" };
    return { engine: engineStatus };
  },

  async stats() {
    const user = currentUser();
    const sessions = store.state.sessions.filter((s) => s.userId === user.id);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return { stats: clone(computeDashboardStats(sessions, timeZone)) };
  },

  // ── Interviews ─────────────────────────────────────────────────────────
  async sessions(filters = {}) {
    const user = currentUser();
    const sessions = store.state.sessions
      .filter((s) => s.userId === user.id)
      .filter((s) => !filters.status || s.status === filters.status)
      .filter((s) => !filters.role || s.config.role === filters.role)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return { sessions: clone(sessions.map(summarizeSession)) };
  },

  async session(id) {
    return { session: clone(serializeSession(ownedSession(id))) };
  },

  async createSession(input) {
    const user = currentUser();
    const config = clone(input);
    validateConfig(config);
    const avoid = store.state.sessions
      .filter((s) => s.userId === user.id)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 5)
      .flatMap((s) => s.questions.map((q) => q.text));
    const drafts = await engine.generateQuestions({ config, count: config.questionCount, avoid });
    // A short beat so the "preparing your questions" moment reads as intended.
    await pause(650);
    const session: LocalSession = {
      _id: newId(),
      userId: user.id,
      title: `${getRole(config.role)?.label ?? "Interview"} · ${INTERVIEW_TYPE_INFO[config.type].label}`,
      config,
      status: "in_progress",
      questions: drafts.map((draft) => toStoredQuestion(draft, "core")),
      currentIndex: 0,
      engine: "local",
      startedAt: new Date().toISOString(),
      totalDurationSec: 0,
    };
    store.update((draft) => {
      draft.sessions.push(session);
    });
    return { session: clone(serializeSession(session)) };
  },

  async answer(id, payload) {
    const session = ownedSession(id);
    if (session.status !== "in_progress") throw conflict("This interview has already finished.");
    const index = session.questions.findIndex((q) => q.id === payload.questionId);
    const question = session.questions[index];
    if (!question) throw notFound("That question isn't part of this interview.");
    if (question.answer) throw conflict("You've already answered this question.");
    if (index !== session.currentIndex) throw conflict("Please answer the questions in order.");

    const text = payload.skipped ? "" : payload.text.trim().slice(0, LIMITS.maxAnswerChars);
    if (!payload.skipped && text.length === 0) {
      throw badRequest("Your answer is empty — type or speak an answer, or skip the question.");
    }
    const durationSec = Math.max(0, Math.min(Math.round(payload.durationSec), 60 * 60));
    const metrics = analyzeAnswer(text, { durationSec, mode: payload.mode });

    const answer = { text, durationSec, mode: payload.mode, skipped: payload.skipped, submittedAt: new Date().toISOString() };
    const evaluation = await evaluate(session.config, question, answer, metrics);

    // Adaptive follow-up: probe the answer like a real interviewer would.
    const followUps = session.questions.filter((q) => q.kind === "follow-up").length;
    const maxFollowUps = Math.floor(session.config.questionCount * LIMITS.maxFollowUpsRatio);
    const followUp =
      session.config.adaptiveFollowUps && !payload.skipped && question.kind === "core" && followUps < maxFollowUps
        ? await engine.generateFollowUp({
            config: session.config,
            question: questionContext(question),
            answer: text,
            metrics,
            askedQuestions: session.questions.map((q) => q.text),
          })
        : null;

    // Apply everything in one step so a failure above never leaves a half-written answer.
    store.update(() => {
      question.answer = answer;
      question.metrics = metrics;
      question.evaluation = evaluation;
      if (followUp) session.questions.splice(index + 1, 0, toStoredQuestion(followUp, "follow-up", question.id));
      session.currentIndex = index + 1;
      session.totalDurationSec += durationSec;
    });
    return { session: clone(serializeSession(session)) };
  },

  async complete(id) {
    const session = ownedSession(id);
    if (session.status === "in_progress") {
      if (!session.questions.some((q) => q.answer)) {
        throw badRequest("Answer at least one question before finishing — or discard this interview.");
      }
      const input = reportInputFor(session);
      const narrative = await engine.generateReport(input);
      const completedAt = new Date();
      store.update(() => {
        session.status = "completed";
        session.completedAt = completedAt.toISOString();
        session.report = assembleReport(session, input, narrative, "local", completedAt);
      });
    }
    return { session: clone(serializeSession(session)) };
  },

  async loadSampleHistory() {
    const user = currentUser();
    if (addingSample || store.state.sessions.some((s) => s.userId === user.id)) {
      throw conflict("Sample history can only be added before your first interview.");
    }
    // Building takes a moment; don't let a second request slip past the check meanwhile.
    addingSample = true;
    try {
      const sessions = await buildDemoSessions(engine);
      store.update((draft) => {
        for (const session of sessions) draft.sessions.push({ ...clone(session), _id: newId(), userId: user.id });
      });
      return { added: sessions.length };
    } finally {
      addingSample = false;
    }
  },

  async deleteSession(id) {
    const session = ownedSession(id);
    store.update((draft) => {
      draft.sessions = draft.sessions.filter((s) => s !== session);
    });
  },

  // ── Question lab ───────────────────────────────────────────────────────
  async practiceQuestions(payload) {
    currentUser();
    const config: InterviewConfig = {
      role: payload.role as InterviewConfig["role"],
      type: payload.type as InterviewConfig["type"],
      level: payload.level as InterviewConfig["level"],
      difficulty: payload.difficulty as InterviewConfig["difficulty"],
      questionCount: payload.count,
      answerMode: "text",
      adaptiveFollowUps: false,
      timePerQuestionSec: 0,
      jobDescription: payload.jobDescription,
      focusAreas: payload.focusAreas,
    };
    validateConfig({ ...config, questionCount: Math.max(LIMITS.minQuestions, config.questionCount) });
    const drafts = await engine.generateQuestions({ config, count: payload.count });
    const questions: GeneratedQuestion[] = drafts.map((q) => ({
      text: q.text,
      category: q.category,
      difficulty: q.difficulty,
      hint: q.hint,
      keyPoints: q.keyPoints,
      sampleAnswer: q.referenceAnswer,
    }));
    return { questions: clone(questions), engine: "local" as const };
  },

  async practiceEvaluate(payload) {
    currentUser();
    const answer = payload.answer.trim();
    if (!answer) throw badRequest("Write or speak an answer first.");
    const metrics = analyzeAnswer(answer, { durationSec: payload.durationSec, mode: payload.mode });
    const value = await engine.evaluateAnswer({
      config: {
        role: payload.role as InterviewConfig["role"],
        type: payload.type as InterviewConfig["type"],
        level: payload.level as InterviewConfig["level"],
        difficulty: payload.difficulty as InterviewConfig["difficulty"],
      },
      question: {
        text: payload.question.text,
        category: payload.question.category,
        kind: "core",
        keyPoints: payload.question.keyPoints,
        referenceAnswer: payload.question.sampleAnswer,
      },
      answer: { text: answer, mode: payload.mode, durationSec: payload.durationSec },
      metrics,
    });
    const evaluation: QuestionEvaluation = {
      status: "done",
      engine: "local",
      overall: weightedOverall(value.scores),
      ...value,
      sampleAnswer: value.sampleAnswer || payload.question.sampleAnswer,
    };
    return clone({ metrics, evaluation });
  },

  async savedQuestions() {
    const user = currentUser();
    const questions = store.state.saved
      .filter((q) => q.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((q) => serializeSavedQuestion({ ...q, _id: q.id }));
    return { questions: clone(questions) };
  },

  async saveQuestion(payload) {
    const user = currentUser();
    const existing = store.state.saved.find((q) => q.userId === user.id && q.text === payload.text);
    const record = {
      id: existing?.id ?? newId(),
      userId: user.id,
      text: payload.text,
      category: payload.category,
      difficulty: payload.difficulty,
      hint: payload.hint ?? "",
      keyPoints: payload.keyPoints ?? [],
      sampleAnswer: payload.sampleAnswer,
      role: payload.role as LocalSession["config"]["role"],
      type: payload.type as LocalSession["config"]["type"],
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    store.update((draft) => {
      draft.saved = [...draft.saved.filter((q) => q.id !== record.id), record];
    });
    return { question: clone(serializeSavedQuestion({ ...record, _id: record.id })) };
  },

  async unsaveQuestion(id) {
    const user = currentUser();
    if (!store.state.saved.some((q) => q.id === id && q.userId === user.id)) throw notFound();
    store.update((draft) => {
      draft.saved = draft.saved.filter((q) => q.id !== id);
    });
  },
};
