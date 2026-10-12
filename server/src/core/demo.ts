import {
  INTERVIEW_TYPE_INFO,
  analyzeAnswer,
  getRole,
  weightedOverall,
  type InterviewConfig,
  type QuestionEvaluation,
} from "@poise/shared";
import type { InterviewEngine } from "../ai/types";
import { selectQuestions } from "../ai/local/select";
import type { StoredQuestion } from "../models/InterviewSession";
import { shortId } from "./ids";
import { assembleReport, reportInputFor } from "./report";
import type { SessionRecord } from "./session";

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

function cfg(role: InterviewConfig["role"], type: InterviewConfig["type"], difficulty: InterviewConfig["difficulty"], questionCount: number): InterviewConfig {
  return { role, type, level: "intern", difficulty, questionCount, answerMode: "voice", adaptiveFollowUps: false, timePerQuestionSec: 180 };
}

/** A week and a half of steadily improving practice. */
const DEMO_PLAN: { config: InterviewConfig; quality: number; daysAgo: number }[] = [
  { config: cfg("software-engineer", "behavioral", "easy", 4), quality: 0.25, daysAgo: 20 },
  { config: cfg("software-engineer", "technical", "easy", 5), quality: 0.4, daysAgo: 16 },
  { config: cfg("frontend", "mixed", "medium", 5), quality: 0.5, daysAgo: 11 },
  { config: cfg("fullstack", "technical", "medium", 5), quality: 0.62, daysAgo: 6 },
  { config: cfg("frontend", "technical", "medium", 4), quality: 0.72, daysAgo: 2 },
  { config: cfg("software-engineer", "mixed", "medium", 5), quality: 0.85, daysAgo: 1 },
  { config: cfg("backend", "system-design", "medium", 3), quality: 0.78, daysAgo: 0 },
];

export const DEMO_PROFILE = {
  name: "Demo Candidate",
  targetRole: "software-engineer",
  level: "intern",
} as const;

/**
 * Builds the demo account's completed interviews, evaluated and reported by
 * the given (offline) engine. Deterministic apart from question ids and
 * timestamps, which are relative to `now`.
 */
export async function buildDemoSessions(engine: InterviewEngine, now: Date = new Date()): Promise<SessionRecord[]> {
  const sessions: SessionRecord[] = [];
  let seed = 3;
  for (const plan of DEMO_PLAN) {
    // Spread sessions across realistic evening practice times.
    const startedAt = new Date(now.getTime() - plan.daysAgo * 86_400_000);
    if (plan.daysAgo === 0) startedAt.setTime(now.getTime() - 70 * 60_000);
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
      let evaluation: QuestionEvaluation;
      if (skipped) {
        evaluation = {
          status: "done",
          engine: "local",
          overall: 0,
          scores: { relevance: 0, depth: 0, structure: 0, clarity: 0, confidence: 0 },
          summary: "Skipped.",
          strengths: [],
          improvements: [],
          missedPoints: draft.keyPoints,
          sampleAnswer: draft.referenceAnswer,
        };
      } else {
        const result = await engine.evaluateAnswer({
          config: plan.config,
          question: { text: draft.text, category: draft.category, kind: "core", keyPoints: draft.keyPoints, referenceAnswer: draft.referenceAnswer },
          answer: { text, mode: "voice", durationSec },
          metrics,
        });
        evaluation = { status: "done", engine: "local", overall: weightedOverall(result.scores), ...result };
      }
      questions.push({
        id: shortId(),
        text: draft.text,
        category: draft.category,
        kind: "core",
        difficulty: draft.difficulty,
        hint: draft.hint,
        keyPoints: draft.keyPoints,
        referenceAnswer: draft.referenceAnswer,
        answer: { text, durationSec, mode: "voice", skipped, submittedAt: new Date(startedAt.getTime() + total * 1000).toISOString() },
        metrics,
        evaluation,
      });
      total += durationSec + 20;
    }

    const role = getRole(plan.config.role);
    const completedAt = new Date(startedAt.getTime() + total * 1000);
    const session: SessionRecord = {
      title: `${role?.label ?? "Interview"} · ${INTERVIEW_TYPE_INFO[plan.config.type].label}`,
      config: plan.config,
      status: "completed",
      questions,
      currentIndex: questions.length,
      engine: "local",
      startedAt,
      completedAt,
      totalDurationSec: total,
    };
    const input = reportInputFor(session);
    session.report = assembleReport(session, input, await engine.generateReport(input), "local", completedAt);
    sessions.push(session);
  }
  return sessions;
}
