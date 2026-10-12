import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../config/env";

const message = {
  error: { code: "rate_limited", message: "You're going a little fast. Please wait a moment and try again." },
};

const keyByUserOrIp = (req: Request) => req.userId ?? ipKeyGenerator(req.ip ?? "unknown");

/** Brute-force protection for sign-in and sign-up. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
});

/**
 * Starting or restoring a browser profile happens on every first visit and
 * whenever a session lapses, so it gets a far larger budget than password
 * attempts — enough for many people behind one campus or office IP.
 */
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message,
});

/** Caps calls that hit the AI engine, per signed-in user. */
export const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: env.isTest ? 1000 : 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message,
});
