import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  INTERVIEW_TYPE_INFO,
  analyzeAnswer,
  getRole,
  weightedOverall,
  type InterviewConfig,
  type QuestionEvaluation,
} from "@poise/shared";
import { localEngine } from "../ai";
import { selectQuestions } from "../ai/local/select";
import { InterviewSessionModel, type StoredQuestion } from "../models/InterviewSession";
import { UserModel } from "../models/User";
import { buildSessionReport } from "./interview.service";

export const DEMO_EMAIL = "demo@poise.app";
const DEMO_PASSWORD = "practice-makes-poise";

const FILLERS = ["um,", "like,", "basically", "you know,", "uh,"];
const HEDGES = ["I think", "maybe", "kind of"];

/**
 * Produces a believable candidate answer of a given quality by degrading
 * the reference answer: weaker answers are shorter and noisier.
 */
function simulateAnswer(reference: string, quality: number, seed: number): string {
  const sentences = reference.match(/[^.!?]+[.!?]+/g) ?? [reference];
  const keep = Math.max(1, Math.round(sentences.length * (0.3 + quality * 0.7)));
  const noise = Math.round((1 - quality) * 6);
  const words = sentences.slice(0, keep).join(" ").split(" ");
  for (let i = 0; i < noise; i++) {
    const position = (seed * 7 + i * 13) % Math.max(1, words.length);
    const pool = i % 3 === 2 ? HEDGES : FILLERS;
    words.splice(position, 0, pool[(seed + i) % pool.length]!);
  }
  return words.join(" ");
}

const DEMO_SESSIONS: { config: InterviewConfig; quality: number; daysAgo: number }[] = [
  { config: cfg("software-engineer", "behavioral", "easy", 4), quality: 0.25, daysAgo: 20 },
  { config: cfg("software-engineer", "technical", "easy", 5), quality: 0.4, daysAgo: 16 },
  { config: cfg("frontend", "mixed", "medium", 5), quality: 0.5, daysAgo: 11 },
  { config: cfg("fullstack", "technical", "medium", 5), quality: 0.62, daysAgo: 6 },
  { config: cfg("frontend", "technical", "medium", 4), quality: 0.72, daysAgo: 2 },
  { config: cfg("software-engineer", "mixed", "medium", 5), quality: 0.85, daysAgo: 1 },
  { config: cfg("backend", "system-design", "medium", 3), quality: 0.78, daysAgo: 0 },
];

function cfg(role: InterviewConfig["role"], type: InterviewConfig["type"], difficulty: InterviewConfig["difficulty"], questionCount: number): InterviewConfig {
  return {
    role,
    type,
    level: "intern",
    difficulty,
    questionCount,
    answerMode: "voice",
    adaptiveFollowUps: false,
    timePerQuestionSec: 180,
  };
}

async function seedSessions(userId: string): Promise<void> {
  let seed = 3;
  for (const plan of DEMO_SESSIONS) {
    // Spread sessions across realistic evening practice times.
    const startedAt = new Date(Date.now() - plan.daysAgo * 86_400_000);
    if (plan.daysAgo === 0) startedAt.setTime(Date.now() - 70 * 60_000);
    else startedAt.setUTCHours(12 + (plan.daysAgo % 4), 10 + plan.daysAgo * 3, 0, 0);
    const drafts = selectQuestions(plan.config, plan.config.questionCount, [], () => ((seed = (seed * 9301 + 49297) % 233280) / 233280));
    const questions: StoredQuestion[] = [];
    let total = 0;
    for (const [index, draft] of drafts.entries()) {
      seed++;
      const skipped = plan.quality < 0.3 && index === drafts.length - 1;
      const text = skipped ? "" : simulateAnswer(draft.referenceAnswer, Math.min(1, plan.quality + ((seed % 5) - 2) * 0.05), seed);
      const words = text.split(/\s+/).filter(Boolean).length;
      const durationSec = skipped ? 8 : Math.round((words / (130 + (seed % 30))) * 60);
      const metrics = analyzeAnswer(text, { durationSec, mode: "voice" });
      const stored: StoredQuestion = {
        id: randomUUID().slice(0, 8),
        text: draft.text,
        category: draft.category,
        kind: "core",
        difficulty: draft.difficulty,
        hint: draft.hint,
        keyPoints: draft.keyPoints,
        referenceAnswer: draft.referenceAnswer,
        answer: { text, durationSec, mode: "voice", skipped, submittedAt: new Date(startedAt.getTime() + total * 1000).toISOString() },
        metrics,
      };
      let evaluation: QuestionEvaluation;
      if (skipped) {
        evaluation = { status: "done", engine: "local", overall: 0, scores: { relevance: 0, depth: 0, structure: 0, clarity: 0, confidence: 0 }, summary: "Skipped.", strengths: [], improvements: [], missedPoints: draft.keyPoints, sampleAnswer: draft.referenceAnswer };
      } else {
        const result = await localEngine.evaluateAnswer({
          config: plan.config,
          question: { text: draft.text, category: draft.category, kind: "core", keyPoints: draft.keyPoints, referenceAnswer: draft.referenceAnswer },
          answer: { text, mode: "voice", durationSec },
          metrics,
        });
        evaluation = { status: "done", engine: "local", overall: weightedOverall(result.scores), ...result };
      }
      stored.evaluation = evaluation;
      total += durationSec + 20;
      questions.push(stored);
    }

    const role = getRole(plan.config.role);
    const session = {
      user: userId,
      title: `${role?.label ?? "Interview"} · ${INTERVIEW_TYPE_INFO[plan.config.type].label}`,
      config: plan.config,
      status: "completed" as const,
      questions,
      currentIndex: questions.length,
      engine: "local" as const,
      startedAt,
      completedAt: new Date(startedAt.getTime() + total * 1000),
      totalDurationSec: total,
    };
    const report = await buildSessionReport(session, { offline: true });
    await InterviewSessionModel.create({ ...session, report });
  }
}

/** Returns the demo user, creating it with realistic history on first use. */
export async function ensureDemoUser(): Promise<string> {
  const existing = await UserModel.findOne({ email: DEMO_EMAIL }).lean();
  if (existing) {
    const hasHistory = await InterviewSessionModel.exists({ user: existing._id });
    if (!hasHistory) await seedSessions(existing._id.toString());
    return existing._id.toString();
  }
  const user = await UserModel.create({
    name: "Demo Candidate",
    email: DEMO_EMAIL,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    targetRole: "software-engineer",
    level: "intern",
    isDemo: true,
  });
  await seedSessions(user._id.toString());
  return user._id.toString();
}

/** Clears and re-seeds demo history — used by `npm run seed`. */
export async function resetDemoUser(): Promise<string> {
  const existing = await UserModel.findOne({ email: DEMO_EMAIL }).lean();
  if (existing) await InterviewSessionModel.deleteMany({ user: existing._id });
  return ensureDemoUser();
}
