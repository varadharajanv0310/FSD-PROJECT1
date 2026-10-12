import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import type { ExperienceLevel, RoleId, User, UserPreferences } from "@poise/shared";
import { InterviewSessionModel } from "../models/InterviewSession";
import { SavedQuestionModel } from "../models/SavedQuestion";
import { UserModel } from "../models/User";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../utils/errors";
import { serializeUser } from "../core/serialize";

const SALT_ROUNDS = 12;
/** Device keys are 256-bit random secrets, so a cheaper bcrypt cost is plenty. */
const DEVICE_KEY_ROUNDS = 10;

export interface DeviceCredentials {
  id: string;
  key: string;
}

/**
 * Starts a session without sign-up. Each browser gets its own private profile,
 * identified by a random device key that the browser keeps. Presenting the key
 * again restores the same profile — after the session cookie expires, or when
 * the server's signing secret changes. Without a valid key, a new profile is
 * created and its key returned once.
 */
export async function startGuestSession(device?: DeviceCredentials): Promise<{ user: User; deviceKey?: string }> {
  if (device) {
    const existing = await UserModel.findById(device.id).select("+passwordHash").lean();
    if (existing?.isGuest && (await bcrypt.compare(device.key, existing.passwordHash))) {
      return { user: serializeUser(existing) };
    }
  }
  const deviceKey = randomBytes(32).toString("hex");
  const id = new Types.ObjectId();
  const user = await UserModel.create({
    _id: id,
    // Never shown or used to sign in; it only satisfies the unique email index.
    email: `${id.toString()}@guest.poise.invalid`,
    passwordHash: await bcrypt.hash(deviceKey, DEVICE_KEY_ROUNDS),
    isGuest: true,
  });
  return { user: serializeUser(user.toObject()), deviceKey };
}

export async function registerUser(input: { name: string; email: string; password: string }): Promise<User> {
  const email = input.email.toLowerCase().trim();
  if (await UserModel.exists({ email })) throw conflict("An account with this email already exists. Try signing in.");
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await UserModel.create({ name: input.name.trim(), email, passwordHash });
  return serializeUser(user.toObject());
}

export async function authenticate(email: string, password: string): Promise<User> {
  const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash").lean();
  // Compare against a dummy hash when the user doesn't exist, so response
  // timing doesn't reveal which emails are registered.
  const hash = user?.passwordHash ?? "$2b$12$mVcjQC1zxA6B.wTMU.M9Te87/pnpeM121jvR4V9/ljQV2x2Zlt5Ki";
  const valid = await bcrypt.compare(password, hash);
  if (!user || !valid) throw unauthorized("That email and password don't match.");
  return serializeUser(user);
}

export async function getUser(userId: string): Promise<User> {
  const user = await UserModel.findById(userId).lean();
  if (!user) throw unauthorized("We couldn't find your profile. Refresh the page to continue.");
  return serializeUser(user);
}

export interface ProfileUpdate {
  name?: string;
  targetRole?: RoleId | null;
  level?: ExperienceLevel | null;
  preferences?: Partial<UserPreferences>;
}

export async function updateProfile(userId: string, update: ProfileUpdate): Promise<User> {
  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  if (update.name !== undefined) set.name = update.name.trim();
  if (update.targetRole !== undefined) {
    if (update.targetRole === null) unset.targetRole = "";
    else set.targetRole = update.targetRole;
  }
  if (update.level !== undefined) {
    if (update.level === null) unset.level = "";
    else set.level = update.level;
  }
  for (const [key, value] of Object.entries(update.preferences ?? {})) set[`preferences.${key}`] = value;

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true, runValidators: true },
  ).lean();
  if (!user) throw notFound("Account not found.");
  return serializeUser(user);
}

export async function changePassword(userId: string, current: string, next: string): Promise<void> {
  const user = await UserModel.findById(userId).select("+passwordHash");
  if (!user) throw notFound("Account not found.");
  if (user.isDemo) throw forbidden("The demo account's password can't be changed.");
  if (!(await bcrypt.compare(current, user.passwordHash))) throw badRequest("Your current password is incorrect.");
  user.passwordHash = await bcrypt.hash(next, SALT_ROUNDS);
  await user.save();
}

/** Permanently deletes the account and every interview and saved question. */
export async function deleteAccount(userId: string): Promise<void> {
  const user = await UserModel.findById(userId).lean();
  if (!user) throw notFound("Account not found.");
  if (user.isDemo) throw forbidden("The shared demo account can't be deleted.");
  await Promise.all([
    InterviewSessionModel.deleteMany({ user: userId }),
    SavedQuestionModel.deleteMany({ user: userId }),
    UserModel.deleteOne({ _id: userId }),
  ]);
}
