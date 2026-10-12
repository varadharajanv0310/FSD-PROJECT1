import type { DraftQuestion, QuestionContext } from "../ai/types";
import type { StoredQuestion, StoredSession } from "../models/InterviewSession";
import { shortId } from "./ids";

/**
 * A session as plain data — the shape both MongoDB documents and the
 * standalone build's local records satisfy. Dates may be `Date` objects
 * (from MongoDB) or ISO strings (from browser storage).
 */
export type SessionRecord = Omit<StoredSession, "user" | "startedAt" | "completedAt" | "createdAt" | "updatedAt"> & {
  startedAt: Date | string;
  completedAt?: Date | string;
};

export type WithId<T> = T & { _id: { toString(): string } | string };

export function toStoredQuestion(draft: DraftQuestion, kind: StoredQuestion["kind"], parentId?: string): StoredQuestion {
  return {
    id: shortId(),
    text: draft.text,
    category: draft.category,
    kind,
    parentId,
    difficulty: draft.difficulty,
    hint: draft.hint,
    keyPoints: draft.keyPoints,
    referenceAnswer: draft.referenceAnswer,
  };
}

export function questionContext(question: StoredQuestion): QuestionContext {
  return {
    text: question.text,
    category: question.category,
    kind: question.kind,
    keyPoints: question.keyPoints,
    referenceAnswer: question.referenceAnswer,
  };
}
