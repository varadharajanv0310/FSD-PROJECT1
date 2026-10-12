import { DIFFICULTIES, getRole, type Difficulty, type InterviewConfig } from "@poise/shared";
import type { DraftQuestion } from "../types";
import { bankFor, type BankQuestion, type BankQuestionType } from "./bank";
import { extractSkills } from "./skills";

function difficultyDistance(a: Difficulty, b: Difficulty): number {
  return Math.abs(DIFFICULTIES.indexOf(a) - DIFFICULTIES.indexOf(b));
}

export function toDraft(question: BankQuestion): DraftQuestion {
  return {
    text: question.text,
    category: question.category,
    difficulty: question.difficulty,
    hint: question.hint,
    keyPoints: question.points.map((p) => p.point),
    referenceAnswer: question.answer,
  };
}

interface Candidate {
  question: BankQuestion;
  score: number;
}

/**
 * Ranks bank questions for a session and picks a varied set: closest
 * difficulty first, boosted by focus areas, penalised if recently asked or if
 * the category is already represented.
 */
function pick(
  pool: BankQuestion[],
  count: number,
  config: InterviewConfig,
  avoid: Set<string>,
  focusTerms: string[],
  random: () => number,
): BankQuestion[] {
  const candidates: Candidate[] = pool.map((question) => {
    const haystack = `${question.text} ${question.category}`.toLowerCase();
    let score = 6 - difficultyDistance(question.difficulty, config.difficulty) * 2.5;
    for (const term of focusTerms) if (haystack.includes(term)) score += 3;
    if (avoid.has(question.text.toLowerCase())) score -= 8;
    score += random() * 2.5;
    return { question, score };
  });

  const chosen: BankQuestion[] = [];
  const categoryUse = new Map<string, number>();
  const effective = (c: Candidate) => c.score - (categoryUse.get(c.question.category) ?? 0) * 2.2;
  while (chosen.length < count && candidates.length > 0) {
    candidates.sort((a, b) => effective(b) - effective(a));
    const next = candidates.shift()!;
    chosen.push(next.question);
    categoryUse.set(next.question.category, (categoryUse.get(next.question.category) ?? 0) + 1);
  }
  return chosen;
}

function skillQuestion(skill: string, difficulty: Difficulty): DraftQuestion {
  return {
    text: `This role calls for ${skill}. Walk me through a project where you used ${skill} — what problem were you solving, what decisions did you make, and what was the outcome?`,
    category: "Role fit",
    difficulty,
    hint: "Pick one project. Spend a sentence on context, most of your time on your own technical decisions, and finish with the result.",
    keyPoints: [
      `Sets up the project context and why ${skill} was the right tool`,
      `Explains specific decisions or techniques used with ${skill}`,
      "Makes their personal contribution clear",
      "Shares a concrete outcome and what they learned",
    ],
    referenceAnswer: `In my final-year project we built an internal tool for our college placement cell, and ${skill} was central to it because it suited the scale and the team's skills. I owned the core module: I made the key design decisions, explained the trade-offs to the team, and wrote most of the implementation, including tests for the risky parts. The biggest challenge was performance once real data arrived, which I solved by profiling first and fixing the actual bottleneck rather than guessing. The tool now handles every placement drive, cutting the coordinators' manual work by about half, and it taught me to measure before optimising.`,
  };
}

function companyQuestion(company: string): DraftQuestion {
  return {
    text: `Why do you want to join ${company}, and why now?`,
    category: "Motivation",
    difficulty: "easy",
    hint: `Show you've done your homework on ${company}: its product, users or mission — then connect that to your skills and goals.`,
    keyPoints: [
      `Mentions something specific about ${company} (product, mission, users)`,
      "Connects their skills and experience to the role",
      "Explains what they hope to learn or contribute",
    ],
    referenceAnswer: `I've followed ${company} for a while, and what draws me is how directly the product affects its users — the recent launches show a team that ships carefully and quickly. My projects have trained me in exactly the skills this role needs, and I've enjoyed owning features end to end. Right now I'm looking for a place where I can contribute from the first month while learning from engineers who have operated at real scale, and ${company} is that place.`,
  };
}

