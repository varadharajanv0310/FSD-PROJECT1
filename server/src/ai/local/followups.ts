import type { AnswerMetrics, Difficulty } from "@poise/shared";
import type { DraftQuestion, QuestionContext } from "../types";
import type { BankPoint } from "./bank";
import type { ScoringResult } from "./scoring";

const RESULT_TERMS = ["result", "outcome", "increased", "reduced", "improved", "delivered", "finished", "on time", "went from", "dropped", "%", "percent", "faster", "saved"];
const LEARNING_TERMS = ["learn", "lesson", "taught", "realized", "realised", "since then", "now i", "next time"];

interface FollowUpTemplate {
  /** Stable opening of the question text, used to recognise it later. */
  prefix: string;
  text: (topic: string) => string;
  difficulty: Difficulty;
  hint: string;
  points: BankPoint[];
  referenceAnswer: string;
}

const TEMPLATES = {
  deeper: {
    prefix: "Could you go a level deeper on that?",
    text: () => "Could you go a level deeper on that? Walk me through a specific example from your own experience.",
    difficulty: "easy",
    hint: "Pick one concrete example. Give the context in a sentence, then the details of what you did and why.",
    points: [
      { point: "Chooses one specific, real example", terms: ["project", "internship", "hackathon", "when i", "during", "at my", "in my", "for example", "once"] },
      { point: "Explains the details of what they did and why", terms: ["i decided", "i built", "because", "so that", "i added", "i used", "i chose", "i implemented", "i wrote", "i made"] },
      { point: "Connects the example back to the original question", terms: ["this shows", "that's why", "which is why", "learned", "the reason", "same approach", "that's how", "this is how"] },
    ],
    referenceAnswer:
      "Sure — a specific example is from my internship last summer. We had exactly this situation, and I was responsible for the piece of work in question. I started by understanding the root cause rather than the symptom, then made a small change, measured the effect, and iterated. The result was a clear improvement we could point to, and that's why I'd apply the same approach again.",
  },
  outcome: {
    prefix: "What was the outcome",
    text: () => "What was the outcome — and looking back, what would you do differently?",
    difficulty: "easy",
    hint: "State the result plainly, ideally with a number, then give one honest reflection.",
    points: [
      { point: "States a concrete outcome, ideally measurable", terms: RESULT_TERMS },
      { point: "Reflects honestly on what they would change", terms: ["differently", "next time", "would have", "should have", "looking back", "in hindsight", "change"] },
      { point: "Shows what they learned from the experience", terms: LEARNING_TERMS },
    ],
    referenceAnswer:
      "The outcome was that we delivered on time, and the change reduced the problem by roughly a third in the following month. Looking back, I'd involve the stakeholders earlier — I spent two days building something before checking it matched what they needed. I learned to share rough work sooner, and I've done that on every project since.",
  },
  ownership: {
    prefix: "What specifically did you do yourself",
    text: () => "What specifically did you do yourself, as opposed to the team as a whole?",
    difficulty: "medium",
    hint: "Switch from “we” to “I”. Name two or three concrete actions you personally took.",
    points: [
      { point: "Uses “I” to describe their own actions", terms: ["i decided", "i built", "my part", "i personally", "i was responsible", "i took", "i wrote", "i led", "i proposed"] },
      { point: "Names concrete steps they personally took", terms: ["first", "second", "then", "after that", "finally", "step"] },
      { point: "Explains the reasoning behind their actions", terms: ["because", "so that", "the reason", "in order to", "i chose", "i decided"] },
    ],
    referenceAnswer:
      "My personal part was three things. First, I dug into the data and found where the problem actually started. Second, I proposed the fix and wrote a short plan so everyone agreed on the approach. Third, I built the core of the change myself and paired with a teammate on testing. I chose that order because getting agreement early meant we didn't waste effort later.",
  },
  tradeoffs: {
    prefix: "Let's push on that a little.",
    text: (topic: string) => `Let's push on that a little. What are the trade-offs or failure modes of the approach you described for ${topic}?`,
    difficulty: "hard",
    hint: "Name at least two concrete downsides, when you'd choose a different approach, and how you'd mitigate the risk.",
    points: [
      { point: "Names at least two concrete trade-offs or limitations", terms: ["trade-off", "tradeoff", "downside", "drawback", "limitation", "cost", "complex", "overhead", "slower", "risk"] },
      { point: "Explains when a different approach would be better", terms: ["instead", "alternative", "would choose", "would pick", "better when", "unless", "rather than", "simpler"] },
      { point: "Describes how to mitigate or monitor the risk", terms: ["mitigat", "monitor", "test", "fallback", "limit", "alert", "measure", "guard"] },
    ],
    referenceAnswer:
      "The main trade-off is complexity versus benefit: the approach adds moving parts that need monitoring, so for a small system it can be overkill. A second risk is a failure mode under load or with unexpected input, which I'd guard against with sensible limits and tests. If requirements were simpler, I'd pick the more straightforward option and revisit later. Either way, I'd add metrics and alerts so we know quickly if the risk materialises.",
  },
  example: {
    prefix: "Can you give me a real example where you applied this",
    text: () => "Can you give me a real example where you applied this in a project?",
    difficulty: "medium",
    hint: "Describe the project briefly, the exact way you applied the concept, and what happened as a result.",
    points: [
      { point: "Describes a real project where they applied the concept", terms: ["project", "internship", "app", "we built", "i built", "at my", "in my"] },
      { point: "Explains exactly how they applied it", terms: ["i used", "i applied", "implemented", "i added", "i wrote", "i changed", "i set up"] },
      { point: "Shares the result or what they learned", terms: [...RESULT_TERMS, ...LEARNING_TERMS] },
    ],
    referenceAnswer:
      "Yes — in my final-year project we hit exactly this. I applied the concept by first measuring where the issue was, then implementing the change in the one module that mattered and adding a test to lock in the behaviour. Performance and reliability both improved noticeably, and it taught me to understand the fundamentals before reaching for a library.",
  },
  verification: {
    prefix: "Good. How would you test or verify",
    text: () => "Good. How would you test or verify that this works correctly in production?",
    difficulty: "hard",
    hint: "Cover automated tests, what you'd measure after release, and how you'd detect problems early.",
    points: [
      { point: "Describes automated tests at the right levels", terms: ["unit test", "integration", "end-to-end", "e2e", "test", "ci"] },
      { point: "Names metrics or signals to monitor after release", terms: ["metric", "monitor", "error rate", "latency", "dashboard", "logs", "alert"] },
      { point: "Explains how they'd detect and respond to problems", terms: ["alert", "rollback", "roll back", "canary", "feature flag", "on-call", "detect", "gradual"] },
    ],
    referenceAnswer:
      "I'd verify it at three levels. Before release, unit tests for the core logic and an integration test for the main path, run in CI. During rollout, a gradual release with metrics like error rate and latency compared against the baseline. After release, alerts on those metrics plus logging around the edge cases, so if something breaks we see it within minutes and can roll back.",
  },
} satisfies Record<string, FollowUpTemplate>;

