import { describe, expect, it } from "vitest";

import { adjournmentStopsPhase } from "./legislative-clock";

/**
 * A session's end stops a bill still before the legislature, and nothing
 * after it: what both chambers passed is still enrolled, presented and
 * signed, or becomes law, on the executive's own clock. A one-year Lexington
 * world had two Kentucky bills the governor signed stuck forever at "being
 * recorded as law" because the session closed that day.
 */
describe("what a session's end stops", () => {
  it("stops a bill still before a chamber", () => {
    for (const phase of [
      "awaiting-referral",
      "in-committee",
      "awaiting-floor",
      "on-floor",
      "awaiting-concurrence",
      // A veto override is put to the chambers again.
      "awaiting-override",
    ])
      expect(adjournmentStopsPhase(phase), phase).toBe(true);
  });

  it("does not stop a bill both chambers already passed", () => {
    for (const phase of [
      "awaiting-enrollment",
      "awaiting-presentation",
      "awaiting-executive",
      "awaiting-enactment",
    ])
      expect(adjournmentStopsPhase(phase), phase).toBe(false);
  });
});
