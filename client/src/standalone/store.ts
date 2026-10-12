import type { ExperienceLevel, InterviewType, RoleId, SavedQuestion, UserPreferences } from "@poise/shared";
import type { SessionRecord } from "@server/core/session";

/**
 * Device-local persistence for the standalone build. Everything lives in one
 * JSON document in localStorage; if storage is unavailable (private mode,
 * blocked site data, sandboxed previews) the app keeps working in memory for
 * the rest of the visit.
 */

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  targetRole?: RoleId;
  level?: ExperienceLevel;
  isDemo: boolean;
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

/**
 * Hashes a password for local storage. This preview never sends credentials
 * anywhere; hashing just avoids keeping them in plain text on the device.
 */
export async function hashPassword(email: string, password: string): Promise<string> {
  const input = `poise:${email.toLowerCase()}:${password}`;
  const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for contexts without Web Crypto: a simple 53-bit string hash.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return `fallback:${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)}`;
}
