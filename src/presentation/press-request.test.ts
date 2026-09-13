import { describe, expect, it } from "vitest";
import {
  composePressAnswer,
  composePressRequestPitch,
  composeReporterQuestion,
  composeBackgroundAttribution,
  plannedPressArrangementPlace,
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
      backgroundAttribution: "a State Representative",
    });
    expect(pitch).toEqual({
      ok: true,
      statement:
        "The source offers a statement without adding unrecorded claims about “The council published the hearing notice.” on on-background spoken terms to be attributed as “a State Representative” and will not speculate beyond the recorded file.",
    });
    expect(
      composePressRequestPitch({
        subjectSummary: "The council published the hearing notice.",
        intent: "offer-statement",
        stance: "refuse-speculation",
        channel: "spoken",
        terms: "on-background",
      }).ok,
    ).toBe(false);
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
      correctingEvidence: ["The hearing ended without a final vote."],
    });
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.statement).toContain(
      "The hearing ended without a final vote.",
    );
    expect(composed.statement).not.toContain("I feel");
  });

  it("does not treat a question as an established fact or invent a contradiction", () => {
    const empty = composePressAnswer({
      intent: "answer-directly",
      knownFacts: [],
      primaryQuestion: "",
      followUpQuestion: "Did the bill pass?",
    });
    expect(empty).toEqual({
      ok: true,
      statement:
        "Asked “Did the bill pass?”, the source answers without treating that question as an established fact.",
    });

    const questionOnly = composePressAnswer({
      intent: "add-context",
      knownFacts: ["", "   "],
      primaryQuestion: "Did the bill pass?",
      followUpQuestion: "Did the bill pass?",
    });
    expect(questionOnly.ok).toBe(true);
    if (!questionOnly.ok) return;
    expect(questionOnly.statement).not.toContain(
      "That recorded fact does not establish",
    );
    expect(questionOnly.statement).not.toMatch(
      /from the record:\s*Did the bill pass/i,
    );

    const unrelated = composePressAnswer({
      intent: "challenge-premise",
      knownFacts: ["The office scheduled a routine staff meeting."],
      primaryQuestion: "Did the bill pass?",
      followUpQuestion: "Did the bill pass?",
    });
    expect(unrelated.ok).toBe(true);
    if (!unrelated.ok) return;
    expect(unrelated.statement).toBe(
      "The source does not accept that “Did the bill pass?” is established by the record now in hand.",
    );
    expect(unrelated.statement).not.toContain("routine staff meeting");
    expect(unrelated.statement).not.toContain("What is established is");

    const linked = composePressAnswer({
      intent: "challenge-premise",
      knownFacts: [
        "The office scheduled a routine staff meeting.",
        "The hearing ended without a final vote.",
      ],
      primaryQuestion: "Did the bill pass?",
      followUpQuestion: "Did the bill pass?",
      correctingEvidence: ["The hearing ended without a final vote."],
    });
    expect(linked).toEqual({
      ok: true,
      statement:
        "The source challenges the premise of “Did the bill pass?”, citing the recorded fact: The hearing ended without a final vote.",
    });
    expect(linked.ok && linked.statement).not.toContain(
      "routine staff meeting",
    );
  });

  it("composes attribution and arrangement labels from recorded titles and channel", () => {
    expect(composeBackgroundAttribution("")).toEqual({
      ok: false,
      reason: "No recorded office or work title is available to attribute.",
    });
    expect(composeBackgroundAttribution("State Representative")).toEqual({
      ok: true,
      statement: "a State Representative",
    });
    expect(composeBackgroundAttribution("an office aide")).toEqual({
      ok: true,
      statement: "an office aide",
    });
    expect(plannedPressArrangementPlace("written")).toEqual({
      label: "Written correspondence",
    });
    expect(plannedPressArrangementPlace("spoken")).toEqual({
      label: "Spoken exchange",
    });
  });
});
