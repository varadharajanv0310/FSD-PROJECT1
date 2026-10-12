import { Schema, Types, model, type HydratedDocument } from "mongoose";
import {
  ANSWER_MODES,
  DIFFICULTIES,
  INTERVIEW_TYPES,
  LEVELS,
  ROLE_IDS,
  type AnswerMetrics,
  type CandidateAnswer,
  type InterviewConfig,
  type QuestionEvaluation,
  type QuestionKind,
  type SessionReport,
  type SessionStatus,
  type EngineKind,
  type Difficulty,
} from "@poise/shared";

/**
 * A question as stored. It carries a few server-only fields (the reference
 * answer used by the offline engine) that are never sent to the client
 * before the candidate has answered.
 */
export interface StoredQuestion {
  id: string;
  text: string;
  category: string;
  kind: QuestionKind;
  parentId?: string;
  difficulty: Difficulty;
  hint?: string;
  keyPoints: string[];
  referenceAnswer?: string;
  answer?: CandidateAnswer;
  metrics?: AnswerMetrics;
  evaluation?: QuestionEvaluation;
}

export interface StoredSession {
  user: Types.ObjectId;
  title: string;
  config: InterviewConfig;
  status: SessionStatus;
  questions: StoredQuestion[];
  currentIndex: number;
  report?: SessionReport;
  engine: EngineKind;
  startedAt: Date;
  completedAt?: Date;
  totalDurationSec: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConfigSchema = new Schema<InterviewConfig>(
  {
    role: { type: String, enum: ROLE_IDS, required: true },
    type: { type: String, enum: INTERVIEW_TYPES, required: true },
    level: { type: String, enum: LEVELS, required: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    questionCount: { type: Number, required: true },
    answerMode: { type: String, enum: ANSWER_MODES, required: true },
    adaptiveFollowUps: { type: Boolean, default: true },
    timePerQuestionSec: { type: Number, default: 0 },
    jobDescription: { type: String },
    focusAreas: { type: [String], default: undefined },
    companyName: { type: String },
  },
  { _id: false },
);

const QuestionSchema = new Schema<StoredQuestion>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    category: { type: String, required: true },
    kind: { type: String, enum: ["core", "follow-up"], default: "core" },
    parentId: { type: String },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    hint: { type: String },
    keyPoints: { type: [String], default: [] },
    referenceAnswer: { type: String },
    answer: { type: Schema.Types.Mixed },
    metrics: { type: Schema.Types.Mixed },
    evaluation: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const InterviewSessionSchema = new Schema<StoredSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    config: { type: ConfigSchema, required: true },
    status: { type: String, enum: ["in_progress", "evaluating", "completed"], default: "in_progress" },
    questions: { type: [QuestionSchema], default: [] },
    currentIndex: { type: Number, default: 0 },
    report: { type: Schema.Types.Mixed },
    engine: { type: String, enum: ["claude", "local"], required: true },
    startedAt: { type: Date, default: () => new Date() },
    completedAt: { type: Date },
    totalDurationSec: { type: Number, default: 0 },
  },
  { timestamps: true },
);

InterviewSessionSchema.index({ user: 1, createdAt: -1 });

export type InterviewSessionDocument = HydratedDocument<StoredSession>;
export const InterviewSessionModel = model<StoredSession>("InterviewSession", InterviewSessionSchema);
