import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { InterviewSession } from "@poise/shared";
import { createApp } from "../src/app";

const uri = process.env.MONGODB_URI!;

/** API tests need MongoDB; they are skipped (not failed) when it isn't running. */
async function canConnect(): Promise<boolean> {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
    return true;
  } catch {
    return false;
  }
}

const available = await canConnect();
if (!available) console.warn(`\n  ⚠ Skipping API tests — no MongoDB at ${uri}. Start one with \`docker compose up -d mongo\`.\n`);

const app = createApp();

function agent() {
  return request.agent(app);
}

async function signUp(email = `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`) {
  const client = agent();
  const response = await client.post("/api/auth/register").send({ name: "Test Candidate", email, password: "correct-horse" });
  expect(response.status).toBe(201);
  return { client, email, user: response.body.user };
}

const config = {
  role: "backend",
  type: "mixed",
  level: "entry",
  difficulty: "medium",
  questionCount: 3,
  answerMode: "text",
  adaptiveFollowUps: true,
  timePerQuestionSec: 120,
};

async function waitForReport(client: ReturnType<typeof agent>, id: string): Promise<InterviewSession> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await client.get(`/api/interviews/${id}`);
    if (response.body.session.status === "completed") return response.body.session;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Report was not generated in time");
}

describe.skipIf(!available)("API", () => {
  beforeAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe("auth", () => {
    it("registers, reads the session and signs out", async () => {
      const { client, email } = await signUp();
      const me = await client.get("/api/auth/me");
      expect(me.status).toBe(200);
      expect(me.body.user.email).toBe(email);
      expect(me.body.user).not.toHaveProperty("passwordHash");

      await client.post("/api/auth/logout").expect(204);
      expect((await client.get("/api/auth/session")).body.user).toBeNull();
      expect((await client.get("/api/auth/me")).status).toBe(401);
    });

    it("rejects duplicate emails and bad passwords", async () => {
      const { email } = await signUp();
      const duplicate = await agent().post("/api/auth/register").send({ name: "Again", email, password: "correct-horse" });
      expect(duplicate.status).toBe(409);
      const wrong = await agent().post("/api/auth/login").send({ email, password: "wrong-password" });
      expect(wrong.status).toBe(401);
      const right = await agent().post("/api/auth/login").send({ email, password: "correct-horse" });
      expect(right.status).toBe(200);
    });

    it("validates input", async () => {
      const response = await agent().post("/api/auth/register").send({ name: "", email: "nope", password: "short" });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("validation_error");
    });

    it("updates the profile and preferences", async () => {
      const { client } = await signUp();
      const response = await client
        .patch("/api/auth/me")
        .send({ targetRole: "frontend", level: "intern", preferences: { voiceRate: 1.2, showLiveMetrics: false } });
      expect(response.status).toBe(200);
      expect(response.body.user.targetRole).toBe("frontend");
      expect(response.body.user.preferences).toMatchObject({ voiceRate: 1.2, showLiveMetrics: false, autoReadQuestions: true });
    });
  });

  describe("interview lifecycle", () => {
    it("runs an interview end to end and produces a report", async () => {
      const { client } = await signUp();
      const created = await client.post("/api/interviews").send(config);
      expect(created.status).toBe(201);
      let session: InterviewSession = created.body.session;
      expect(session.questions).toHaveLength(3);
      expect(session.questions[0]!.text).not.toBe("");
      expect(session.questions[1]!.text).toBe(""); // future questions stay hidden
      expect(session.questions[0]!.keyPoints).toBeUndefined();

      // A short first answer earns a follow-up; skip one question; answer the rest.
      let turn = 0;
      while (session.currentIndex < session.questions.length) {
        const question = session.questions[session.currentIndex]!;
        const answer =
          turn === 0
            ? "I'm a final-year student who builds web apps."
            : "During my internship our API was slow, so I decided to add Redis caching with a TTL. As a result latency dropped by 40 percent and I learned to measure first.";
        const response = await client
          .post(`/api/interviews/${session.id}/answers`)
          .send({ questionId: question.id, text: answer, durationSec: 40, mode: "text", skipped: turn === 2 });
        expect(response.status).toBe(200);
        session = response.body.session;
        turn++;
      }
      expect(session.questions.some((q) => q.kind === "follow-up")).toBe(true);
      expect(session.questions[0]!.keyPoints?.length).toBeGreaterThan(0);

      const completed = await client.post(`/api/interviews/${session.id}/complete`);
      expect(completed.status).toBe(200);
      const final = await waitForReport(client, session.id);
      expect(final.report!.overall).toBeGreaterThanOrEqual(0);
      expect(final.report!.skippedCount).toBe(1);
      expect(final.report!.practicePlan).toHaveLength(3);
      expect(final.questions.every((q) => q.evaluation?.status === "done")).toBe(true);

      const stats = await client.get("/api/stats?tz=Asia/Kolkata");
      expect(stats.body.stats.totals.completed).toBe(1);
      expect(stats.body.stats.trend).toHaveLength(1);
      expect(stats.body.stats.dimensions).not.toBeNull();

      const list = await client.get("/api/interviews?status=completed");
      expect(list.body.sessions[0].overall).toBe(final.report!.overall);
    });

    it("enforces question order and rejects empty answers", async () => {
      const { client } = await signUp();
      const { session } = (await client.post("/api/interviews").send({ ...config, adaptiveFollowUps: false })).body;
      const outOfOrder = await client
        .post(`/api/interviews/${session.id}/answers`)
        .send({ questionId: session.questions[1].id, text: "Hello", mode: "text" });
      expect(outOfOrder.status).toBe(409);
      const empty = await client
        .post(`/api/interviews/${session.id}/answers`)
        .send({ questionId: session.questions[0].id, text: "   ", mode: "text" });
      expect(empty.status).toBe(400);
      const finishEarly = await client.post(`/api/interviews/${session.id}/complete`);
      expect(finishEarly.status).toBe(400);
    });

    it("rejects system design for non-engineering roles", async () => {
      const { client } = await signUp();
      const response = await client.post("/api/interviews").send({ ...config, role: "product-manager", type: "system-design" });
      expect(response.status).toBe(400);
    });

    it("keeps interviews private to their owner", async () => {
      const owner = await signUp();
      const { session } = (await owner.client.post("/api/interviews").send(config)).body;
      const stranger = await signUp();
      expect((await stranger.client.get(`/api/interviews/${session.id}`)).status).toBe(404);
      expect((await stranger.client.delete(`/api/interviews/${session.id}`)).status).toBe(404);
      expect((await agent().get(`/api/interviews/${session.id}`)).status).toBe(401);
      await owner.client.delete(`/api/interviews/${session.id}`).expect(204);
    });
  });

  describe("question lab", () => {
    it("generates, evaluates and saves practice questions", async () => {
      const { client } = await signUp();
      const generated = await client
        .post("/api/practice/questions")
        .send({ role: "data-analyst", type: "technical", level: "entry", difficulty: "easy", count: 3 });
      expect(generated.status).toBe(200);
      expect(generated.body.questions).toHaveLength(3);
      const question = generated.body.questions[0];

      const evaluated = await client.post("/api/practice/evaluate").send({
        role: "data-analyst",
        type: "technical",
        level: "entry",
        difficulty: "easy",
        question,
        answer: "WHERE filters rows before grouping, HAVING filters groups after aggregation, for example COUNT.",
        mode: "text",
      });
      expect(evaluated.status).toBe(200);
      expect(evaluated.body.evaluation.overall).toBeGreaterThan(0);
      expect(evaluated.body.metrics.wordCount).toBeGreaterThan(5);

      const saved = await client.post("/api/practice/saved").send({ ...question, role: "data-analyst", type: "technical" });
      expect(saved.status).toBe(201);
      const again = await client.post("/api/practice/saved").send({ ...question, role: "data-analyst", type: "technical" });
      expect(again.status).toBe(201);
      const list = await client.get("/api/practice/saved");
      expect(list.body.questions).toHaveLength(1);
      await client.delete(`/api/practice/saved/${saved.body.question.id}`).expect(204);
    });
  });

  describe("demo and account deletion", () => {
    it("seeds the demo account with history", async () => {
      const client = agent();
      const response = await client.post("/api/auth/demo");
      expect(response.status).toBe(200);
      expect(response.body.user.isDemo).toBe(true);
      const stats = await client.get("/api/stats");
      expect(stats.body.stats.totals.completed).toBeGreaterThanOrEqual(5);
      expect((await client.delete("/api/auth/me")).status).toBe(403);
    });

    it("deletes an account and its data", async () => {
      const { client, email } = await signUp();
      await client.post("/api/interviews").send(config);
      await client.delete("/api/auth/me").expect(204);
      const login = await agent().post("/api/auth/login").send({ email, password: "correct-horse" });
      expect(login.status).toBe(401);
    });
  });

  it("reports health and engine status", async () => {
    expect((await agent().get("/api/health")).body.status).toBe("ok");
    expect((await agent().get("/api/engine")).body.engine.provider).toBe("local");
    expect((await agent().get("/api/nope")).status).toBe(404);
  });
});
