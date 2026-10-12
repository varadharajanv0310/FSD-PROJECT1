import Anthropic from "@anthropic-ai/sdk";
import type { EngineKind, EngineStatus } from "@poise/shared";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { ClaudeEngine, ClaudeRefusalError } from "./claude";
import { LocalEngine } from "./local/engine";
import type { InterviewEngine } from "./types";

export type * from "./types";

const local = new LocalEngine();

function createClaudeEngine(): ClaudeEngine | null {
  if (env.AI_PROVIDER === "local") return null;
  const hasCredentials = Boolean(env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  // "auto" uses Claude only when credentials are configured; "claude" always
  // tries it (credentials may come from an `ant auth login` profile).
  if (env.AI_PROVIDER === "auto" && !hasCredentials) return null;
  return new ClaudeEngine(env.ANTHROPIC_MODEL, env.ANTHROPIC_API_KEY);
}

const claude = env.isTest ? null : createClaudeEngine();

const MODEL_LABELS: Record<string, string> = {
  "claude-opus-5-5": "Claude Opus 5.5",
  "claude-sonnet-5-5": "Claude Sonnet 5.5",
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "claude-fable-5-1": "Claude Fable 5.1",
};

export function engineStatus(): EngineStatus {
  if (claude) {
    return { provider: "claude", model: claude.model, label: MODEL_LABELS[claude.model] ?? claude.model };
  }
  return { provider: "local", model: null, label: "Offline engine" };
}

function describeError(error: unknown): string {
  if (error instanceof ClaudeRefusalError) return error.message;
  if (error instanceof Anthropic.AuthenticationError) return "authentication failed — check ANTHROPIC_API_KEY";
  if (error instanceof Anthropic.RateLimitError) return "rate limited";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "request timed out";
  if (error instanceof Anthropic.APIConnectionError) return "could not reach the API";
  if (error instanceof Anthropic.APIError) return `API error ${error.status ?? ""}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs an engine operation on Claude when it's configured, falling back to the
 * offline engine on any failure, so a flaky network or missing key never
 * blocks a candidate mid-interview. Reports which engine actually answered.
 */
export async function runEngine<T>(
  operation: string,
  task: (engine: InterviewEngine) => Promise<T>,
): Promise<{ value: T; engine: EngineKind }> {
  if (claude) {
    try {
      return { value: await task(claude), engine: "claude" };
    } catch (error) {
      logger.warn(`Claude ${operation} failed (${describeError(error)}); using the offline engine instead.`);
    }
  }
  return { value: await task(local), engine: "local" };
}

export { local as localEngine };
