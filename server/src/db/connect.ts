import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../utils/logger";

mongoose.set("strictQuery", true);

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  try {
    const connection = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    logger.info(`MongoDB connected → ${redact(uri)}`);
    return connection;
  } catch (error) {
    logger.error(`Could not connect to MongoDB at ${redact(uri)}.`);
    logger.error(
      "Start one with `docker compose up -d mongo`, or set MONGODB_URI to a MongoDB Atlas connection string.",
    );
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

/** Hides credentials when logging a connection string. */
function redact(uri: string): string {
  return uri.replace(/\/\/([^@/]+)@/, "//•••@");
}
