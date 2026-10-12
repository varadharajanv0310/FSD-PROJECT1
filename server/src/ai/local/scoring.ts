import { contentWords, normalize, stem, type AnswerMetrics, type DimensionScores } from "@poise/shared";
import type { BankPoint } from "./bank";

const GENERIC_POINT_WORDS = new Set(
  "explains explain mentions mention describes describe discusses discuss shows show uses use gives give names name clear clearly concrete specific example examples candidate answer their they them how why what when about covers cover notes note states state good strong includes include makes make".split(
    " ",
  ),
);

const CONNECTORS = [
  "first",
  "second",
  "third",
  "then",
  "next",
  "finally",
  "because",
  "so that",
  "therefore",
  "however",
  "for example",
  "for instance",
  "on the other hand",
  "in summary",
  "overall",
  "means",
  "the reason",
  "as a result",
  "in practice",
  "trade-off",
  "tradeoff",
  "instead",
  "whereas",
  "rather than",
  "unlike",
  "that's why",
  "in short",
];

const TRADEOFF_MARKERS = ["trade-off", "tradeoff", "downside", "cost", "however", "but ", "drawback", "on the other hand", "risk", "versus", " vs"];
const ASSERTIVE_MARKERS = ["i led", "i decided", "i owned", "i built", "i would", "i recommend", "i'm confident", "i am confident", "definitely", "i chose", "my approach"];

export interface KeyPointMatch {
  covered: string[];
  missed: string[];
  coverage: number;
}

/** Turns a free-text key point into matchable terms (used for AI-generated questions). */
export function termsForPoint(point: string): string[] {
  return [...new Set(contentWords(point).filter((w) => !GENERIC_POINT_WORDS.has(w)).map(stem))].filter(
    (w) => w.length >= 3,
  );
}

/**
 * Short alphanumeric terms ("wal", "ttl", "ci") must match whole words so they
 * don't fire inside unrelated words ("walks"); longer terms match as prefixes
 * or substrings ("cach" → "caching").
 */
function containsTerm(text: string, term: string): boolean {
  if (term.length <= 4 && /^[a-z0-9]+$/.test(term)) return new RegExp(`\\b${term}\\b`).test(text);
  return text.includes(term);
}

export function matchKeyPoints(answer: string, points: BankPoint[]): KeyPointMatch {
  if (points.length === 0) return { covered: [], missed: [], coverage: 0 };
  const normalized = normalize(answer);
  const answerStems = new Set(contentWords(answer).map(stem));
  const covered: string[] = [];
  const missed: string[] = [];
  for (const point of points) {
    const explicit = point.terms.some((term) => containsTerm(normalized, term));
    let derived = false;
    if (!explicit) {
      const terms = termsForPoint(point.point);
      const hits = terms.filter((term) => answerStems.has(term) || normalized.includes(term)).length;
      derived = terms.length > 0 && (hits >= 2 || hits / terms.length >= 0.5);
    }
    (explicit || derived ? covered : missed).push(point.point);
  }
  return { covered, missed, coverage: covered.length / points.length };
}

function questionOverlap(question: string, answer: string): number {
  const questionStems = [...new Set(contentWords(question).map(stem))];
  if (questionStems.length === 0) return 1;
  const answerStems = new Set(contentWords(answer).map(stem));
  return questionStems.filter((s) => answerStems.has(s)).length / questionStems.length;
}