const PROPER_NOUNS = new Set([
  "React", "Angular", "Vue", "Node", "Kubernetes", "Docker", "Terraform", "Linux", "Python", "Java", "Kotlin",
  "Swift", "Android", "Flutter", "Redis", "Kafka", "Spark", "Git", "Excel", "Tableau", "Figma", "Go", "Rust",
]);

/** Lower-cases a category for use mid-sentence, keeping names and acronyms ("React", "SQL", "JavaScript"). */
export function categoryInSentence(category: string): string {
  return category
    .split(" ")
    .map((word) => (/^[A-Z][a-z]+(?:[-'][a-z]+)*$/.test(word) && !PROPER_NOUNS.has(word) ? word.toLowerCase() : word))
    .join(" ");
}

function build(template: FollowUpTemplate, question: QuestionContext): DraftQuestion {
  return {
    text: template.text(categoryInSentence(question.category)),
    category: question.category,
    difficulty: template.difficulty,
    hint: template.hint,
    keyPoints: template.points.map((p) => p.point),
    referenceAnswer: template.referenceAnswer,
  };
}

/** Match terms for a follow-up the offline engine generated earlier. */
export function followUpPoints(text: string): BankPoint[] | undefined {
  return Object.values(TEMPLATES).find((template) => text.startsWith(template.prefix))?.points;
}

/**
 * Chooses a natural follow-up based on the biggest gap in the previous
 * answer — the way a human interviewer probes. Returns null when the answer
 * was already complete enough that a follow-up would feel forced.
 */
export function chooseFollowUp(
  question: QuestionContext,
  metrics: AnswerMetrics,
  scoring: ScoringResult,
  behavioral: boolean,
): DraftQuestion | null {
  const words = metrics.wordCount;
  if (words < 8) return null;
  if (words < 45) return build(TEMPLATES.deeper, question);
  if (behavioral && !metrics.star.result) return build(TEMPLATES.outcome, question);
  if (behavioral && !metrics.star.action) return build(TEMPLATES.ownership, question);
  if (!behavioral && !scoring.signals.mentionsTradeoffs) return build(TEMPLATES.tradeoffs, question);
  if (!behavioral && !metrics.hasExample) return build(TEMPLATES.example, question);
  if (!behavioral && scoring.scores.depth >= 70) return build(TEMPLATES.verification, question);
  return null;
}
