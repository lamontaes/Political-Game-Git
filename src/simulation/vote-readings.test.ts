import { describe, expect, it } from "vitest";
import { classifyVoteReading, type VoteReadingClass } from "./vote-readings";
import type { VoteBundle, VoteBundlePart } from "./vote-bundle";
import type { EntityId } from "./types";

const mainQuestion: VoteBundlePart = {
  source: "filed-question",
  provisionId: null,
  provisionKey: null,
  heading: null,
  answers: { propositionId: "school-lunches" as EntityId, answer: "yes" },
};
const addedPart: VoteBundlePart = {
  source: "section",
  provisionId: "provision-1" as EntityId,
  provisionKey: "lunch-funding",
  heading: "Lunch funding",
  answers: null,
};
const bundle: VoteBundle = {
  voteId: "vote-1" as EntityId,
  measureId: "measure-1" as EntityId,
  kind: "passage",
  sections: [],
  amendment: null,
  parts: [mainQuestion, addedPart],
};

describe("vote reading classification", () => {
  it.each([
    ["main question", mainQuestion, "honest"],
    ["one of several sections", addedPart, "misleading"],
  ] as const)("classifies a nay on %s", (_name, part, expected) => {
    expect(classifyVoteReading(bundle, "nay", part)).toBe(expected);
  });

  it("treats a vote on a single part as honest", () => {
    expect(
      classifyVoteReading({ ...bundle, parts: [addedPart] }, "nay", addedPart),
    ).toBe("honest" satisfies VoteReadingClass);
  });

  it.each(["yea", "absent", "present-not-voting", null] as const)(
    "classifies %s as false for a claim of a nay",
    (disposition) => {
      expect(classifyVoteReading(bundle, disposition, mainQuestion)).toBe(
        "false",
      );
    },
  );

  it("classifies a claim about a part outside the recorded bundle as false", () => {
    expect(
      classifyVoteReading(bundle, "nay", {
        ...addedPart,
        provisionId: "other-provision" as EntityId,
      }),
    ).toBe("false");
  });
});
