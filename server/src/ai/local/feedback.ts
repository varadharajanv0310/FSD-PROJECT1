import { DIMENSIONS, DIMENSION_INFO, weightedOverall, type AnswerMetrics, type DimensionKey } from "@poise/shared";
import type { AnswerEvaluation } from "../types";
import type { ScoringResult } from "./scoring";

interface Note {
  weight: number;
  text: string;
}

function topEntries(record: Record<string, number>, limit = 3): string {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => `“${word}” ×${count}`)
    .join(", ");
}

const LEADING_VERBS = new Set(
  (
    "describes explains mentions shows names sets uses gives defines makes offers grounds closes opens highlights " +
    "connects takes reflects identifies proposes focuses recognises recognizes separates considers checks measures " +
    "reduces removes avoids prevents handles includes states starts forms segments tests validates quantifies ties " +
    "maintains anchors keeps prefers picks chooses discusses clarifies compares notes adds applies builds writes " +
    "supports involves scopes tracks decouples treats detects asks recruits synthesises synthesizes provides " +
    "produces returns runs sends stores secures weighs frames prioritises prioritizes profiles standardises " +
    "standardizes explores interprets moves releases"
  ).split(" "),
);

const GERUND_EXCEPTIONS: Record<string, string> = { sets: "setting", ties: "tying", runs: "running" };

/** "explains" → "explaining", "identifies" → "identifying", "uses" → "using". */
function toGerund(verb: string): string {
  const lower = verb.toLowerCase();
  if (GERUND_EXCEPTIONS[lower]) return GERUND_EXCEPTIONS[lower];
  if (lower.endsWith("ies")) return `${lower.slice(0, -3)}ying`;
  let stem = lower.endsWith("s") ? lower.slice(0, -1) : lower;
  if (stem.endsWith("e") && !stem.endsWith("ee")) stem = stem.slice(0, -1);
  return `${stem}ing`;
}

