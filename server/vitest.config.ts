import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      MONGODB_URI: process.env.MONGODB_URI_TEST ?? "mongodb://127.0.0.1:27017/poise_test",
      JWT_SECRET: "test-secret-that-is-long-enough",
      AI_PROVIDER: "local",
    },
  },
});
