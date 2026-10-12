import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { DIFFICULTIES, type Difficulty } from "@poise/shared";
import { evaluationPrompt, followUpPrompt, questionsPrompt, reportPrompt, SYSTEM_PROMPT } from "./prompts";
import type {
  AnswerEvaluation,
  DraftQuestion,
  EvaluateAnswerInput,
  FollowUpInput,
  GenerateQuestionsInput,
  InterviewEngine,
  ReportInput,
  ReportNarrative,
} from "./types";

// Schemas avoid numeric/length constraints (not all are supported by
// structured outputs); values are clamped and trimmed after parsing instead.
const QuestionSchema = z.object({
  text: z.string(),
  category: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  hint: z.string(),
  keyPoints: z.array(z.string()),
  referenceAnswer: z.string(),
});

const QuestionsSchema = z.object({ questions: z.array(QuestionSchema) });

const EvaluationSchema = z.object({
  scores: z.object({
    relevance: z.number(),
    depth: z.number(),
    structure: z.number(),
    clarity: z.number(),
    confidence: z.number(),
  }),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  missedPoints: z.array(z.string()),
  sampleAnswer: z.string(),
});

const FollowUpSchema = z.object({ shouldAsk: z.boolean(), question: QuestionSchema });

const ReportSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  practicePlan: z.array(z.object({ title: z.string(), detail: z.string() })),
});

type Effort = "low" | "medium" | "high";

export class ClaudeRefusalError extends Error {
  constructor(category: string | null | undefined) {
    super(`Claude declined the request${category ? ` (${category})` : ""}.`);
    this.name = "ClaudeRefusalError";
  }
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const cleanList = (items: string[], limit: number) =>
  items.map((item) => item.trim()).filter(Boolean).slice(0, limit);

function cleanQuestion(question: z.infer<typeof QuestionSchema>, fallbackDifficulty: Difficulty): DraftQuestion {
  return {
    text: question.text.trim(),
    category: question.category.trim().slice(0, 40) || "General",
    difficulty: DIFFICULTIES.includes(question.difficulty) ? question.difficulty : fallbackDifficulty,
    hint: question.hint.trim(),
    keyPoints: cleanList(question.keyPoints, 6),
    referenceAnswer: question.referenceAnswer.trim(),
  };
}

/**
 * Interview engine backed by Claude. Every call uses structured outputs so
 * responses are schema-validated JSON, and the shared system prompt (with
 * the scoring rubric) is marked for prompt caching.
 */
export class ClaudeEngine implements InterviewEngine {
  readonly kind = "claude" as const;
  private readonly client: Anthropic;

  constructor(
    readonly model: string,
    apiKey?: string,
  ) {
    this.client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
  }

  private async call<T extends z.ZodType>(
    schema: T,
    prompt: string,
    options: { effort: Effort; maxTokens?: number; timeoutMs?: number },
  ): Promise<z.infer<T>> {
    const response = await this.client.beta.messages.parse(
      {
        model: this.model,
        max_tokens: options.maxTokens ?? 16000,
        // If a safety classifier declines, retry server-side on Anthropic's
        // recommended fallback model instead of failing the request.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: options.effort, format: betaZodOutputFormat(schema) },
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
      },
      options.timeoutMs ? { timeout: options.timeoutMs } : undefined,
    );

    if (response.stop_reason === "refusal") throw new ClaudeRefusalError(response.stop_details?.category);
    if (response.stop_reason === "max_tokens") throw new Error("Claude's response was cut off (max_tokens).");
    if (!response.parsed_output) throw new Error("Claude returned no parseable output.");
    return response.parsed_output as z.infer<T>;
  }

  async generateQuestions(input: GenerateQuestionsInput): Promise<DraftQuestion[]> {
    const result = await this.call(QuestionsSchema, questionsPrompt(input), { effort: "medium" });
    return result.questions
      .map((question) => cleanQuestion(question, input.config.difficulty))
      .filter((question) => question.text.length > 0)
      .slice(0, input.count);
  }

  async evaluateAnswer(input: EvaluateAnswerInput): Promise<AnswerEvaluation> {
    const result = await this.call(EvaluationSchema, evaluationPrompt(input), { effort: "medium" });
    return {
      scores: {
        relevance: clampScore(result.scores.relevance),
        depth: clampScore(result.scores.depth),
        structure: clampScore(result.scores.structure),
        clarity: clampScore(result.scores.clarity),
        confidence: clampScore(result.scores.confidence),
      },
      summary: result.summary.trim(),
      strengths: cleanList(result.strengths, 3),
      improvements: cleanList(result.improvements, 3),
      missedPoints: cleanList(result.missedPoints, 5),
      sampleAnswer: result.sampleAnswer.trim(),
    };
  }

  async generateFollowUp(input: FollowUpInput): Promise<DraftQuestion | null> {
    // The candidate is waiting in the room, so favour latency here.
    const result = await this.call(FollowUpSchema, followUpPrompt(input), {
      effort: "low",
      maxTokens: 4000,
      timeoutMs: 45_000,
    });
    if (!result.shouldAsk || !result.question.text.trim()) return null;
    return cleanQuestion(result.question, input.config.difficulty);
  }

  async generateReport(input: ReportInput): Promise<ReportNarrative> {
    const result = await this.call(ReportSchema, reportPrompt(input), { effort: "medium" });
    return {
      headline: result.headline.trim(),
      summary: result.summary.trim(),
      strengths: cleanList(result.strengths, 3),
      improvements: cleanList(result.improvements, 3),
      practicePlan: result.practicePlan
        .map((item) => ({ title: item.title.trim(), detail: item.detail.trim() }))
        .filter((item) => item.title && item.detail)
        .slice(0, 3),
    };
  }
}
