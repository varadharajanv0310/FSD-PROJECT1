import type {
  AnswerMode,
  DimensionKey,
  Difficulty,
  ExperienceLevel,
  InterviewType,
  RoleId,
} from "./catalog";

/** Which engine produced a piece of content. */
export type EngineKind = "claude" | "local";

export type DimensionScores = Record<DimensionKey, number>;

export interface InterviewConfig {
  role: RoleId;
  type: InterviewType;
  level: ExperienceLevel;
  difficulty: Difficulty;
  questionCount: number;
  answerMode: AnswerMode;
  adaptiveFollowUps: boolean;
  /** 0 means untimed. */
  timePerQuestionSec: number;
  jobDescription?: string;
  focusAreas?: string[];
  companyName?: string;
}

export interface StarCoverage {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

export interface AnswerMetrics {
  wordCount: number;
  durationSec: number;
  /** Words per minute — only meaningful for spoken answers. */
  wpm: number | null;
  fillerCount: number;
  fillerWords: Record<string, number>;
  hedgeCount: number;
  hedgeWords: Record<string, number>;
  sentenceCount: number;
  avgSentenceLength: number;
  star: StarCoverage;
  hasNumbers: boolean;
  hasExample: boolean;
}

export type EvaluationStatus = "pending" | "done" | "failed";

export interface QuestionEvaluation {
  status: EvaluationStatus;
  engine?: EngineKind;
  scores?: DimensionScores;
  overall?: number;
  /** One or two sentence verdict. */
  summary?: string;
  strengths: string[];
  improvements: string[];
  missedPoints: string[];
  /** A stronger version of the answer, written in first person. */
  sampleAnswer?: string;
  error?: string;
}

export interface CandidateAnswer {
  text: string;
  durationSec: number;
  mode: AnswerMode;
  skipped: boolean;
  submittedAt: string;
}

export type QuestionKind = "core" | "follow-up";

export interface InterviewQuestion {
  id: string;
  text: string;
  category: string;
  kind: QuestionKind;
  parentId?: string;
  difficulty: Difficulty;
  /** Optional nudge the candidate can reveal while answering. */
  hint?: string;
  /** Points a strong answer covers — revealed after answering. */
  keyPoints?: string[];
  answer?: CandidateAnswer;
  metrics?: AnswerMetrics;
  evaluation?: QuestionEvaluation;
}

export interface PracticePlanItem {
  title: string;
  detail: string;
}

export interface SessionReport {
  overall: number;
  band: string;
  dimensions: DimensionScores;
  headline: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  practicePlan: PracticePlanItem[];
  answeredCount: number;
  skippedCount: number;
  unansweredCount: number;
  engine: EngineKind;
  generatedAt: string;
}

export type SessionStatus = "in_progress" | "evaluating" | "completed";

export interface InterviewSession {
  id: string;
  title: string;
  config: InterviewConfig;
  status: SessionStatus;
  questions: InterviewQuestion[];
  currentIndex: number;
  report?: SessionReport;
  engine: EngineKind;
  startedAt: string;
  completedAt?: string;
  totalDurationSec: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  role: RoleId;
  type: InterviewType;
  level: ExperienceLevel;
  difficulty: Difficulty;
  status: SessionStatus;
  overall: number | null;
  band: string | null;
  questionCount: number;
  answeredCount: number;
  startedAt: string;
  completedAt?: string;
  totalDurationSec: number;
  engine: EngineKind;
}

export interface UserPreferences {
  autoReadQuestions: boolean;
  voiceRate: number;
  showLiveMetrics: boolean;
  cameraByDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  targetRole?: RoleId;
  level?: ExperienceLevel;
  isDemo: boolean;
  preferences: UserPreferences;
  createdAt: string;
}

export interface DashboardStats {
  totals: {
    sessions: number;
    completed: number;
    questionsAnswered: number;
    practiceMinutes: number;
    averageScore: number | null;
    bestScore: number | null;
    streakDays: number;
  };
  dimensions: DimensionScores | null;
  trend: { id: string; date: string; score: number; role: RoleId; title: string }[];
  byRole: { role: RoleId; sessions: number; averageScore: number | null }[];
  habits: {
    fillersPer100Words: number | null;
    averageWpm: number | null;
    averageAnswerWords: number | null;
  };
  focus: { dimension: DimensionKey; score: number; tip: string } | null;
  recent: SessionSummary[];
  inProgress: SessionSummary | null;
}

export interface GeneratedQuestion {
  text: string;
  category: string;
  difficulty: Difficulty;
  hint: string;
  keyPoints: string[];
  sampleAnswer?: string;
}

export interface SavedQuestion extends GeneratedQuestion {
  id: string;
  role: RoleId;
  type: InterviewType;
  createdAt: string;
}

export interface EngineStatus {
  provider: EngineKind;
  model: string | null;
  label: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
