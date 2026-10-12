import type {
  AnswerMetrics,
  AnswerMode,
  DimensionScores,
  Difficulty,
  EngineKind,
  InterviewConfig,
  PracticePlanItem,
  QuestionKind,
} from "@poise/shared";

/** A question produced by an engine, before it is stored on a session. */
export interface DraftQuestion {
  text: string;
  category: string;
  difficulty: Difficulty;
  hint: string;
  keyPoints: string[];
  /** A concise reference answer — used for feedback and the offline engine. */
  referenceAnswer: string;
}

export interface QuestionContext {
  text: string;
  category: string;
  kind: QuestionKind;
  keyPoints: string[];
  referenceAnswer?: string;
}

export interface GenerateQuestionsInput {
  config: InterviewConfig;
  count: number;
  /** Recently asked question texts to steer away from. */
  avoid?: string[];
}

export interface EvaluateAnswerInput {
  config: Pick<InterviewConfig, "role" | "type" | "level" | "difficulty">;
  question: QuestionContext;
  answer: { text: string; mode: AnswerMode; durationSec: number };
  metrics: AnswerMetrics;
}

export interface AnswerEvaluation {
  scores: DimensionScores;
  summary: string;
  strengths: string[];
  improvements: string[];
  missedPoints: string[];
  sampleAnswer: string;
}

export interface FollowUpInput {
  config: InterviewConfig;
  question: QuestionContext;
  answer: string;
  metrics: AnswerMetrics;
  askedQuestions: string[];
}

export interface ReportItem {
  question: string;
  category: string;
  kind: QuestionKind;
  answer: string | null;
  skipped: boolean;
  overall: number | null;
  scores: DimensionScores | null;
  summary: string | null;
  missedPoints: string[];
}

export interface ReportInput {
  config: InterviewConfig;
  items: ReportItem[];
  overall: number;
  dimensions: DimensionScores;
  habits: {
    fillersPer100Words: number | null;
    averageWpm: number | null;
    averageAnswerWords: number | null;
    hedgesPer100Words: number | null;
  };
}

export interface ReportNarrative {
  headline: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  practicePlan: PracticePlanItem[];
}

export interface InterviewEngine {
  readonly kind: EngineKind;
  generateQuestions(input: GenerateQuestionsInput): Promise<DraftQuestion[]>;
  evaluateAnswer(input: EvaluateAnswerInput): Promise<AnswerEvaluation>;
  /** Returns null when no follow-up is warranted. */
  generateFollowUp(input: FollowUpInput): Promise<DraftQuestion | null>;
  generateReport(input: ReportInput): Promise<ReportNarrative>;
}
