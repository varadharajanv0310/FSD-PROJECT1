import { Schema, Types, model } from "mongoose";
import { DIFFICULTIES, INTERVIEW_TYPES, ROLE_IDS, type Difficulty, type InterviewType, type RoleId } from "@poise/shared";

export interface StoredSavedQuestion {
  user: Types.ObjectId;
  text: string;
  category: string;
  difficulty: Difficulty;
  hint: string;
  keyPoints: string[];
  sampleAnswer?: string;
  role: RoleId;
  type: InterviewType;
  createdAt: Date;
  updatedAt: Date;
}

const SavedQuestionSchema = new Schema<StoredSavedQuestion>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 600 },
    category: { type: String, required: true, maxlength: 80 },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    hint: { type: String, default: "" },
    keyPoints: { type: [String], default: [] },
    sampleAnswer: { type: String },
    role: { type: String, enum: ROLE_IDS, required: true },
    type: { type: String, enum: INTERVIEW_TYPES, required: true },
  },
  { timestamps: true },
);

SavedQuestionSchema.index({ user: 1, text: 1 }, { unique: true });
SavedQuestionSchema.index({ user: 1, createdAt: -1 });

export const SavedQuestionModel = model<StoredSavedQuestion>("SavedQuestion", SavedQuestionSchema);
