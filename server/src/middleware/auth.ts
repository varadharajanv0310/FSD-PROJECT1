import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { unauthorized } from "../utils/errors";

export const AUTH_COOKIE = "poise_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

interface TokenPayload {
  sub: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
}

function readToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[AUTH_COOKIE] as string | undefined;
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return undefined;
}

/** Rejects the request unless it carries a valid session. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.userId = payload.sub;
    next();
  } catch {
    next(unauthorized("Your session has expired. Refresh the page to continue."));
  }
}

/** Returns the signed-in user's id when the request carries a valid session. */
export function optionalUserId(req: Request): string | undefined {
  const token = readToken(req);
  if (!token) return undefined;
  try {
    return (jwt.verify(token, env.JWT_SECRET) as TokenPayload).sub;
  } catch {
    return undefined;
  }
}

/** Narrows `req.userId` for handlers mounted behind `requireAuth`. */
export function currentUserId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
