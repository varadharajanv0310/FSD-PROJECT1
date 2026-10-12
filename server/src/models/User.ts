import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { LEVELS, ROLE_IDS } from "@poise/shared";

const PreferencesSchema = new Schema(
  {
    autoReadQuestions: { type: Boolean, default: true },
    voiceRate: { type: Number, default: 1, min: 0.6, max: 1.6 },
    showLiveMetrics: { type: Boolean, default: true },
    cameraByDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    // Optional: browser profiles start without a name until the user sets one.
    name: { type: String, trim: true, maxlength: 80, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    passwordHash: { type: String, required: true, select: false },
    targetRole: { type: String, enum: ROLE_IDS },
    level: { type: String, enum: LEVELS },
    isDemo: { type: Boolean, default: false },
    isGuest: { type: Boolean, default: false },
    preferences: { type: PreferencesSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export type UserRecord = InferSchemaType<typeof UserSchema>;
export type UserDocument = HydratedDocument<UserRecord>;
export const UserModel = model("User", UserSchema);
