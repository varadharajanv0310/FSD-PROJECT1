import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authRouter } from "./routes/auth.routes";
import { interviewRouter } from "./routes/interview.routes";
import { metaRouter } from "./routes/meta.routes";
import { practiceRouter } from "./routes/practice.routes";

/** Locates the built client so one process can serve the whole app in production. */
function clientDistPath(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [resolve(here, "../../client/dist"), resolve(process.cwd(), "../client/dist"), resolve(process.cwd(), "client/dist")];
  return candidates.find((path) => existsSync(resolve(path, "index.html"))) ?? null;
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "img-src": ["'self'", "data:", "blob:"],
          "media-src": ["'self'", "blob:"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "font-src": ["'self'", "data:"],
          "connect-src": ["'self'"],
          // HTTPS is enforced by the hosting platform; upgrading here would
          // break running a production build locally over plain HTTP.
          "upgrade-insecure-requests": null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProduction ? "combined" : "dev"));

  app.use("/api", metaRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/interviews", interviewRouter);
  app.use("/api/practice", practiceRouter);
  app.use("/api", notFoundHandler);

  const serveClient = env.SERVE_CLIENT ?? env.isProduction;
  const dist = serveClient ? clientDistPath() : null;
  if (dist) {
    app.use(express.static(dist, { index: false, maxAge: "1y", immutable: true }));
    // Client-side routing: every non-API GET returns the SPA shell.
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(dist, "index.html"), { maxAge: 0 }));
  }

  app.use(errorHandler);
  return app;
}
