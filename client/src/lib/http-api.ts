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

import { ApiError } from "./api-error";
import { readDevice, writeDevice, type DeviceCredentials } from "./device";

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

export const httpApi = {
  // Profile (no sign-up: each browser has its own profile)
  currentUser: () => request<{ user: User | null }>("GET", "/auth/session"),
  /** Restores this browser's profile, or creates one the first time. */
  startSession: async (): Promise<{ user: User }> => {
    const start = (device: DeviceCredentials | undefined) =>
      request<{ user: User; deviceKey?: string }>("POST", "/auth/guest", { device });
    const result = await start(readDevice()).catch((error: unknown) => {
      // A malformed stored key can never succeed — forget it and start a new profile.
      if (error instanceof ApiError && error.status === 400) {
        writeDevice(null);
        return start(undefined);
      }
      throw error;
    });
    if (result.deviceKey) writeDevice({ id: result.user.id, key: result.deviceKey });
    return { user: result.user };
  },
  updateProfile: (update: {
    name?: string;
    targetRole?: User["targetRole"] | null;
    level?: User["level"] | null;
    preferences?: Partial<UserPreferences>;
  }) => request<{ user: User }>("PATCH", "/auth/me", update),
  /** Permanently erases the profile and everything in it. */
  deleteAccount: async () => {
    await request<void>("DELETE", "/auth/me");
    writeDevice(null);
  },

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
  loadSampleHistory: () => request<{ added: number }>("POST", "/interviews/sample"),
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
