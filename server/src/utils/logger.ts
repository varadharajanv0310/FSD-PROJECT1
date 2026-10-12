/* A tiny levelled logger — enough for a single-service app without extra deps. */
type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level = process.env.NODE_ENV === "test" ? "warn" : process.env.LOG_LEVEL === "debug" ? "debug" : "info";

function log(level: Level, message: string, meta?: unknown) {
  if (order[level] < order[minLevel]) return;
  const time = new Date().toISOString().slice(11, 19);
  const line = `[${time}] ${level.toUpperCase().padEnd(5)} ${message}`;
  const stream = level === "error" || level === "warn" ? console.error : console.log;
  if (meta === undefined) stream(line);
  else stream(line, meta);
}

export const logger = {
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
};
