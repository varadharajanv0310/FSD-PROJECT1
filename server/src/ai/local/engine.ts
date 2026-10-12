import { LIMITS } from "@poise/shared";
import type {
  AnswerEvaluation,
  DraftQuestion,
  EvaluateAnswerInput,
  FollowUpInput,
  GenerateQuestionsInput,
  InterviewEngine,
  QuestionContext,
  ReportInput,
  ReportNarrative,
} from "../types";
import { findBankQuestion, type BankPoint } from "./bank";
import { buildFeedback } from "./feedback";
import { chooseFollowUp, followUpPoints } from "./followups";
import { buildReport } from "./report";
import { scoreAnswer } from "./scoring";
import { selectQuestions } from "./select";

const BEHAVIORAL_CATEGORIES = new Set([
  "introduction",
  "problem solving",
  "teamwork",
  "growth",
  "leadership",
  "resilience",
  "learning",
  "motivation",
  "self-awareness",
  "ownership",
  "user focus",
  "achievement",
  "prioritisation",
  "stakeholders",
  "collaboration",
  "integrity",
  "role fit",
]);

export function isBehavioral(question: QuestionContext): boolean {
  const bank = findBankQuestion(question.text);
  if (bank) return bank.type === "behavioral";
  const category = question.category.toLowerCase();
  return BEHAVIORAL_CATEGORIES.has(category) || category.startsWith("behavioral") || /tell me about a time|describe a time|give me an example of a time/i.test(question.text);
}

/** Key points with match terms — from the bank when available, derived otherwise. */
function pointsFor(question: QuestionContext): BankPoint[] {
  const bank = findBankQuestion(question.text);
  if (bank) return bank.points;
  return followUpPoints(question.text) ?? question.keyPoints.map((point) => ({ point, terms: [] }));
}

/**
 * The offline engine: a curated question bank plus a transparent,
 * rubric-based evaluator. It needs no network access or API key, and is
 * also the automatic fallback whenever the AI engine is unavailable.
 */
export class LocalEngine implements InterviewEngine {
  readonly kind = "local" as const;

  async generateQuestions(input: GenerateQuestionsInput): Promise<DraftQuestion[]> {
    const count = Math.min(Math.max(input.count, 1), LIMITS.maxQuestions);
    return selectQuestions(input.config, count, input.avoid);
  }

  async evaluateAnswer(input: EvaluateAnswerInput): Promise<AnswerEvaluation> {
    const behavioral = isBehavioral(input.question);
    const scoring = scoreAnswer({
      question: input.question.text,
      answer: input.answer.text,
      metrics: input.metrics,
      points: pointsFor(input.question),
      behavioral,
    });
    return buildFeedback({
      scoring,
      metrics: input.metrics,
      behavioral,
      referenceAnswer: input.question.referenceAnswer ?? findBankQuestion(input.question.text)?.answer,
    });
  }

  async generateFollowUp(input: FollowUpInput): Promise<DraftQuestion | null> {
    const behavioral = isBehavioral(input.question);
    const scoring = scoreAnswer({
      question: input.question.text,
      answer: input.answer,
      metrics: input.metrics,
      points: pointsFor(input.question),
      behavioral,
    });
    const followUp = chooseFollowUp(input.question, input.metrics, scoring, behavioral);
    if (!followUp) return null;
    const asked = new Set(input.askedQuestions.map((text) => text.toLowerCase()));
    return asked.has(followUp.text.toLowerCase()) ? null : followUp;
  }

  async generateReport(input: ReportInput): Promise<ReportNarrative> {
    return buildReport(input);
  }
}
