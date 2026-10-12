import type { RoleId } from "@poise/shared";
import { BEHAVIORAL_QUESTIONS } from "./behavioral";
import { DATA_QUESTIONS } from "./data";
import { ENGINEERING_QUESTIONS } from "./engineering";
import { SPECIALIST_QUESTIONS } from "./specialist";
import { SYSTEM_DESIGN_QUESTIONS } from "./system-design";
import type { BankQuestion, BankQuestionType } from "./types";

export type { BankPoint, BankQuestion, BankQuestionType } from "./types";

export const QUESTION_BANK: readonly BankQuestion[] = [
  ...BEHAVIORAL_QUESTIONS,
  ...ENGINEERING_QUESTIONS,
  ...DATA_QUESTIONS,
  ...SPECIALIST_QUESTIONS,
  ...SYSTEM_DESIGN_QUESTIONS,
];

export function bankFor(role: RoleId, type: BankQuestionType): BankQuestion[] {
  return QUESTION_BANK.filter(
    (question) => question.type === type && (question.roles === "*" || question.roles.includes(role)),
  );
}

const byText = new Map(QUESTION_BANK.map((question) => [question.text.toLowerCase(), question]));

/** Finds the bank entry for a question text, if it came from the bank. */
export function findBankQuestion(text: string): BankQuestion | undefined {
  return byText.get(text.toLowerCase());
}
