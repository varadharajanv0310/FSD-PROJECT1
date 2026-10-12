import type { DashboardStats } from "@poise/shared";
import { computeDashboardStats } from "../core/stats";
import { InterviewSessionModel } from "../models/InterviewSession";

export async function dashboardStats(userId: string, timeZone?: string): Promise<DashboardStats> {
  const sessions = await InterviewSessionModel.find(
    { user: userId },
    { "questions.referenceAnswer": 0, "questions.evaluation.sampleAnswer": 0, "questions.hint": 0 },
  ).lean();
  return computeDashboardStats(sessions, timeZone);
}
