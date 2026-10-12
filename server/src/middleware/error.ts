import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import type { ApiErrorBody } from "@poise/shared";
import { HttpError } from "../utils/errors";
import { logger } from "../utils/logger";

function send(res: Response, status: number, body: ApiErrorBody) {
  res.status(status).json(body);
}

export function notFoundHandler(req: Request, res: Response) {
  send(res, 404, { error: { code: "not_found", message: `No route for ${req.method} ${req.path}` } });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    return send(res, error.status, {
      error: { code: error.code, message: error.message, details: error.details },
    });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const field = first?.path.join(".");
    return send(res, 400, {
      error: {
        code: "validation_error",
        message: first ? `${field ? `${field}: ` : ""}${first.message}` : "Invalid request.",
        details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    });
  }
  if (error instanceof mongoose.Error.CastError) {
    return send(res, 404, { error: { code: "not_found", message: "We couldn't find that." } });
  }
  if (isDuplicateKeyError(error)) {
    return send(res, 409, { error: { code: "conflict", message: "That already exists." } });
  }
  if (isBodyParseError(error)) {
    return send(res, 400, { error: { code: "bad_request", message: "The request body isn't valid JSON." } });
  }

  logger.error("Unhandled error", error);
  send(res, 500, { error: { code: "internal_error", message: "Something went wrong on our side." } });
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

function isBodyParseError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { type?: string }).type === "entity.parse.failed";
}
