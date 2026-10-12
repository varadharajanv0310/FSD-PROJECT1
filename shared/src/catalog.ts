/**
 * The catalog describes everything a candidate can practice: roles, interview
 * formats, seniority levels and the five feedback dimensions every answer is
 * scored on. Both the client (to render pickers) and the server (to validate
 * requests and steer the AI engines) read from this single source of truth.
 */

export const ROLE_IDS = [
  "software-engineer",
  "frontend",
  "backend",
  "fullstack",
  "data-scientist",
  "data-analyst",
  "devops",
  "mobile",
  "product-manager",
  "ui-ux",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export interface RoleInfo {
  id: RoleId;
  label: string;
  short: string;
  blurb: string;
  /** Topics an interviewer for this role tends to probe. */
  topics: string[];
  /** Whether a system-design round makes sense for this role. */
  systemDesign: boolean;
  /** What "technical" means for this role, shown in the setup screen. */
  technicalLabel: string;
}

export const ROLES: readonly RoleInfo[] = [
  {
    id: "software-engineer",
    label: "Software Engineer",
    short: "SDE",
    blurb: "Campus & generalist rounds — DSA, OOP, DBMS, OS and networks.",
    topics: ["Data structures", "Algorithms", "OOP", "DBMS", "Operating systems", "Networking"],
    systemDesign: true,
    technicalLabel: "CS fundamentals",
  },
  {
    id: "frontend",
    label: "Frontend Engineer",
    short: "Frontend",
    blurb: "JavaScript, React, browser internals, performance and accessibility.",
    topics: ["JavaScript", "React", "CSS", "Browser", "Performance", "Accessibility"],
    systemDesign: true,
    technicalLabel: "Frontend engineering",
  },
  {
    id: "backend",
    label: "Backend Engineer",
    short: "Backend",
    blurb: "APIs, databases, caching, concurrency and reliability.",
    topics: ["APIs", "Databases", "Caching", "Concurrency", "Security", "Scalability"],
    systemDesign: true,
    technicalLabel: "Backend engineering",
  },
  {
    id: "fullstack",
    label: "Full-Stack Developer",
    short: "Full-Stack",
    blurb: "End-to-end delivery across the MERN stack and beyond.",
    topics: ["React", "Node.js", "REST", "MongoDB", "Auth", "Deployment"],
    systemDesign: true,
    technicalLabel: "Full-stack engineering",
  },
  {
    id: "data-scientist",
    label: "Data Scientist",
    short: "Data Science",
    blurb: "Statistics, machine learning, experimentation and model evaluation.",
    topics: ["Statistics", "Machine learning", "Feature engineering", "Evaluation", "Experimentation"],
    systemDesign: false,
    technicalLabel: "Data science & ML",
  },
  {
    id: "data-analyst",
    label: "Data Analyst",
    short: "Analytics",
    blurb: "SQL, metrics, dashboards and turning data into decisions.",
    topics: ["SQL", "Metrics", "Visualization", "Excel", "Storytelling"],
    systemDesign: false,
    technicalLabel: "Analytics & SQL",
  },
  {
    id: "devops",
    label: "DevOps / Cloud Engineer",
    short: "DevOps",
    blurb: "CI/CD, containers, cloud infrastructure and observability.",
    topics: ["CI/CD", "Docker", "Kubernetes", "Cloud", "Monitoring", "Incident response"],
    systemDesign: true,
    technicalLabel: "DevOps & cloud",
  },
  {
    id: "mobile",
    label: "Mobile Developer",
    short: "Mobile",
    blurb: "Android, iOS and cross-platform apps that feel native.",
    topics: ["App lifecycle", "State", "Offline", "Performance", "Release"],
    systemDesign: true,
    technicalLabel: "Mobile engineering",
  },
  {
    id: "product-manager",
    label: "Product Manager",
    short: "Product",
    blurb: "Product sense, prioritisation, metrics and stakeholder alignment.",
    topics: ["Product sense", "Prioritisation", "Metrics", "Execution", "Strategy"],
    systemDesign: false,
    technicalLabel: "Product sense & execution",
  },
  {
    id: "ui-ux",
    label: "UI/UX Designer",
    short: "Design",
    blurb: "Research, interaction design, systems and critique.",
    topics: ["User research", "Interaction design", "Design systems", "Usability", "Critique"],
    systemDesign: false,
    technicalLabel: "Design craft",
  },
];

export const INTERVIEW_TYPES = ["technical", "behavioral", "mixed", "system-design"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_TYPE_INFO: Record<InterviewType, { label: string; blurb: string }> = {
  technical: {
    label: "Technical",
    blurb: "Role-specific knowledge, problem solving and trade-offs.",
  },
  behavioral: {
    label: "Behavioral & HR",
    blurb: "Stories about teamwork, conflict, failure and growth.",
  },
  mixed: {
    label: "Mixed",
    blurb: "A realistic blend of technical and behavioral questions.",
  },
  "system-design": {
    label: "System Design",
    blurb: "Architecture, scaling and reasoning about constraints.",
  },
};

export const LEVELS = ["intern", "entry", "mid", "senior"] as const;
export type ExperienceLevel = (typeof LEVELS)[number];

export const LEVEL_INFO: Record<ExperienceLevel, { label: string; years: string }> = {
  intern: { label: "Student / Intern", years: "Final year & internships" },
  entry: { label: "Entry level", years: "0–2 years" },
  mid: { label: "Mid level", years: "2–5 years" },
  senior: { label: "Senior", years: "5+ years" },
};

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DEFAULT_DIFFICULTY: Record<ExperienceLevel, Difficulty> = {
  intern: "easy",
  entry: "medium",
  mid: "medium",
  senior: "hard",
};

export const ANSWER_MODES = ["voice", "text"] as const;
export type AnswerMode = (typeof ANSWER_MODES)[number];

export const DIMENSIONS = ["relevance", "depth", "structure", "clarity", "confidence"] as const;
export type DimensionKey = (typeof DIMENSIONS)[number];

export interface DimensionInfo {
  label: string;
  question: string;
  /** Weight in the overall score; weights sum to 1. */
  weight: number;
  tip: string;
}

export const DIMENSION_INFO: Record<DimensionKey, DimensionInfo> = {
  relevance: {
    label: "Relevance",
    question: "Did you answer the question that was actually asked?",
    weight: 0.25,
    tip: "Restate the question in your first sentence, then answer it directly before adding context.",
  },
  depth: {
    label: "Depth",
    question: "Was the answer accurate, specific and backed by examples?",
    weight: 0.25,
    tip: "Anchor every claim with one concrete example, number or trade-off from your own work.",
  },
  structure: {
    label: "Structure",
    question: "Could the interviewer follow a clear beginning, middle and end?",
    weight: 0.2,
    tip: "Use STAR for stories (Situation, Task, Action, Result) and 'first, then, finally' for explanations.",
  },
  clarity: {
    label: "Clarity",
    question: "Was the language concise and easy to follow?",
    weight: 0.15,
    tip: "Keep sentences short. One idea per sentence, and cut words that don't add meaning.",
  },
  confidence: {
    label: "Confidence",
    question: "Did you sound decisive, with few fillers and hedges?",
    weight: 0.15,
    tip: "Replace fillers with a silent pause, and swap 'I think maybe' for 'I would'.",
  },
};

export interface ScoreBand {
  min: number;
  label: string;
  tone: "excellent" | "good" | "fair" | "weak" | "low";
}

/** Ordered from highest to lowest. */
export const SCORE_BANDS: readonly ScoreBand[] = [
  { min: 85, label: "Interview-ready", tone: "excellent" },
  { min: 70, label: "Strong", tone: "good" },
  { min: 55, label: "Promising", tone: "fair" },
  { min: 40, label: "Needs practice", tone: "weak" },
  { min: 0, label: "Early days", tone: "low" },
];

export function scoreBand(score: number): ScoreBand {
  return SCORE_BANDS.find((band) => score >= band.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1]!;
}

export function weightedOverall(scores: Record<DimensionKey, number>): number {
  let total = 0;
  for (const key of DIMENSIONS) total += scores[key] * DIMENSION_INFO[key].weight;
  return Math.round(total);
}

export function getRole(id: string): RoleInfo | undefined {
  return ROLES.find((role) => role.id === id);
}

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as readonly string[]).includes(value);
}

export const LIMITS = {
  minQuestions: 3,
  maxQuestions: 12,
  maxFollowUpsRatio: 0.5,
  maxAnswerChars: 8000,
  maxJobDescriptionChars: 6000,
  minTimePerQuestionSec: 60,
  maxTimePerQuestionSec: 600,
} as const;
