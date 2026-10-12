import { Router } from "express";
import { Types } from "mongoose";
import { currentUserId, requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import { SavedQuestionModel } from "../models/SavedQuestion";
import { evaluatePracticeAnswer, generatePracticeQuestions } from "../services/practice.service";
import { serializeSavedQuestion } from "../core/serialize";
import { notFound } from "../utils/errors";
import { PracticeEvaluateSchema, PracticeQuestionsSchema, SaveQuestionSchema } from "./schemas";

export const practiceRouter = Router();
practiceRouter.use(requireAuth);

practiceRouter.post("/questions", aiLimiter, validateBody(PracticeQuestionsSchema), async (req, res) => {
  res.json(await generatePracticeQuestions(req.body));
});

practiceRouter.post("/evaluate", aiLimiter, validateBody(PracticeEvaluateSchema), async (req, res) => {
  res.json(await evaluatePracticeAnswer(req.body));
});

practiceRouter.get("/saved", async (req, res) => {
  const saved = await SavedQuestionModel.find({ user: currentUserId(req) }).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ questions: saved.map(serializeSavedQuestion) });
});

practiceRouter.post("/saved", validateBody(SaveQuestionSchema), async (req, res) => {
  const user = currentUserId(req);
  const saved = await SavedQuestionModel.findOneAndUpdate(
    { user, text: req.body.text },
    { $set: { ...req.body, user } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  res.status(201).json({ question: serializeSavedQuestion(saved) });
});

practiceRouter.delete("/saved/:id", async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.id)) throw notFound();
  const result = await SavedQuestionModel.deleteOne({ _id: req.params.id, user: currentUserId(req) });
  if (result.deletedCount === 0) throw notFound();
  res.status(204).end();
});
