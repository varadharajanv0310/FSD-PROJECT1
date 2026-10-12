import { describe, expect, it } from "vitest";
import { analyzeAnswer, annotateAnswer, detectStar, stem } from "./analysis";

describe("analyzeAnswer", () => {
  it("counts fillers and hedges, including multi-word phrases", () => {
    const m = analyzeAnswer("Um, so basically I think the cache is, you know, kind of slow.");
    expect(m.fillerWords).toMatchObject({ um: 1, basically: 1, "you know": 1 });
    expect(m.fillerCount).toBe(3);
    expect(m.hedgeWords).toMatchObject({ "i think": 1, "kind of": 1 });
  });

  it("does not flag 'like' when it is a verb or comparison", () => {
    expect(analyzeAnswer("I like to use TypeScript, it works like a charm.").fillerCount).toBe(0);
    expect(analyzeAnswer("And like, it was like slow").fillerWords.like).toBe(2);
  });

  it("computes words per minute only for spoken answers", () => {
    const text = Array.from({ length: 150 }, () => "word").join(" ");
    expect(analyzeAnswer(text, { durationSec: 60, mode: "voice" }).wpm).toBe(150);
    expect(analyzeAnswer(text, { durationSec: 60, mode: "text" }).wpm).toBeNull();
  });

  it("estimates sentences for unpunctuated transcripts", () => {
    const text = Array.from({ length: 96 }, () => "word").join(" ");
    expect(analyzeAnswer(text).sentenceCount).toBe(6);
  });

  it("detects numbers and examples", () => {
    const m = analyzeAnswer("For example, we reduced latency by 40 percent.");
    expect(m.hasExample).toBe(true);
    expect(m.hasNumbers).toBe(true);
  });
});

describe("detectStar", () => {
  it("recognises each STAR component", () => {
    const star = detectStar(
      "During my internship our API was slow. My task was to fix it. I decided to add caching. As a result latency dropped 60%.",
    );
    expect(star).toEqual({ situation: true, task: true, action: true, result: true });
  });
});

describe("annotateAnswer", () => {
  it("preserves the original text exactly", () => {
    const text = "Um,  I mean we  basically shipped it.\nYou know?";
    expect(annotateAnswer(text).map((s) => s.text).join("")).toBe(text);
  });

  it("groups multi-word phrases into one segment", () => {
    const segments = annotateAnswer("it was, you know, fine");
    expect(segments).toContainEqual({ text: "you know,", kind: "filler" });
  });
});

describe("stem", () => {
  it("normalises common suffixes", () => {
    expect(stem("caching")).toBe("cach");
    expect(stem("indexes")).toBe("index");
    expect(stem("queries")).toBe("query");
  });
});
