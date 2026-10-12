import {
  analyzeAnswer,
  weightedOverall,
  type AnswerMetrics,
  type AnswerMode,
  type Difficulty,
  type EngineKind,
  type ExperienceLevel,
  type GeneratedQuestion,
  type InterviewType,
  type QuestionEvaluation,
  type RoleId,
} from "@poise/shared";
import { runEngine } from "../ai";

export interface PracticeQuestionRequest {
  role: RoleId;
  type: InterviewType;
  level: ExperienceLevel;
  difficulty: Difficulty;
  count: number;
  jobDescription?: string;
  focusAreas?: string[];
}

export async function generatePracticeQuestions(
  request: PracticeQuestionRequest,
): Promise<{ questions: GeneratedQuestion[]; engine: EngineKind }> {
  const { value, engine } = await runEngine("practice questions", (e) =>
    e.generateQuestions({
      config: {
        role: request.role,
        type: request.type,
        level: request.level,
        difficulty: request.difficulty,
        questionCount: request.count,
        answerMode: "text",
        adaptiveFollowUps: false,
        timePerQuestionSec: 0,
        jobDescription: request.jobDescription,
        focusAreas: request.focusAreas,
      },
      count: request.count,
    }),
  );
  return {
    engine,
    questions: value.map((q) => ({
      text: q.text,
      category: q.category,
      difficulty: q.difficulty,
      hint: q.hint,
      keyPoints: q.keyPoints,
      sampleAnswer: q.referenceAnswer,
    })),
  };
}

export interface PracticeEvaluationRequest {
  role: RoleId;
  type: InterviewType;
  level: ExperienceLevel;
  difficulty: Difficulty;
  question: { text: string; category: string; keyPoints: string[]; sampleAnswer?: string };
  answer: string;
  durationSec: number;
  mode: AnswerMode;
}

/** Instant feedback on a single practice answer (no session is created). */
export async function evaluatePracticeAnswer(
  request: PracticeEvaluationRequest,
): Promise<{ metrics: AnswerMetrics; evaluation: QuestionEvaluation }> {
  const metrics = analyzeAnswer(request.answer, { durationSec: request.durationSec, mode: request.mode });
  const { value, engine } = await runEngine("practice evaluation", (e) =>
    e.evaluateAnswer({
      config: { role: request.role, type: request.type, level: request.level, difficulty: request.difficulty },
      question: {
        text: request.question.text,
        category: request.question.category,
        kind: "core",
        keyPoints: request.question.keyPoints,
        referenceAnswer: request.question.sampleAnswer,
      },
      answer: { text: request.answer, mode: request.mode, durationSec: request.durationSec },
      metrics,
    }),
  );
  return {
    metrics,
    evaluation: {
      status: "done",
      engine,
      overall: weightedOverall(value.scores),
      ...value,
      sampleAnswer: value.sampleAnswer || request.question.sampleAnswer,
    },
  };
}
