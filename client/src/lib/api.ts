import type {
  AnswerMetrics,
  AnswerMode,
  ApiErrorBody,
  DashboardStats,
  EngineKind,
  EngineStatus,
  GeneratedQuestion,
  InterviewConfig,
  InterviewSession,
  QuestionEvaluation,
  SavedQuestion,
  SessionSummary,
  User,
  UserPreferences,
} from "@poise/shared";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network_error", "We can't reach the server. Check your connection and try again.");
  }
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    throw new ApiError(response.status, error?.code ?? "error", error?.message ?? "Something went wrong.");
  }
  return data as T;
}

export const api = {
  // Auth
  currentUser: () => request<{ user: User | null }>("GET", "/auth/session"),
  login: (email: string, password: string) => request<{ user: User }>("POST", "/auth/login", { email, password }),
  register: (name: string, email: string, password: string) =>
    request<{ user: User }>("POST", "/auth/register", { name, email, password }),
  demo: () => request<{ user: User }>("POST", "/auth/demo"),
  logout: () => request<void>("POST", "/auth/logout"),
  updateProfile: (update: {
    name?: string;
    targetRole?: User["targetRole"] | null;
    level?: User["level"] | null;
    preferences?: Partial<UserPreferences>;
  }) => request<{ user: User }>("PATCH", "/auth/me", update),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("POST", "/auth/password", { currentPassword, newPassword }),
  deleteAccount: () => request<void>("DELETE", "/auth/me"),

  // Meta
  engine: () => request<{ engine: EngineStatus }>("GET", "/engine"),
  stats: () =>
    request<{ stats: DashboardStats }>(
      "GET",
      `/stats?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`,
    ),

  // Interviews
  sessions: (params: { status?: string; role?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    return request<{ sessions: SessionSummary[] }>("GET", `/interviews${query.size ? `?${query}` : ""}`);
  },
  session: (id: string) => request<{ session: InterviewSession }>("GET", `/interviews/${id}`),
  createSession: (config: InterviewConfig) => request<{ session: InterviewSession }>("POST", "/interviews", config),
  answer: (
    id: string,
    payload: { questionId: string; text: string; durationSec: number; mode: AnswerMode; skipped: boolean },
  ) => request<{ session: InterviewSession }>("POST", `/interviews/${id}/answers`, payload),
  complete: (id: string) => request<{ session: InterviewSession }>("POST", `/interviews/${id}/complete`),
  deleteSession: (id: string) => request<void>("DELETE", `/interviews/${id}`),

  // Practice lab
  practiceQuestions: (payload: {
    role: string;
    type: string;
    level: string;
    difficulty: string;
    count: number;
    jobDescription?: string;
    focusAreas?: string[];
  }) => request<{ questions: GeneratedQuestion[]; engine: EngineKind }>("POST", "/practice/questions", payload),
  practiceEvaluate: (payload: {
    role: string;
    type: string;
    level: string;
    difficulty: string;
    question: GeneratedQuestion;
    answer: string;
    durationSec: number;
    mode: AnswerMode;
  }) => request<{ metrics: AnswerMetrics; evaluation: QuestionEvaluation }>("POST", "/practice/evaluate", payload),
  savedQuestions: () => request<{ questions: SavedQuestion[] }>("GET", "/practice/saved"),
  saveQuestion: (payload: GeneratedQuestion & { role: string; type: string }) =>
    request<{ question: SavedQuestion }>("POST", "/practice/saved", payload),
  unsaveQuestion: (id: string) => request<void>("DELETE", `/practice/saved/${id}`),
};
