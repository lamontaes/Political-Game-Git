import { describe, expect, it } from "vitest";

import {
  buildPressStoryLines,
  type PressStoryEditionInput,
} from "./press-desk-stories";

function edition(
  overrides: Partial<PressStoryEditionInput> & {
    readonly publicationId: string;
    readonly sequence: number;
  },
): PressStoryEditionInput {
  return {
    outletName: "The Commonwealth Record",
    headline: `Story ${overrides.publicationId}`,
    publishedAt: "2016-06-11",
    correctsPublicationId: null,
    correctionNote: null,
    bylineName: "Ada Fenwick",
    ...overrides,
  };
}

describe("press desk story lines", () => {
  it("has nothing to show when nothing was published", () => {
    expect(buildPressStoryLines([])).toEqual([]);
  });

  it("keeps a correction under the edition it corrects, oldest first", () => {
    const lines = buildPressStoryLines([
      edition({ publicationId: "p1", sequence: 1 }),
      edition({
        publicationId: "p2",
        sequence: 2,
        correctsPublicationId: "p1",
        correctionNote: "The vote was on Tuesday, not Monday.",
        publishedAt: "2016-06-14",
      }),
      edition({
        publicationId: "p3",
        sequence: 3,
        correctsPublicationId: "p2",
        correctionNote: "The committee had two members, not three.",
        publishedAt: "2016-06-20",
      }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.publicationId).toBe("p1");
    expect(lines[0]!.corrections.map((entry) => entry.publicationId)).toEqual([
      "p2",
      "p3",
    ]);
    expect(lines[0]!.corrections[0]!.note).toBe(
      "The vote was on Tuesday, not Monday.",
    );
  });

  it("orders separate stories newest first and carries each byline", () => {
    const lines = buildPressStoryLines([
      edition({ publicationId: "p1", sequence: 4, bylineName: "Ada Fenwick" }),
      edition({ publicationId: "p2", sequence: 9, bylineName: "Cyrus Mott" }),
    ]);
    expect(lines.map((line) => line.publicationId)).toEqual(["p2", "p1"]);
    expect(lines.map((line) => line.bylineName)).toEqual([
      "Cyrus Mott",
      "Ada Fenwick",
    ]);
  });

  it("leaves a story without a recorded reporter with no byline", () => {
    const lines = buildPressStoryLines([
      edition({ publicationId: "p1", sequence: 1, bylineName: null }),
    ]);
    expect(lines[0]!.bylineName).toBeNull();
  });

  it("shows a correction whose earlier edition is absent as its own line", () => {
    const lines = buildPressStoryLines([
      edition({
        publicationId: "p2",
        sequence: 2,
        correctsPublicationId: "p1",
        correctionNote: "The figure was misstated.",
      }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.publicationId).toBe("p2");
    expect(lines[0]!.correctionNote).toBe("The figure was misstated.");
    expect(lines[0]!.corrections).toEqual([]);
  });

  it("does not loop when an edition chain points back at itself", () => {
    const lines = buildPressStoryLines([
      edition({
        publicationId: "p1",
        sequence: 1,
        correctsPublicationId: "p2",
      }),
      edition({
        publicationId: "p2",
        sequence: 2,
        correctsPublicationId: "p1",
      }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.corrections).toHaveLength(1);
  });
});
