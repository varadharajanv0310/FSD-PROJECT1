import type { Difficulty, RoleId } from "@poise/shared";

export interface BankPoint {
  /** Human-readable key point shown in feedback. */
  point: string;
  /**
   * Lowercase fragments that signal the point was covered. Fragments are
   * matched as substrings of the normalized answer, so "cach" matches both
   * "cache" and "caching".
   */
  terms: string[];
}

export type BankQuestionType = "technical" | "behavioral" | "system-design";

export interface BankQuestion {
  id: string;
  /** Roles this question suits; "*" means every role. */
  roles: RoleId[] | "*";
  type: BankQuestionType;
  category: string;
  difficulty: Difficulty;
  text: string;
  hint: string;
  points: BankPoint[];
  /** A concise, first-person reference answer. */
  answer: string;
}
