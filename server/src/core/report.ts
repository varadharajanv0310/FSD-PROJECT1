import { DIMENSIONS, scoreBand, type DimensionScores, type EngineKind, type SessionReport } from "@poise/shared";
import type { ReportInput, ReportItem, ReportNarrative } from "../ai/types";
import type { SessionRecord } from "./session";

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

const round1 = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

/** Aggregates per-answer scores and delivery habits into the engine's report input. */
export function reportInputFor(session: Pick<SessionRecord, "questions" | "config">): ReportInput {
  const scored = session.questions.filter((q) => q.answer && q.evaluation?.status === "done" && q.evaluation.scores);
  const spoken = session.questions.filter((q) => q.answer && !q.answer.skipped && q.metrics);

  const dimensions = Object.fromEntries(
    DIMENSIONS.map((key) => [key, Math.round(mean(scored.map((q) => q.evaluation!.scores![key])) ?? 0)]),
  ) as DimensionScores;
  const overall = Math.round(mean(scored.map((q) => q.evaluation!.overall ?? 0)) ?? 0);

  const totalWords = spoken.reduce((sum, q) => sum + q.metrics!.wordCount, 0);
  const totalFillers = spoken.reduce((sum, q) => sum + q.metrics!.fillerCount, 0);
  const totalHedges = spoken.reduce((sum, q) => sum + q.metrics!.hedgeCount, 0);
  const wpms = spoken.map((q) => q.metrics!.wpm).filter((w): w is number => w !== null);

  const items: ReportItem[] = session.questions
    .filter((q) => q.answer)
    .map((q) => ({
      question: q.text,
      category: q.category,
      kind: q.kind,
      answer: q.answer!.skipped ? null : q.answer!.text,
      skipped: q.answer!.skipped,
      overall: q.evaluation?.overall ?? null,
      scores: q.evaluation?.scores ?? null,
      summary: q.evaluation?.summary ?? null,
      missedPoints: q.evaluation?.missedPoints ?? [],
    }));

  return {
    config: session.config,
    items,
    overall,
    dimensions,
    habits: {
      fillersPer100Words: totalWords > 0 ? round1((totalFillers / totalWords) * 100) : null,
      hedgesPer100Words: totalWords > 0 ? round1((totalHedges / totalWords) * 100) : null,
      averageWpm: wpms.length > 0 ? Math.round(mean(wpms)!) : null,
      averageAnswerWords: spoken.length > 0 ? Math.round(totalWords / spoken.length) : null,
    },
  };
}

/** Combines the computed scores with the engine's narrative into the stored report. */
export function assembleReport(
  session: Pick<SessionRecord, "questions">,
  input: ReportInput,
  narrative: ReportNarrative,
  engine: EngineKind,
  generatedAt: Date = new Date(),
): SessionReport {
  return {
    overall: input.overall,
    band: scoreBand(input.overall).label,
    dimensions: input.dimensions,
    ...narrative,
    answeredCount: session.questions.filter((q) => q.answer && !q.answer.skipped).length,
    skippedCount: session.questions.filter((q) => q.answer?.skipped).length,
    unansweredCount: session.questions.filter((q) => !q.answer).length,
    engine,
    generatedAt: generatedAt.toISOString(),
  };
}
