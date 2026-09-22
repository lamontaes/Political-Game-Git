import { describe, expect, it } from "vitest";

import {
  BARGAINING_ANSWER_OFFER_DECISION,
  BARGAINING_ANSWER_REQUEST_DECISION,
} from "../simulation/legislative-bargaining-decisions";
import { bargainingAnswerOptions } from "./legislative-bargaining";

/**
 * A declaration is a promise about what the decision offers, and a trait pack
 * is written against that promise by somebody who will not read this file. So
 * the promise is held against what the decision actually builds, for every
 * intent the room can reach, rather than against a copy of the list.
 */
describe("what a bargaining answer declares it offers", () => {
  it("matches the options a request for support actually builds", () => {
    expect(
      bargainingAnswerOptions("request-support").map((o) => o.key),
    ).toEqual(BARGAINING_ANSWER_REQUEST_DECISION.options);
  });

  it("matches the options every offer intent actually builds", () => {
    for (const intent of [
      "offer-targeted-provision",
      "counter-with-cap",
      "refuse-request",
    ] as const) {
      expect(bargainingAnswerOptions(intent).map((o) => o.key)).toEqual(
        BARGAINING_ANSWER_OFFER_DECISION.options,
      );
    }
  });

  it("keeps the two declarations apart, because hold-off means different things", () => {
    expect(BARGAINING_ANSWER_REQUEST_DECISION.id).not.toBe(
      BARGAINING_ANSWER_OFFER_DECISION.id,
    );
    expect(BARGAINING_ANSWER_REQUEST_DECISION.options).not.toEqual(
      BARGAINING_ANSWER_OFFER_DECISION.options,
    );
  });
});
