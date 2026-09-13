import { describe, expect, it } from "vitest";
import {
  composePressAnswer,
  composePressRequestPitch,
  composeReporterQuestion,
} from "./press-request";

describe("ordinary press structured statements", () => {
  it("inspects a request pitch without inventing a subject", () => {
    expect(
      composePressRequestPitch({
        subjectSummary: "",
        intent: "request-exchange",
        stance: "report-what-is-recorded",
        channel: "written",
        terms: "on-record",
      }).ok,
    ).toBe(false);
    const pitch = composePressRequestPitch({
      subjectSummary: "The council published the hearing notice.",
      intent: "offer-statement",
      stance: "refuse-speculation",
      channel: "spoken",
      terms: "on-background",
    });
    expect(pitch).toEqual({
      ok: true,
      statement:
        "The source offers a statement without adding unrecorded claims about “The council published the hearing notice.” on on-background spoken terms and will not speculate beyond the recorded file.",
    });
  });

  it("keeps the reporter question owned by the reporter", () => {
    const question = composeReporterQuestion({
      subjectSummary: "The council published the hearing notice.",
      terms: "on-record",
    });
    expect(question.ok).toBe(true);
    if (!question.ok) return;
    expect(question.statement).toContain(
      "The council published the hearing notice.",
    );
    expect(question.statement).toContain("on-record");
  });

  it("composes an exact answer from recorded facts before commit", () => {
    const composed = composePressAnswer({
      intent: "challenge-premise",
      knownFacts: ["The hearing ended without a final vote."],
      primaryQuestion: "Did the bill pass?",
      followUpQuestion: "Did the bill pass?",
    });
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.statement).toContain(
      "The hearing ended without a final vote.",
    );
    expect(composed.statement).not.toContain("I feel");
  });
});
