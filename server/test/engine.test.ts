import { describe, expect, it } from "vitest";
import { analyzeAnswer, weightedOverall, type InterviewConfig } from "@poise/shared";
import { QUESTION_BANK, bankFor } from "../src/ai/local/bank";
import { LocalEngine } from "../src/ai/local/engine";
import { asPhrase } from "../src/ai/local/feedback";
import { extractSkills } from "../src/ai/local/skills";
import { selectQuestions } from "../src/ai/local/select";

const engine = new LocalEngine();

const baseConfig: InterviewConfig = {
  role: "frontend",
  type: "mixed",
  level: "entry",
  difficulty: "medium",
  questionCount: 6,
  answerMode: "text",
  adaptiveFollowUps: true,
  timePerQuestionSec: 120,
};

async function score(questionId: string, answer: string) {
  const question = QUESTION_BANK.find((q) => q.id === questionId)!;
  const metrics = analyzeAnswer(answer, { durationSec: 60, mode: "voice" });
  const evaluation = await engine.evaluateAnswer({
    config: baseConfig,
    question: { text: question.text, category: question.category, kind: "core", keyPoints: question.points.map((p) => p.point), referenceAnswer: question.answer },
    answer: { text: answer, mode: "voice", durationSec: 60 },
    metrics,
  });
  return { overall: weightedOverall(evaluation.scores), evaluation };
}

describe("question bank", () => {
  it("has unique ids and complete entries", () => {
    const ids = new Set(QUESTION_BANK.map((q) => q.id));
    expect(ids.size).toBe(QUESTION_BANK.length);
    for (const question of QUESTION_BANK) {
      expect(question.points.length).toBeGreaterThanOrEqual(3);
      expect(question.answer.split(" ").length).toBeGreaterThan(60);
      expect(question.hint.length).toBeGreaterThan(10);
    }
  });

  it("covers every role with technical and behavioral questions", () => {
    for (const role of ["software-engineer", "frontend", "backend", "fullstack", "data-scientist", "data-analyst", "devops", "mobile", "product-manager", "ui-ux"] as const) {
      expect(bankFor(role, "technical").length).toBeGreaterThanOrEqual(6);
      expect(bankFor(role, "behavioral").length).toBeGreaterThanOrEqual(14);
    }
  });
});

describe("question selection", () => {
  it("returns the requested number of unique questions", () => {
    for (const count of [3, 6, 12]) {
      const questions = selectQuestions({ ...baseConfig, questionCount: count }, count);
      expect(questions).toHaveLength(count);
      expect(new Set(questions.map((q) => q.text)).size).toBe(count);
    }
  });

  it("opens behavioral and mixed rounds with an introduction", () => {
    const questions = selectQuestions(baseConfig, 6);
    expect(questions[0]!.text).toBe("Tell me about yourself.");
  });

  it("tailors questions to the job description and company", () => {
    const questions = selectQuestions(
      { ...baseConfig, companyName: "Acme", jobDescription: "We use React and TypeScript with Node.js and Docker." },
      6,
    );
    expect(questions.some((q) => q.text.includes("Acme"))).toBe(true);
    expect(questions.some((q) => q.category === "Role fit")).toBe(true);
  });

  it("mixes technical and behavioral questions in mixed rounds", () => {
    const questions = selectQuestions({ ...baseConfig, questionCount: 8 }, 8);
    const technical = questions.filter((q) => QUESTION_BANK.find((b) => b.text === q.text)?.type === "technical");
    expect(technical.length).toBeGreaterThanOrEqual(3);
  });
});

describe("offline evaluation", () => {
  it("ranks strong, partial, weak and off-topic answers in order", async () => {
    const reference = QUESTION_BANK.find((q) => q.id === "be-caching")!.answer;
    const strong = await score("be-caching", reference);
    const partial = await score("be-caching", "Um, so I think I would like, add Redis in front of the database with a TTL so reads are faster.");
    const weak = await score("be-caching", "I think it is basically about, um, you know, doing it properly and stuff.");
    const offTopic = await score("be-caching", "I enjoy playing cricket on weekends and I have a dog named Bruno who loves long walks.");
    expect(strong.overall).toBeGreaterThan(80);
    expect(strong.overall).toBeGreaterThan(partial.overall);
    expect(partial.overall).toBeGreaterThan(weak.overall);
    expect(offTopic.overall).toBeLessThan(35);
  });

  it("explains its scores with specific feedback", async () => {
    const { evaluation } = await score("beh-conflict", "Um, like, we disagreed once and, um, basically it worked out.");
    expect(evaluation.improvements.length).toBeGreaterThan(0);
    expect(evaluation.missedPoints.length).toBeGreaterThan(0);
    expect(evaluation.sampleAnswer.length).toBeGreaterThan(100);
  });

  it("asks a follow-up when an answer is too brief", async () => {
    const question = QUESTION_BANK.find((q) => q.id === "fe-closures")!;
    const answer = "A closure is a function that remembers variables from its outer scope.";
    const followUp = await engine.generateFollowUp({
      config: baseConfig,
      question: { text: question.text, category: question.category, kind: "core", keyPoints: [] },
      answer,
      metrics: analyzeAnswer(answer),
      askedQuestions: [question.text],
    });
    expect(followUp?.text).toMatch(/go a level deeper/);
  });

  it("phrases key points in the second person", () => {
    expect(asPhrase("Connects their story to this role")).toBe("connecting your story to this role");
    expect(asPhrase("Identifies the race condition")).toBe("identifying the race condition");
  });
});

describe("skills extraction", () => {
  it("finds skills mentioned in a job description", () => {
    expect(extractSkills("Strong React and TypeScript skills; experience with AWS, Docker and Kubernetes. React Native a plus.")).toEqual(
      expect.arrayContaining(["React", "TypeScript"]),
    );
    expect(extractSkills("We value walking and talking.")).toEqual([]);
  });
});
