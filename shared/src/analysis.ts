/**
 * Deterministic delivery analysis for a single answer.
 *
 * These metrics are computed identically on the client (live, while the
 * candidate speaks or types) and on the server (stored with the answer and fed
 * to the AI engine as evidence), so what the candidate sees in the room always
 * matches what the report says.
 */
import type { AnswerMode } from "./catalog";
import type { AnswerMetrics, StarCoverage } from "./types";

type PhraseKind = "filler" | "hedge";

/** Multi-word phrases are matched on normalized word sequences. */
const FILLER_PHRASES: string[][] = [
  ["um"],
  ["umm"],
  ["uh"],
  ["uhh"],
  ["uhm"],
  ["erm"],
  ["er"],
  ["ah"],
  ["hmm"],
  ["basically"],
  ["literally"],
  ["actually"],
  ["you", "know"],
  ["i", "mean"],
  ["so", "yeah"],
  ["or", "something"],
  ["and", "stuff"],
];

const HEDGE_PHRASES: string[][] = [
  ["i", "think"],
  ["i", "guess"],
  ["i", "feel", "like"],
  ["maybe"],
  ["probably"],
  ["perhaps"],
  ["kind", "of"],
  ["sort", "of"],
  ["not", "sure"],
  ["might", "be"],
  ["hopefully"],
  ["somewhat"],
];

/** Words after which "like" is almost always a comparison or verb, not a filler. */
const LIKE_NON_FILLER_NEXT = new Set([
  "to",
  "this",
  "that",
  "these",
  "those",
  "a",
  "an",
  "the",
  "it",
  "them",
  "him",
  "her",
  "you",
  "me",
  "us",
  "working",
  "using",
  "how",
  "when",
]);
const LIKE_FILLER_PREV = new Set(["and", "so", "um", "uh", "was", "were", "just", "is", "it's"]);

interface Token {
  /** Original text including punctuation. */
  raw: string;
  /** Lowercased word with surrounding punctuation stripped. */
  word: string;
  /** True when the raw token ends with a comma. */
  comma: boolean;
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Token[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({
      raw,
      word: normalize(raw).replace(/^[^a-z0-9']+|[^a-z0-9'%]+$/g, ""),
      comma: /,$/.test(raw),
    }));
}

/**
 * Marks each token as a filler, a hedge, or neither. Longer phrases win, and a
 * token can only belong to one phrase.
 */
function classifyTokens(tokens: Token[]): (PhraseKind | null)[] {
  const kinds: (PhraseKind | null)[] = tokens.map(() => null);
  const phrases: { words: string[]; kind: PhraseKind }[] = [
    ...FILLER_PHRASES.map((words) => ({ words, kind: "filler" as const })),
    ...HEDGE_PHRASES.map((words) => ({ words, kind: "hedge" as const })),
  ].sort((a, b) => b.words.length - a.words.length);

  for (let i = 0; i < tokens.length; i++) {
    if (kinds[i]) continue;
    for (const phrase of phrases) {
      const fits = phrase.words.every(
        (word, offset) => tokens[i + offset]?.word === word && !kinds[i + offset],
      );
      if (fits) {
        for (let offset = 0; offset < phrase.words.length; offset++) kinds[i + offset] = phrase.kind;
        break;
      }
    }
    if (!kinds[i] && tokens[i]!.word === "like") {
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      const nextBlocks = next ? LIKE_NON_FILLER_NEXT.has(next.word) : false;
      const isFiller =
        tokens[i]!.comma ||
        (prev?.comma ?? false) ||
        (!nextBlocks && prev !== undefined && LIKE_FILLER_PREV.has(prev.word));
      if (isFiller) kinds[i] = "filler";
    }
  }
  return kinds;
}

function phraseCounts(tokens: Token[], kinds: (PhraseKind | null)[], kind: PhraseKind) {
  const counts: Record<string, number> = {};
  let total = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (kinds[i] !== kind) continue;
    // Group consecutive tokens of the same phrase into one occurrence.
    let phrase = tokens[i]!.word;
    while (kinds[i + 1] === kind && isPhraseContinuation(tokens, i, kind)) {
      i++;
      phrase += ` ${tokens[i]!.word}`;
    }
    counts[phrase] = (counts[phrase] ?? 0) + 1;
    total++;
  }
  return { counts, total };
}

