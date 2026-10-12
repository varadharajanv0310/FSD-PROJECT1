import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

/** Parses and replaces `req.body` with the schema's output, or forwards a 400. */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}
