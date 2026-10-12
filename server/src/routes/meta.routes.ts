import { Router } from "express";
import mongoose from "mongoose";
import { engineStatus } from "../ai";
import { currentUserId, requireAuth } from "../middleware/auth";
import { dashboardStats } from "../services/stats.service";

export const metaRouter = Router();

metaRouter.get("/health", (_req, res) => {
  const database = mongoose.connection.readyState === 1 ? "up" : "down";
  res.status(database === "up" ? 200 : 503).json({ status: database === "up" ? "ok" : "degraded", database });
});

metaRouter.get("/engine", (_req, res) => {
  res.json({ engine: engineStatus() });
});

metaRouter.get("/stats", requireAuth, async (req, res) => {
  const timeZone = typeof req.query.tz === "string" ? req.query.tz : undefined;
  res.json({ stats: await dashboardStats(currentUserId(req), timeZone) });
});
