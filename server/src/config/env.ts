import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load `.env` from the current package and from the monorepo root, so the
// server works whether it is started from `server/` or from the repo root.
const envFiles = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../.env")].filter(existsSync);
if (envFiles.length > 0) dotenv.config({ path: envFiles, quiet: true });

const booleanish = z
  .enum(["true", "false", "1", "0", "yes", "no"])
  .transform((value) => ["true", "1", "yes"].includes(value));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/poise"),
  JWT_SECRET: z.string().min(16).optional(),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  AI_PROVIDER: z.enum(["auto", "claude", "local"]).default("auto"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  DEMO_ACCOUNT: booleanish.default(true),
  SERVE_CLIENT: booleanish.optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

const raw = parsed.data;

if (raw.NODE_ENV === "production" && !raw.JWT_SECRET) {
  console.error("JWT_SECRET is required in production (use at least 16 random characters).");
  process.exit(1);
}

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
  // In development a per-process secret keeps things working out of the box;
  // sessions simply reset when the server restarts.
  JWT_SECRET: raw.JWT_SECRET ?? randomBytes(32).toString("hex"),
  jwtSecretIsEphemeral: !raw.JWT_SECRET,
  corsOrigins: raw.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()),
};
