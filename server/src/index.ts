import { env } from "./config/env";
import { engineStatus } from "./ai";
import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./db/connect";
import { resumeUnfinishedWork } from "./services/interview.service";
import { logger } from "./utils/logger";

async function main() {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    const engine = engineStatus();
    logger.info(`Poise API listening on http://localhost:${env.PORT}`);
    logger.info(`AI engine: ${engine.label}${engine.provider === "local" ? " (set ANTHROPIC_API_KEY to enable Claude)" : ""}`);
    if (env.jwtSecretIsEphemeral) logger.warn("JWT_SECRET is not set — using a temporary secret; sign-ins reset on restart.");
  });

  await resumeUnfinishedWork();

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down.`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("Failed to start the server.", error instanceof Error ? error.message : error);
  process.exit(1);
});
