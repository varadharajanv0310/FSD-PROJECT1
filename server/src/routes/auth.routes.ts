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
  startGuestSession,
  updateProfile,
} from "../services/auth.service";
import { ensureDemoUser } from "../services/demo.service";
import { forbidden } from "../utils/errors";
import { GuestSchema, LoginSchema, PasswordSchema, ProfileSchema, RegisterSchema } from "./schemas";

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

/**
 * Starts a session without sign-up: restores this browser's profile from its
 * device key, or creates a new profile and returns its key (once).
 */
authRouter.post("/guest", authLimiter, validateBody(GuestSchema), async (req, res) => {
  const { user, deviceKey } = await startGuestSession(req.body.device);
  setAuthCookie(res, signToken(user.id));
  res.status(deviceKey ? 201 : 200).json(deviceKey ? { user, deviceKey } : { user });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

/**
 * The current session, if any — returns `{ user: null }` instead of a 401 when
 * there is none. An active session is renewed, so regular visitors stay signed in.
 */
authRouter.get("/session", async (req, res) => {
  const userId = optionalUserId(req);
  const user = userId ? await getUser(userId).catch(() => null) : null;
  if (user) setAuthCookie(res, signToken(user.id));
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
