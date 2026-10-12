import { Router } from "express";
import { env } from "../config/env";
import { clearAuthCookie, currentUserId, optionalUserId, requireAuth, setAuthCookie, signToken } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import {
  authenticate,
  changePassword,
  deleteAccount,
  getUser,
  registerUser,
  updateProfile,
} from "../services/auth.service";
import { ensureDemoUser } from "../services/demo.service";
import { forbidden } from "../utils/errors";
import { LoginSchema, PasswordSchema, ProfileSchema, RegisterSchema } from "./schemas";

export const authRouter = Router();

authRouter.post("/register", authLimiter, validateBody(RegisterSchema), async (req, res) => {
  const user = await registerUser(req.body);
  setAuthCookie(res, signToken(user.id));
  res.status(201).json({ user });
});

authRouter.post("/login", authLimiter, validateBody(LoginSchema), async (req, res) => {
  const user = await authenticate(req.body.email, req.body.password);
  setAuthCookie(res, signToken(user.id));
  res.json({ user });
});

authRouter.post("/demo", authLimiter, async (_req, res) => {
  if (!env.DEMO_ACCOUNT) throw forbidden("The demo account is disabled on this server.");
  const userId = await ensureDemoUser();
  setAuthCookie(res, signToken(userId));
  res.json({ user: await getUser(userId) });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

/** The current session, if any — returns `{ user: null }` for guests instead of a 401. */
authRouter.get("/session", async (req, res) => {
  const userId = optionalUserId(req);
  const user = userId ? await getUser(userId).catch(() => null) : null;
  res.json({ user });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: await getUser(currentUserId(req)) });
});

authRouter.patch("/me", requireAuth, validateBody(ProfileSchema), async (req, res) => {
  res.json({ user: await updateProfile(currentUserId(req), req.body) });
});

authRouter.post("/password", requireAuth, authLimiter, validateBody(PasswordSchema), async (req, res) => {
  await changePassword(currentUserId(req), req.body.currentPassword, req.body.newPassword);
  res.status(204).end();
});

authRouter.delete("/me", requireAuth, async (req, res) => {
  await deleteAccount(currentUserId(req));
  clearAuthCookie(res);
  res.status(204).end();
});
