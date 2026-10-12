import type { ExperienceLevel, InterviewType, RoleId, SavedQuestion, UserPreferences } from "@poise/shared";
import type { SessionRecord } from "@server/core/session";

/**
 * Device-local persistence for the standalone build. Everything lives in one
 * JSON document in localStorage; if storage is unavailable (private mode,
 * blocked site data, sandboxed previews) the app keeps working in memory for
 * the rest of the visit.
 */

/** The profile for this device. There's no sign-up, so it has no email or password. */
export interface LocalUser {
  id: string;
  name: string;
  targetRole?: RoleId;
  level?: ExperienceLevel;
  preferences: UserPreferences;
  createdAt: string;
}

export type LocalSession = SessionRecord & { _id: string; userId: string };

export type LocalSavedQuestion = Omit<SavedQuestion, "role" | "type"> & {
  role: RoleId;
  type: InterviewType;
  userId: string;
};

interface State {
  version: 1;
  users: LocalUser[];
  currentUserId: string | null;
  sessions: LocalSession[];
  saved: LocalSavedQuestion[];
}

const KEY = "poise:standalone:v1";

function emptyState(): State {
  return { version: 1, users: [], currentUserId: null, sessions: [], saved: [] };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as State;
    return parsed?.version === 1 ? parsed : emptyState();
  } catch {
    return emptyState();
  }
}

let state: State = load();

export const store = {
  get state(): Readonly<State> {
    return state;
  },
  /** Applies a change and persists it (best effort). */
  update(change: (draft: State) => void): void {
    change(state);
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — keep the in-memory copy */
    }
  },
  /** Wipes everything this preview has stored on the device. */
  reset(): void {
    state = emptyState();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
  },
};

export function newId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID().replace(/-/g, "").slice(0, 24);
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}
