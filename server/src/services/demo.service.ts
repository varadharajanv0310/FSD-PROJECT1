import bcrypt from "bcryptjs";
import { localEngine } from "../ai";
import { DEMO_PROFILE, buildDemoSessions } from "../core/demo";
import { InterviewSessionModel } from "../models/InterviewSession";
import { UserModel } from "../models/User";

export const DEMO_EMAIL = "demo@poise.app";
const DEMO_PASSWORD = "practice-makes-poise";

async function seedSessions(userId: string): Promise<void> {
  const sessions = await buildDemoSessions(localEngine);
  await InterviewSessionModel.insertMany(sessions.map((session) => ({ ...session, user: userId })));
}

/** Returns the demo user, creating it with realistic history on first use. */
export async function ensureDemoUser(): Promise<string> {
  const existing = await UserModel.findOne({ email: DEMO_EMAIL }).lean();
  if (existing) {
    const hasHistory = await InterviewSessionModel.exists({ user: existing._id });
    if (!hasHistory) await seedSessions(existing._id.toString());
    return existing._id.toString();
  }
  const user = await UserModel.create({
    ...DEMO_PROFILE,
    email: DEMO_EMAIL,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    isDemo: true,
  });
  await seedSessions(user._id.toString());
  return user._id.toString();
}

/** Clears and re-seeds demo history — used by `npm run seed`. */
export async function resetDemoUser(): Promise<string> {
  const existing = await UserModel.findOne({ email: DEMO_EMAIL }).lean();
  if (existing) await InterviewSessionModel.deleteMany({ user: existing._id });
  return ensureDemoUser();
}
