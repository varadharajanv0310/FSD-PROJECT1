import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { HttpError } from "../utils/errors";

/** Rejects requests whose body isn't JSON — which cross-site forms can't send. */
export function requireJson(req: Request, _res: Response, next: NextFunction) {
  if (req.is("application/json")) return next();
  next(new HttpError(415, "unsupported_media_type", "Send this request as JSON."));
}

/** Parses and replaces `req.body` with the schema's output, or forwards a 400. */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}