function countOccurrences(text: string, markers: string[]): number {
  return markers.reduce((total, marker) => total + (text.split(marker).length - 1), 0);
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export interface ScoringInput {
  question: string;
  answer: string;
  metrics: AnswerMetrics;
  points: BankPoint[];
  behavioral: boolean;
}

export interface ScoringResult {
  scores: DimensionScores;
  match: KeyPointMatch;
  signals: {
    connectors: number;
    mentionsTradeoffs: boolean;
    assertive: number;
    fillersPer100: number;
    hedgesPer100: number;
    overlap: number;
  };
}

/**
 * Rubric-based scoring used by the offline engine. Each dimension maps to
 * observable evidence in the text and the delivery metrics, so the same
 * answer always gets the same score and the feedback can cite why.
 */
export function scoreAnswer(input: ScoringInput): ScoringResult {
  const { metrics, answer } = input;
  const words = metrics.wordCount;
  const normalized = normalize(answer);
  const match = matchKeyPoints(answer, input.points);
  const overlap = questionOverlap(input.question, answer);
  const connectors = countOccurrences(normalized, CONNECTORS);
  const mentionsTradeoffs = TRADEOFF_MARKERS.some((m) => normalized.includes(m));
  const assertive = countOccurrences(normalized, ASSERTIVE_MARKERS);
  const fillersPer100 = words > 0 ? (metrics.fillerCount / words) * 100 : 0;
  const hedgesPer100 = words > 0 ? (metrics.hedgeCount / words) * 100 : 0;
  const signals = { connectors, mentionsTradeoffs, assertive, fillersPer100, hedgesPer100, overlap };

  if (words === 0) {
    return {
      scores: { relevance: 0, depth: 0, structure: 0, clarity: 0, confidence: 0 },
      match,
      signals,
    };
  }

  const coverage = input.points.length > 0 ? match.coverage : Math.min(1, overlap * 1.4);

  // Relevance — did the answer address what was asked?
  let relevance = 20 + 55 * coverage + 25 * Math.min(1, overlap / 0.45);
  if (words < 12) relevance = Math.min(relevance, 30);
  else if (words < 25) relevance = Math.min(relevance, 55);

  // Depth — substance, specifics and coverage of the key ideas.
  const lengthScore =
    words < 20 ? 15 : words < 40 ? 35 : words < 70 ? 55 : words < 110 ? 72 : words <= 260 ? 85 : words <= 380 ? 78 : 65;
  const specifics = (metrics.hasNumbers ? 8 : 0) + (metrics.hasExample ? 8 : 0) + (mentionsTradeoffs ? 6 : 0);
  const depth = 0.45 * lengthScore + 40 * coverage + specifics;

  // Structure — STAR for stories, signposting for explanations.
  let structure: number;
  if (input.behavioral) {
    const parts = Object.values(metrics.star).filter(Boolean).length;
    structure = 25 + parts * 17 + (metrics.sentenceCount >= 4 ? 7 : 0);
  } else {
    const firstSentence = normalize(answer.split(/[.!?]/)[0] ?? "");
    const direct = questionOverlap(input.question, firstSentence) >= 0.2 ? 10 : 0;
    const sentences = metrics.sentenceCount >= 3 ? 15 : metrics.sentenceCount >= 2 ? 8 : 0;
    structure = 35 + Math.min(36, connectors * 6) + sentences + direct;
  }
  if (words < 25) structure = Math.min(structure, 40);

  // Clarity — concise sentences, little noise.
  let clarity = 92;
  if (metrics.avgSentenceLength > 30) clarity -= Math.min(25, (metrics.avgSentenceLength - 30) * 1.5);
  if (metrics.avgSentenceLength < 6 && metrics.sentenceCount > 2) clarity -= 10;
  clarity -= Math.min(30, fillersPer100 * 5);
  if (words < 15) clarity = Math.min(clarity, 60);

  // Confidence — decisive language, steady pace.
  let confidence = 86;
  confidence -= Math.min(30, hedgesPer100 * 6);
  confidence -= Math.min(20, fillersPer100 * 3);
  if (metrics.wpm !== null) {
    if (metrics.wpm < 100) confidence -= Math.min(15, (100 - metrics.wpm) * 0.4);
    if (metrics.wpm > 175) confidence -= Math.min(15, (metrics.wpm - 175) * 0.4);
  }
  confidence += Math.min(8, assertive * 4);
  if (words < 25) confidence = Math.min(confidence, 50);

  // An answer that touches none of the key ideas and barely overlaps with the
  // question is off-topic: fluent delivery shouldn't rescue it.
  if (input.points.length > 0 && match.coverage === 0 && overlap < 0.15) {
    structure = Math.min(structure, 30);
    clarity = Math.min(clarity, 40);
    confidence = Math.min(confidence, 40);
  }

  return {
    scores: {
      relevance: clamp(relevance),
      depth: clamp(depth),
      structure: clamp(structure),
      clarity: clamp(clarity),
      confidence: clamp(confidence),
    },
    match,
    signals,
  };
}
