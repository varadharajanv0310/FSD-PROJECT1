export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, "bad_request", message, details);
export const unauthorized = (message = "Your session has ended. Refresh the page to continue.") =>
  new HttpError(401, "unauthorized", message);
export const forbidden = (message = "You don't have access to this resource.") =>
  new HttpError(403, "forbidden", message);
export const notFound = (message = "We couldn't find that.") => new HttpError(404, "not_found", message);
export const conflict = (message: string) => new HttpError(409, "conflict", message);