export function selectQuestions(
  config: InterviewConfig,
  count: number,
  avoidTexts: string[] = [],
  random: () => number = Math.random,
): DraftQuestion[] {
  const avoid = new Set(avoidTexts.map((text) => text.toLowerCase()));
  const skills = config.jobDescription ? extractSkills(config.jobDescription, 3) : [];
  const focusTerms = [...(config.focusAreas ?? []), ...skills].map((term) => term.toLowerCase()).filter(Boolean);
  const includesBehavioral = config.type === "behavioral" || config.type === "mixed";

  // Split the round between question types.
  const counts: Record<BankQuestionType, number> = { behavioral: 0, technical: 0, "system-design": 0 };
  if (config.type === "technical") counts.technical = count;
  else if (config.type === "behavioral") counts.behavioral = count;
  else if (config.type === "mixed") {
    counts.behavioral = Math.max(1, Math.round(count * 0.4));
    counts.technical = count - counts.behavioral;
  } else {
    counts["system-design"] = getRole(config.role)?.systemDesign ? Math.max(1, Math.ceil(count * 0.6)) : 0;
    counts.technical = count - counts["system-design"];
  }

  // Tailored questions take the place of a question of the same type.
  const tailored: Typed[] = [];
  const company = config.companyName?.trim();
  if (company && includesBehavioral && counts.behavioral > 0) {
    tailored.push({ draft: companyQuestion(company), type: "behavioral" });
    counts.behavioral--;
  }
  const skillSlots = Math.min(skills.length, counts.technical >= 4 ? 2 : counts.technical >= 2 ? 1 : 0);
  for (const skill of skills.slice(0, skillSlots)) {
    tailored.push({ draft: skillQuestion(skill, config.difficulty), type: "technical" });
    counts.technical--;
  }

  // Real interviews open with "Tell me about yourself".
  const picked: Typed[] = [];
  const intro = includesBehavioral && count >= 4 ? bankFor(config.role, "behavioral").find((q) => q.id === "beh-intro") : undefined;
  if (intro && counts.behavioral > 0) {
    picked.push({ draft: toDraft(intro), type: "behavioral" });
    counts.behavioral--;
  }

  let shortfall = 0;
  for (const type of ["system-design", "technical", "behavioral"] as const) {
    const wanted = counts[type] + shortfall;
    if (wanted <= 0) continue;
    const used = new Set(picked.map((p) => p.draft.text));
    const pool = bankFor(config.role, type).filter((q) => !used.has(q.text));
    const chosen = pick(pool, wanted, config, avoid, focusTerms, random);
    shortfall = wanted - chosen.length;
    for (const question of chosen) picked.push({ draft: toDraft(question), type });
  }
  // Fill any remaining gap from the behavioral pool, which suits every role.
  if (shortfall > 0) {
    const used = new Set(picked.map((p) => p.draft.text));
    const extra = pick(
      bankFor(config.role, "behavioral").filter((q) => !used.has(q.text)),
      shortfall,
      config,
      avoid,
      focusTerms,
      random,
    );
    for (const question of extra) picked.push({ draft: toDraft(question), type: "behavioral" });
  }

  return orderForFlow([...picked, ...tailored]).slice(0, count);
}

interface Typed {
  draft: DraftQuestion;
  type: BankQuestionType;
}

const byDifficulty = (a: Typed, b: Typed) =>
  DIFFICULTIES.indexOf(a.draft.difficulty) - DIFFICULTIES.indexOf(b.draft.difficulty);

/**
 * Orders questions like a real interviewer would: the introduction first,
 * easier questions before harder ones, and question types interleaved.
 */
function orderForFlow(questions: Typed[]): DraftQuestion[] {
  const intro = questions.filter((q) => q.draft.category === "Introduction");
  const rest = questions.filter((q) => q.draft.category !== "Introduction");
  const behavioral = rest.filter((q) => q.type === "behavioral").sort(byDifficulty);
  const other = rest.filter((q) => q.type !== "behavioral").sort(byDifficulty);

  const ordered: Typed[] = [...intro];
  while (behavioral.length || other.length) {
    // Alternate, leaning towards whichever type has more questions left.
    const takeOther = other.length > 0 && (behavioral.length === 0 || other.length >= behavioral.length);
    ordered.push((takeOther ? other : behavioral).shift()!);
  }
  return ordered.map((q) => q.draft);
}
