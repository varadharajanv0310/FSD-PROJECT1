import { z } from "zod";
import {
  ANSWER_MODES,
  DIFFICULTIES,
  INTERVIEW_TYPES,
  LEVELS,
  LIMITS,
  ROLE_IDS,
  getRole,
} from "@poise/shared";

const trimmed = (max: number) => z.string().trim().max(max);

export const RegisterSchema = z.object({
  name: trimmed(80).min(1, "Please tell us your name."),
  email: z.email("Enter a valid email address.").max(160),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export const LoginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const GuestSchema = z.object({
  device: z
    .object({
      id: z.string().regex(/^[a-f\d]{24}$/i),
      key: z.string().regex(/^[a-f\d]{64}$/i),
    })
    .optional(),
});

export const ProfileSchema = z.object({
  // May be empty: browser profiles don't need a name.
  name: trimmed(80).optional(),
  targetRole: z.enum(ROLE_IDS).nullable().optional(),
  level: z.enum(LEVELS).nullable().optional(),
  preferences: z
    .object({
      autoReadQuestions: z.boolean(),
      voiceRate: z.number().min(0.6).max(1.6),
      showLiveMetrics: z.boolean(),
      cameraByDefault: z.boolean(),
    })
    .partial()
    .optional(),
});

export const PasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, "Use at least 8 characters.").max(200),
});

const focusAreas = z.array(trimmed(40).min(1)).max(6).optional();

export const InterviewConfigSchema = z
  .object({
    role: z.enum(ROLE_IDS),
    type: z.enum(INTERVIEW_TYPES),
    level: z.enum(LEVELS),
    difficulty: z.enum(DIFFICULTIES),
    questionCount: z.number().int().min(LIMITS.minQuestions).max(LIMITS.maxQuestions),
    answerMode: z.enum(ANSWER_MODES),
    adaptiveFollowUps: z.boolean().default(true),
    timePerQuestionSec: z
      .number()
      .int()
      .refine(
        (value) => value === 0 || (value >= LIMITS.minTimePerQuestionSec && value <= LIMITS.maxTimePerQuestionSec),
        "Choose between 1 and 10 minutes per question, or untimed.",
      )
      .default(0),
    jobDescription: trimmed(LIMITS.maxJobDescriptionChars).optional(),
    focusAreas,
    companyName: trimmed(80).optional(),
  })
  .transform((config) => ({
    ...config,
    jobDescription: config.jobDescription || undefined,
    companyName: config.companyName || undefined,
    focusAreas: config.focusAreas?.length ? config.focusAreas : undefined,
  }))
  .refine((config) => config.type !== "system-design" || getRole(config.role)?.systemDesign, {
    message: "System design rounds are available for engineering roles only.",
    path: ["type"],
  });

export const AnswerSchema = z
  .object({
    questionId: z.string().min(1).max(40),
    text: z.string().max(LIMITS.maxAnswerChars).default(""),
    durationSec: z.number().min(0).max(3600).default(0),
    mode: z.enum(ANSWER_MODES),
    skipped: z.boolean().default(false),
  });

export const PracticeQuestionsSchema = z.object({
  role: z.enum(ROLE_IDS),
  type: z.enum(INTERVIEW_TYPES),
  level: z.enum(LEVELS),
  difficulty: z.enum(DIFFICULTIES),
  count: z.number().int().min(1).max(8).default(5),
  jobDescription: trimmed(LIMITS.maxJobDescriptionChars).optional(),
  focusAreas,
});

const QuestionPayload = z.object({
  text: trimmed(600).min(1),
  category: trimmed(80).min(1),
  difficulty: z.enum(DIFFICULTIES).default("medium"),
  hint: trimmed(600).default(""),
  keyPoints: z.array(trimmed(300)).max(8).default([]),
  sampleAnswer: trimmed(4000).optional(),
});

export const PracticeEvaluateSchema = z.object({
  role: z.enum(ROLE_IDS),
  type: z.enum(INTERVIEW_TYPES),
  level: z.enum(LEVELS),
  difficulty: z.enum(DIFFICULTIES),
  question: QuestionPayload,
  answer: z.string().trim().min(1, "Write or speak an answer first.").max(LIMITS.maxAnswerChars),
  durationSec: z.number().min(0).max(3600).default(0),
  mode: z.enum(ANSWER_MODES).default("text"),
});

export const SaveQuestionSchema = QuestionPayload.extend({
  role: z.enum(ROLE_IDS),
  type: z.enum(INTERVIEW_TYPES),
});