function isPhraseContinuation(tokens: Token[], index: number, kind: PhraseKind): boolean {
  const list = kind === "filler" ? FILLER_PHRASES : HEDGE_PHRASES;
  const a = tokens[index]!.word;
  const b = tokens[index + 1]!.word;
  return list.some((words) => words.some((word, i) => word === a && words[i + 1] === b));
}

const STAR_MARKERS: Record<keyof StarCoverage, string[]> = {
  situation: [
    "during ",
    "hackathon",
    "internship",
    "when we",
    "at the time",
    "in my first year",
    "in my second year",
    "in my third year",
    "when i was",
    "while i was",
    "during my",
    "during our",
    "during the",
    "at my previous",
    "in my previous",
    "in my last",
    "in my internship",
    "at my internship",
    "in my final year",
    "in college",
    "the situation",
    "the context",
    "back in",
    "last year",
    "last semester",
    "we were working on",
    "our team was",
    "in my role as",
    "in my project",
    "on a project",
    "in one project",
    "at my company",
    "at my job",
  ],
  task: [
    "my task",
    "my role",
    "i was responsible",
    "i was asked",
    "my responsibility",
    "the goal",
    "our goal",
    "my goal",
    "we needed to",
    "i needed to",
    "i had to",
    "we had to",
    "the challenge was",
    "the problem was",
    "the objective",
    "i was tasked",
    "i was in charge",
    "i owned",
    "my job",
    "we wanted to",
    "i wanted to",
    "we were asked",
    "needed to",
  ],
  action: [
    "i decided",
    "i built",
    "i created",
    "i implemented",
    "i designed",
    "i led",
    "i organized",
    "i organised",
    "i reached out",
    "i proposed",
    "i wrote",
    "i set up",
    "i started",
    "i spoke",
    "i talked",
    "i scheduled",
    "i broke",
    "i took",
    "i worked",
    "i analyzed",
    "i analysed",
    "i refactored",
    "i introduced",
    "i suggested",
    "i made",
    "i focused",
    "i prioritized",
    "i prioritised",
    "so i",
    "first i",
    "then i",
  ],
  result: [
    "as a result",
    "resulted in",
    "the result",
    "the outcome",
    "in the end",
    "eventually",
    "we delivered",
    "we shipped",
    "we launched",
    "increased",
    "reduced",
    "improved",
    "decreased",
    "saved",
    "grew",
    "i learned",
    "i learnt",
    "the lesson",
    "percent",
    "%",
    "on time",
    "was selected",
    "we won",
    "finished",
    "placed",
    "went from",
    "dropped",
    "rose",
    "faster",
    "ended up",
    "which led to",
    "since then",
  ],
};

const EXAMPLE_MARKERS = [
  "for example",
  "for instance",
  "such as",
  "e.g.",
  "in my project",
  "in one project",
  "at my internship",
  "in my internship",
  "when i",
  "once i",
  "in practice",
  "a real example",
];

const NUMBER_WORDS =
  /\b(percent|twice|double|doubled|half|halved|thousand|million|hundred|dozen|\d+x)\b|\d/;

/** "I" followed by a past-tense verb is a strong signal of a personal action. */
const PERSONAL_ACTION =
  /\bi (?:\w+ed|built|led|made|took|wrote|ran|set|spent|chose|found|got|began|brought|drove|gave|kept|met|put|sent|spoke|taught|told|won|did|went|thought)\b/;

export function detectStar(text: string): StarCoverage {
  const normalized = normalize(text);
  return {
    situation: STAR_MARKERS.situation.some((m) => normalized.includes(m)),
    task: STAR_MARKERS.task.some((m) => normalized.includes(m)),
    action: STAR_MARKERS.action.some((m) => normalized.includes(m)) || PERSONAL_ACTION.test(normalized),
    result: STAR_MARKERS.result.some((m) => normalized.includes(m)),
  };
}

