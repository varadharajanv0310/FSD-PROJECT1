import { Router } from "express";
import { z } from "zod";
import { ROLE_IDS } from "@poise/shared";
import { currentUserId, requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import {
  completeSession,
  createSession,
  deleteSession,
  getSession,
  listSessions,
  submitAnswer,
} from "../services/interview.service";
import { AnswerSchema, InterviewConfigSchema } from "./schemas";

export const interviewRouter = Router();
interviewRouter.use(requireAuth);

const ListQuery = z.object({
  status: z.enum(["in_progress", "evaluating", "completed"]).optional(),
  role: z.enum(ROLE_IDS).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

interviewRouter.get("/", async (req, res) => {
  const query = ListQuery.parse(req.query);
  res.json({ sessions: await listSessions(currentUserId(req), query) });
});

interviewRouter.post("/", aiLimiter, validateBody(InterviewConfigSchema), async (req, res) => {
  const session = await createSession(currentUserId(req), req.body);
  res.status(201).json({ session });
});

interviewRouter.get("/:id", async (req, res) => {
  res.json({ session: await getSession(currentUserId(req), req.params.id) });
});

interviewRouter.post("/:id/answers", aiLimiter, validateBody(AnswerSchema), async (req, res) => {
  res.json({ session: await submitAnswer(currentUserId(req), String(req.params.id), req.body) });
});

interviewRouter.post("/:id/complete", async (req, res) => {
  res.json({ session: await completeSession(currentUserId(req), req.params.id) });
});

interviewRouter.delete("/:id", async (req, res) => {
  await deleteSession(currentUserId(req), String(req.params.id));
  res.status(204).end();
});