function secondPerson(text: string): string {
  return text
    .replace(/\bthemselves\b/gi, "yourself")
    .replace(/\bthey'd\b/gi, "you'd")
    .replace(/\bthey're\b/gi, "you're")
    .replace(/\bthey\b/gi, "you")
    .replace(/\btheir\b/gi, "your")
    .replace(/\bthem\b/gi, "you");
}

/**
 * Turns a key point written about the candidate ("Explains the actions they
 * took") into a phrase addressed to them ("explaining the actions you took").
 * Points that aren't verb-led are quoted as-is.
 */
export function asPhrase(point: string): string {
  const words = point.trim().split(/\s+/);
  if (words.length > 1 && LEADING_VERBS.has(words[0]!.toLowerCase())) {
    return secondPerson([toGerund(words[0]!), ...words.slice(1)].join(" "));
  }
  return `“${point.trim()}”`;
}

const STAR_LABELS = { situation: "the situation", task: "your specific task", action: "the actions you took", result: "the result" } as const;

export interface FeedbackInput {
  scoring: ScoringResult;
  metrics: AnswerMetrics;
  behavioral: boolean;
  referenceAnswer?: string;
}

/** Converts scoring evidence into specific, human feedback. */
export function buildFeedback({ scoring, metrics, behavioral, referenceAnswer }: FeedbackInput): AnswerEvaluation {
  const { scores, match, signals } = scoring;
  const words = metrics.wordCount;
  const strengths: Note[] = [];
  const improvements: Note[] = [];

  // ── Content ──
  if (match.covered.length > 0 && match.coverage >= 0.6) {
    strengths.push({
      weight: 10,
      text: `You covered the essentials, including ${match.covered.slice(0, 2).map(asPhrase).join(" and ")}.`,
    });
  } else if (match.covered.length > 0) {
    strengths.push({ weight: 4, text: `Good start — you touched on ${asPhrase(match.covered[0]!)}.` });
  }
  if (match.missed.length > 0 && words > 0) {
    const missing = match.missed.slice(0, 2).map(asPhrase).join(", and ");
    improvements.push({ weight: 9 + match.missed.length, text: `Interviewers would also listen for ${missing}.` });
  }

  // ── Length ──
  if (words > 0 && words < 40) {
    improvements.push({
      weight: 12,
      text: `At ${words} words the answer was too brief to show depth. Aim for roughly 90–180 words: answer directly, explain why, then give an example.`,
    });
  } else if (words > 330) {
    improvements.push({
      weight: 7,
      text: `At ${words} words the answer risked losing the interviewer. Lead with your headline, then keep only the strongest supporting detail.`,
    });
  } else if (words >= 80 && words <= 260) {
    strengths.push({ weight: 3, text: "Good length — detailed enough to show depth without rambling." });
  }

  // ── Evidence ──
  if (metrics.hasExample) strengths.push({ weight: 6, text: "You grounded the answer in a concrete example, which makes it credible." });
  else if (words >= 25)
    improvements.push({
      weight: 7,
      text: behavioral
        ? "Anchor the story in one specific moment — a real project, date or person — rather than speaking in generalities."
        : "Add a concrete example from a project or internship to show you've applied this, not just read about it.",
    });
  if (metrics.hasNumbers) strengths.push({ weight: 6, text: "You quantified details — numbers make an answer memorable." });
  else if (behavioral && words >= 25)
    improvements.push({ weight: 6, text: "Quantify the outcome — time saved, % improvement, users affected — so the impact is tangible." });

  // ── Structure ──
  if (behavioral) {
    const missingStar = (Object.keys(metrics.star) as (keyof typeof metrics.star)[]).filter((k) => !metrics.star[k]);
    if (missingStar.length === 0) strengths.push({ weight: 8, text: "Your story followed a clear STAR arc — easy to follow from situation to result." });
    else if (words >= 25)
      improvements.push({
        weight: 6 + missingStar.length * 2,
        text: `Use the STAR structure — the answer didn't clearly cover ${missingStar.map((k) => STAR_LABELS[k]).join(", ")}.`,
      });
  } else if (signals.connectors >= 3) {
    strengths.push({ weight: 5, text: "Clear signposting (“first”, “because”, “for example”) made your reasoning easy to follow." });
  } else if (words >= 40) {
    improvements.push({ weight: 5, text: "Signpost your explanation — “First…, then…, the trade-off is…” — so the interviewer can follow your logic." });
  }
  if (!behavioral && words >= 40) {
    if (signals.mentionsTradeoffs) strengths.push({ weight: 4, text: "You acknowledged trade-offs, which signals real-world judgement." });
    else improvements.push({ weight: 4, text: "Mention a trade-off or limitation — strong candidates show when an approach is the wrong choice." });
  }

  // ── Delivery ──
  if (metrics.fillerCount >= 3 && signals.fillersPer100 > 2) {
    improvements.push({
      weight: 8 + Math.min(4, metrics.fillerCount / 3),
      text: `You used ${metrics.fillerCount} filler words (${topEntries(metrics.fillerWords)}). Replace them with a short, silent pause — it reads as composure.`,
    });
  } else if (words >= 40 && signals.fillersPer100 < 1) {
    strengths.push({ weight: 5, text: "Clean delivery with almost no filler words." });
  }
  if (metrics.hedgeCount >= 2 && signals.hedgesPer100 > 1.5) {
    improvements.push({
      weight: 6,
      text: `Hedges like ${topEntries(metrics.hedgeWords, 2)} soften your points. State them directly: “I would…”, “The answer is…”.`,
    });
  } else if (words >= 40 && metrics.hedgeCount === 0) {
    strengths.push({ weight: 4, text: "You sounded decisive — no hedging language." });
  }
  if (metrics.avgSentenceLength > 30) {
    improvements.push({
      weight: 5,
      text: `Sentences averaged ${Math.round(metrics.avgSentenceLength)} words. Break them up — one idea per sentence lands better.`,
    });
  }
  if (metrics.wpm !== null) {
    if (metrics.wpm > 175) improvements.push({ weight: 6, text: `You spoke quickly (${metrics.wpm} words/min). Slow to around 130–160 so key points land.` });
    else if (metrics.wpm < 100) improvements.push({ weight: 5, text: `Your pace was slow (${metrics.wpm} words/min). Prepare your opening line so you start with momentum.` });
    else if (metrics.wpm >= 120 && metrics.wpm <= 165) strengths.push({ weight: 4, text: `Comfortable speaking pace (${metrics.wpm} words/min).` });
  }

  const overall = weightedOverall(scores);
  const weakest = [...DIMENSIONS].sort((a, b) => scores[a] - scores[b])[0] as DimensionKey;

  return {
    scores,
    summary: summarise(overall, weakest, words),
    strengths: rank(strengths, 3),
    improvements: rank(improvements, 3),
    missedPoints: match.missed,
    sampleAnswer: referenceAnswer ?? "",
  };
}

function rank(notes: Note[], limit: number): string[] {
  return notes
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((note) => note.text);
}

function summarise(overall: number, weakest: DimensionKey, words: number): string {
  const focus = DIMENSION_INFO[weakest].label.toLowerCase();
  if (words < 15) return "Too short to evaluate fully — give the interviewer a complete answer with an example.";
  if (overall >= 85) return "Excellent answer — relevant, well structured and confidently delivered.";
  if (overall >= 70) return `A strong answer. Tightening ${focus} would make it stand out.`;
  if (overall >= 55) return `A solid foundation, but ${focus} is holding it back.`;
  if (overall >= 40) return `The core idea is there; work on ${focus} and add specifics.`;
  return "This answer needs more substance — revisit the key points and practise a structured response.";
}

export function skippedEvaluation(referenceAnswer: string | undefined, keyPoints: string[]): AnswerEvaluation {
  return {
    scores: { relevance: 0, depth: 0, structure: 0, clarity: 0, confidence: 0 },
    summary: "Skipped. In a real interview, attempting an answer — even a partial one — always beats silence.",
    strengths: [],
    improvements: [
      "If you're unsure, think aloud: restate the question, share what you do know, and reason towards an answer.",
      "Review the key points below and the sample answer, then practise this question again.",
    ],
    missedPoints: keyPoints,
    sampleAnswer: referenceAnswer ?? "",
  };
}
