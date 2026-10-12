/**
 * Unsent interview answers, kept in this browser so a refresh never loses
 * them. Storage can be blocked, so every access is guarded.
 */
const PREFIX = "poise:draft:";

export const draftKey = (sessionId: string, questionId: string) => `${PREFIX}${sessionId}:${questionId}`;

export function readDraft(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable — drafts are a convenience only */
  }
}

/** Removes every saved draft, e.g. when the user erases their data. */
export function clearDrafts(): void {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(
      (key): key is string => key?.startsWith(PREFIX) ?? false,
    );
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* nothing to clear */
  }
}