export function countSentences(text: string, wordCount: number): number {
  const terminal = (text.match(/[.!?]+(\s|$)/g) ?? []).length;
  const trailing = /[.!?]\s*$/.test(text.trim()) ? 0 : 1;
  const counted = Math.max(1, terminal + trailing);
  // Speech-to-text transcripts often arrive without punctuation. When the
  // text is clearly under-punctuated, estimate sentences from typical spoken
  // sentence length so clarity isn't punished for a transcription artefact.
  if (wordCount >= 40 && wordCount / counted > 45) return Math.max(1, Math.round(wordCount / 16));
  return wordCount === 0 ? 0 : counted;
}

export interface AnalyzeOptions {
  durationSec?: number;
  mode?: AnswerMode;
}

export function analyzeAnswer(text: string, options: AnalyzeOptions = {}): AnswerMetrics {
  const tokens = tokenize(text);
  const words = tokens.filter((t) => t.word.length > 0);
  const kinds = classifyTokens(tokens);
  const fillers = phraseCounts(tokens, kinds, "filler");
  const hedges = phraseCounts(tokens, kinds, "hedge");
  const wordCount = words.length;
  const sentenceCount = countSentences(text, wordCount);
  const durationSec = Math.max(0, Math.round(options.durationSec ?? 0));
  const wpm =
    options.mode === "voice" && durationSec >= 10 && wordCount > 0
      ? Math.round(wordCount / (durationSec / 60))
      : null;
  const normalized = normalize(text);

  return {
    wordCount,
    durationSec,
    wpm,
    fillerCount: fillers.total,
    fillerWords: fillers.counts,
    hedgeCount: hedges.total,
    hedgeWords: hedges.counts,
    sentenceCount,
    avgSentenceLength: sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0,
    star: detectStar(text),
    hasNumbers: NUMBER_WORDS.test(normalized),
    hasExample: EXAMPLE_MARKERS.some((m) => normalized.includes(m)),
  };
}

export interface AnnotatedSegment {
  text: string;
  kind: PhraseKind | null;
}

/**
 * Splits text into segments flagged as filler / hedge so the UI can
 * highlight them inline without altering the original wording.
 */
export function annotateAnswer(text: string): AnnotatedSegment[] {
  const parts = text.split(/(\s+)/).filter((part) => part.length > 0);
  const tokens = tokenize(text);
  const kinds = classifyTokens(tokens);

  // Assign a kind to every part. Whitespace inherits a kind only when it sits
  // inside a multi-word phrase (e.g. the space in "you know").
  const partKinds: (PhraseKind | null)[] = [];
  let tokenIndex = 0;
  for (const part of parts) {
    if (part.trim().length > 0) {
      partKinds.push(kinds[tokenIndex++] ?? null);
    } else {
      const prev = kinds[tokenIndex - 1] ?? null;
      const next = kinds[tokenIndex] ?? null;
      const insidePhrase =
        prev !== null &&
        prev === next &&
        tokenIndex > 0 &&
        isPhraseContinuation(tokens, tokenIndex - 1, prev);
      partKinds.push(insidePhrase ? prev : null);
    }
  }

  const segments: AnnotatedSegment[] = [];
  parts.forEach((part, i) => {
    const kind = partKinds[i] ?? null;
    const last = segments[segments.length - 1];
    if (last && last.kind === kind) last.text += part;
    else segments.push({ text: part, kind });
  });
  return segments;
}

const STOP_WORDS = new Set(
  (
    "a an the and or but if then so of to in on for with at by from as is are was were be been being " +
    "it its this that these those there here what which who whom whose when where why how do does did " +
    "doing have has had having i me my we our you your they them their he she his her can could would " +
    "should will shall may might must not no yes about into over under than too very just also more most " +
    "some any each other such only own same both few all one two tell describe explain walk through give " +
    "example time like would you your between difference"
  ).split(" "),
);

/** A light stemmer — good enough to match "caching" with "cache" or "indexes" with "index". */
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length <= 4) return w;
  for (const suffix of ["ations", "ation", "ings", "ing", "ness", "ment", "ies", "ers", "ed", "es", "er", "ly", "s"]) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      w = w.slice(0, -suffix.length);
      if (suffix === "ies") w += "y";
      break;
    }
  }
  return w;
}

export function contentWords(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9+#.']+/)
    .map((w) => w.replace(/^[.']+|[.']+$/g, ""))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}
