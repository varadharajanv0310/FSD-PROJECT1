import {
  DIMENSIONS,
  DIMENSION_INFO,
  INTERVIEW_TYPE_INFO,
  scoreBand,
  type DimensionKey,
  type PracticePlanItem,
} from "@poise/shared";
import type { ReportInput, ReportNarrative } from "../types";

const DRILLS: Record<DimensionKey, PracticePlanItem> = {
  relevance: {
    title: "Answer the question first",
    detail: "For your next five practice answers, make your first sentence a direct answer that reuses words from the question. Context comes second.",
  },
  depth: {
    title: "Build an example bank",
    detail: "Write down three projects with one number each (users, %, time saved). Practise weaving one into every answer until it's automatic.",
  },
  structure: {
    title: "Drill the STAR skeleton",
    detail: "Outline two stories as four bullet points — Situation, Task, Action, Result — then answer them aloud in under two minutes each.",
  },
  clarity: {
    title: "One idea per sentence",
    detail: "Record a 90-second answer, transcribe it, and split every sentence longer than 20 words. Re-record the tighter version.",
  },
  confidence: {
    title: "Trade fillers for pauses",
    detail: "Answer three questions aloud while deliberately pausing instead of saying “um” or “like”. Silence feels long to you but sounds composed.",
  },
};

const STRENGTH_PHRASES: Record<DimensionKey, string> = {
  relevance: "You consistently answered the question that was asked.",
  depth: "Your answers showed real substance, with specifics and examples.",
  structure: "Your answers were well organised and easy to follow.",
  clarity: "You expressed ideas clearly and concisely.",
  confidence: "You came across as composed and decisive.",
};

const HEADLINES: Record<string, string> = {
  excellent: "You're interview-ready — keep the edge sharp.",
  good: "A strong performance with a few clear upgrades.",
  fair: "Promising foundations — a few habits will lift you fast.",
  weak: "Good effort. Focused practice will move the needle quickly.",
  low: "Every expert started here. Let's build your foundations.",
};

/** Writes the session narrative from aggregate scores — no AI required. */
export function buildReport(input: ReportInput): ReportNarrative {
  const answered = input.items.filter((item) => !item.skipped && item.answer);
  const skipped = input.items.filter((item) => item.skipped).length;
  const ranked = [...DIMENSIONS].sort((a, b) => input.dimensions[b] - input.dimensions[a]);
  const best = ranked[0]!;
  const second = ranked[1]!;
  const weakest = ranked[ranked.length - 1]!;
  const secondWeakest = ranked[ranked.length - 2]!;
  const band = scoreBand(input.overall);

  const sentences: string[] = [];
  sentences.push(
    `Across ${answered.length} answered question${answered.length === 1 ? "" : "s"} you averaged ${input.overall}/100 — ${band.label.toLowerCase()} territory for a ${INTERVIEW_TYPE_INFO[input.config.type].label.toLowerCase()} round.`,
  );
  sentences.push(
    `Your strongest dimension was ${DIMENSION_INFO[best].label.toLowerCase()} (${input.dimensions[best]}), while ${DIMENSION_INFO[weakest].label.toLowerCase()} (${input.dimensions[weakest]}) has the most room to grow.`,
  );
  const { fillersPer100Words, averageWpm } = input.habits;
  if (fillersPer100Words !== null && fillersPer100Words > 2) {
    sentences.push(`Filler words came up about ${fillersPer100Words.toFixed(1)} times per 100 words — worth a focused drill.`);
  } else if (averageWpm !== null && (averageWpm > 175 || averageWpm < 105)) {
    sentences.push(`Your speaking pace averaged ${averageWpm} words per minute; aim for 130–160.`);
  }
  if (skipped > 0) sentences.push(`You skipped ${skipped} question${skipped === 1 ? "" : "s"} — attempt every question next time, even partially.`);

  const strengths = [STRENGTH_PHRASES[best]];
  if (input.dimensions[second] >= 60) strengths.push(STRENGTH_PHRASES[second]);
  const strongest = [...answered].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0];
  if (strongest && (strongest.overall ?? 0) >= 65) {
    strengths.push(`Your best answer was on “${truncate(strongest.question, 70)}” (${strongest.overall}/100) — use it as a model.`);
  }

  const improvements = [DIMENSION_INFO[weakest].tip];
  if (input.dimensions[secondWeakest] < 70) improvements.push(DIMENSION_INFO[secondWeakest].tip);
  const missed = input.items.flatMap((item) => item.missedPoints);
  if (missed.length >= 3) improvements.push(`Revisit the key points you missed — there were ${missed.length} across the session.`);

  const plan: PracticePlanItem[] = [DRILLS[weakest], DRILLS[secondWeakest]];
  const weakestAnswer = [...input.items].filter((item) => item.overall !== null).sort((a, b) => (a.overall ?? 0) - (b.overall ?? 0))[0];
  if (weakestAnswer) {
    plan.push({
      title: "Redo your toughest question",
      detail: `Re-answer “${truncate(weakestAnswer.question, 90)}” using the sample answer as a guide, then compare your score.`,
    });
  }

  return {
    headline: HEADLINES[band.tone] ?? HEADLINES.fair!,
    summary: sentences.join(" "),
    strengths,
    improvements,
    practicePlan: plan,
  };
}

function truncate(text: string, length: number): string {
  return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`;
}
