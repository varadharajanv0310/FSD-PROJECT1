/**
 * A small skills dictionary used by the offline engine to tailor questions
 * to a pasted job description. Each entry is [display name, ...aliases].
 */
const SKILLS: string[][] = [
  ["React", "react", "react.js", "reactjs"],
  ["Angular", "angular"],
  ["Vue", "vue", "vue.js", "vuejs"],
  ["Next.js", "next.js", "nextjs"],
  ["Node.js", "node.js", "nodejs", "node"],
  ["Express", "express", "express.js"],
  ["TypeScript", "typescript"],
  ["JavaScript", "javascript"],
  ["Python", "python"],
  ["Java", "java"],
  ["Spring Boot", "spring boot", "spring"],
  ["C++", "c++"],
  ["Go", "golang"],
  ["Rust", "rust"],
  ["Kotlin", "kotlin"],
  ["Swift", "swift", "swiftui"],
  ["Flutter", "flutter", "dart"],
  ["React Native", "react native"],
  ["SQL", "sql"],
  ["PostgreSQL", "postgresql", "postgres"],
  ["MySQL", "mysql"],
  ["MongoDB", "mongodb", "mongo"],
  ["Redis", "redis"],
  ["GraphQL", "graphql"],
  ["REST APIs", "rest api", "restful", "rest apis"],
  ["Docker", "docker"],
  ["Kubernetes", "kubernetes", "k8s"],
  ["AWS", "aws", "amazon web services"],
  ["Azure", "azure"],
  ["Google Cloud", "gcp", "google cloud"],
  ["Terraform", "terraform"],
  ["CI/CD", "ci/cd", "continuous integration", "continuous delivery"],
  ["Kafka", "kafka"],
  ["Microservices", "microservices", "microservice"],
  ["Machine learning", "machine learning", "ml models"],
  ["Deep learning", "deep learning", "neural network"],
  ["TensorFlow", "tensorflow"],
  ["PyTorch", "pytorch"],
  ["scikit-learn", "scikit-learn", "sklearn"],
  ["Pandas", "pandas"],
  ["Tableau", "tableau"],
  ["Power BI", "power bi", "powerbi"],
  ["Excel", "excel", "spreadsheets"],
  ["Statistics", "statistics", "statistical"],
  ["A/B testing", "a/b test", "a/b testing", "experimentation"],
  ["NLP", "nlp", "natural language processing"],
  ["Computer vision", "computer vision"],
  ["Spark", "spark", "pyspark"],
  ["Airflow", "airflow"],
  ["Figma", "figma"],
  ["User research", "user research", "usability testing"],
  ["Prototyping", "prototyping", "prototype"],
  ["Design systems", "design system", "design systems"],
  ["Accessibility", "accessibility", "wcag", "a11y"],
  ["Agile", "agile", "scrum"],
  ["Product analytics", "product analytics", "mixpanel", "amplitude"],
  ["HTML & CSS", "html", "css"],
  ["Tailwind CSS", "tailwind"],
  ["Redux", "redux"],
  ["Automated testing", "jest", "cypress", "playwright", "unit testing", "test automation"],
  ["Git", "git", "github"],
  ["Data structures & algorithms", "data structures", "algorithms", "dsa"],
  ["System design", "system design", "distributed systems", "scalable systems"],
  ["Security", "security", "oauth", "authentication"],
  ["Firebase", "firebase"],
  ["Android", "android"],
  ["iOS", "ios"],
  ["Django", "django"],
  ["FastAPI", "fastapi"],
  ["Flask", "flask"],
  [".NET", ".net", "c#", "asp.net"],
  ["Linux", "linux", "bash", "shell scripting"],
  ["Stakeholder management", "stakeholder", "stakeholders"],
  ["Roadmapping", "roadmap", "roadmapping"],
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

const MATCHERS = SKILLS.map(([display, ...aliases]) => ({
  display: display!,
  pattern: new RegExp(
    `(^|[^a-z0-9+#.])(${aliases.map(escapeRegExp).join("|")})(?=$|[^a-z0-9+#])`,
    "g",
  ),
}));

/** Returns up to `limit` skills mentioned in the text, most frequent first. */
export function extractSkills(text: string, limit = 4): string[] {
  const lower = text.toLowerCase();
  return MATCHERS.map(({ display, pattern }) => ({ display, count: lower.match(pattern)?.length ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => entry.display);
}
