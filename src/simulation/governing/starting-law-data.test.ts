import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import startingLaw, {
  startingLawAreaFragments,
  startingLawMetadata,
  startingLawQuestionOrder,
} from "../../../data/research/laws/starting-law-2026/index";

const digest = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const expectedDigest = (name: string): string =>
  readFileSync(
    `data/research/laws/starting-law-2026/expected-digests/${name}.sha256`,
    "utf8",
  ).trim();

describe("starting-law area loader", () => {
  it("reconstructs today's monolith content and question order exactly", () => {
    expect(digest(startingLawMetadata)).toBe(expectedDigest("metadata"));
    expect(digest(startingLawQuestionOrder)).toBe(
      expectedDigest("question-order"),
    );
    expect(Object.keys(startingLaw.questions)).toEqual(
      startingLawQuestionOrder,
    );

    for (const [area, questions] of Object.entries(startingLawAreaFragments)) {
      expect(digest(questions), area).toBe(expectedDigest(area));
    }
  });

  it("assigns every question to exactly one policy-area shard", () => {
    const shardEntries = Object.entries(startingLawAreaFragments).flatMap(
      ([area, questions]) =>
        Object.keys(questions).map((questionKey) => ({ area, questionKey })),
    );
    const shardKeys = shardEntries.map(({ questionKey }) => questionKey);
    expect(new Set(shardKeys).size).toBe(shardKeys.length);
    expect([...shardKeys].sort()).toEqual([...startingLawQuestionOrder].sort());
    for (const { area, questionKey } of shardEntries) {
      expect(questionKey.split(":")[1]?.split(".")[0]).toBe(area);
    }
  });
});
