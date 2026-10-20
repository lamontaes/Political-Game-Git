import { describe, expect, it } from "vitest";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "../../src/english/english-composition";
import {
  CALIBRATION,
  preferGraded,
  type Calibration,
} from "../../src/english/english-calibration";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import { foldCalibration, type BatchFile } from "./apply-grades";
import calibrationFile from "../../data/english/calibration.json" with { type: "json" };

// Numeric grades (1 to 5 per axis) fold into the calibration table, and the
// engine reads the table when it chooses a piece. These fixtures stand in for
// a batch and its grade file; what is under test is the fold and the read.
const batch: BatchFile = {
  id: "batch-cal",
  items: [
    {
      i: 0,
      register: "small-talk",
      parts: ["talk.greet:core:hi"],
      lines: [{ text: "hi." }],
    },
    {
      i: 1,
      register: "small-talk",
      parts: ["talk.greet:core:hello-there-how-are-you-doing"],
      lines: [{ text: "hello there, how are you doing today my friend." }],
    },
  ],
};
const fold = (rows: { i: number; axes: Record<string, number> }[]) =>
  foldCalibration([{ batch, grades: { batch: batch.id, grades: rows } }]);

const packet: GroundedEnglishPacket = {
  surface: "dialogue",
  momentKey: "event-talk-cal",
  worldSeed: "cal-seed",
  bankVersion: "1",
  stage: "open",
  sourceRecordIds: ["event-talk-cal"],
  facts: {},
  speaker: { personId: "person-sam", traits: {} },
  viewer: { personId: "person-dana", traits: {} },
  knowledge: [],
};
const greet: ComposedLineBank = {
  key: "talk.greet",
  version: "1",
  surface: "dialogue",
  act: "greet",
  parts: {
    core: {
      variants: [
        { key: "hi", kind: "template", text: "hi." },
        {
          key: "hello-there-how-are-you-doing",
          kind: "template",
          text: "hello there, how are you doing today my friend.",
        },
      ],
    },
  },
};
const said = (calibration: Calibration) => {
  const line = composeGroundedLine(packet, greet, {
    register: "small-talk",
    calibration,
  });
  if (line.kind !== "rendered") throw new Error("not rendered");
  return line.parts[0]!.variantKey;
};

describe("the calibration table", () => {
  it("holds only weights, each tagged with its spread", () => {
    expect(calibrationFile.schema).toBe("english-calibration/1");
    for (const weight of [CALIBRATION.step, CALIBRATION.lengthWeight]) {
      expect(weight.tag).toBe("TUNABLE");
      expect(weight.spread.low).toBeLessThan(weight.spread.high);
    }
  });

  it("raises a piece graded above 3 and lowers one graded below, within -1 to 1", () => {
    const table = fold([
      { i: 0, axes: { naturalness: 5 } },
      { i: 1, axes: { naturalness: 1, prose: 1 } },
    ]);
    const step = CALIBRATION.step.value;
    expect(table.parts["talk.greet:core:hi"]!.grade).toBeCloseTo(step);
    expect(
      table.parts["talk.greet:core:hello-there-how-are-you-doing"]!.grade,
    ).toBeCloseTo(-2 * step);
  });

  it("refuses a grade outside 1 to 5 or naming no item", () => {
    expect(() => fold([{ i: 0, axes: { prose: 6 } }])).toThrow(/not 1 to 5/);
    expect(() => fold([{ i: 9, axes: { prose: 3 } }])).toThrow(/no such item/);
  });

  it("is rebuilt from the grades, so applying them twice changes nothing", () => {
    const rows = [{ i: 0, axes: { naturalness: 4, length: 2 } }];
    expect(fold(rows)).toEqual(fold(rows));
  });

  it("moves the register's target length: too long pulls it under the line's own length", () => {
    const table = fold([{ i: 1, axes: { length: 5 } }]);
    const words = 9;
    expect(table.registers["small-talk"]!.targetWords).toBeLessThan(words);
  });
});

describe("the engine reads the table when it chooses", () => {
  it("keeps every piece while nothing is graded", () => {
    expect(CALIBRATION.parts).toEqual({});
    expect(said(CALIBRATION)).toBeTruthy();
  });

  it("words the line differently after a grade", () => {
    const before = said(fold([]));
    // The owner rates the long greeting well and the short one poorly.
    const longLiked = fold([
      { i: 1, axes: { naturalness: 5 } },
      { i: 0, axes: { naturalness: 1 } },
    ]);
    const shortLiked = fold([
      { i: 0, axes: { naturalness: 5 } },
      { i: 1, axes: { naturalness: 1 } },
    ]);
    expect(said(longLiked)).toBe("hello-there-how-are-you-doing");
    expect(said(shortLiked)).toBe("hi");
    expect([said(longLiked), said(shortLiked)]).toContain(before);
  });

  it("reads the register's length: forty 'too long' grades draw the target down to the short greeting", () => {
    expect(said(fold([{ i: 1, axes: { length: 5 } }]))).toBe(
      "hello-there-how-are-you-doing",
    );
    const table = fold(
      Array.from({ length: 40 }, () => ({ i: 1, axes: { length: 5 } })),
    );
    expect(said(table)).toBe("hi");
  });
});

describe("one grade never decides a choice alone", () => {
  const step = CALIBRATION.step.value;
  it("keeps a once-graded piece in company with the ungraded", () => {
    expect(
      preferGraded(["liked", "plain"], (c) => (c === "liked" ? step : 0)),
    ).toEqual(["liked", "plain"]);
    expect(
      preferGraded(["disliked", "plain"], (c) =>
        c === "disliked" ? -step : 0,
      ),
    ).toEqual(["disliked", "plain"]);
  });
  it("lets a second grade the same way settle it", () => {
    expect(
      preferGraded(["liked", "plain"], (c) => (c === "liked" ? 2 * step : 0)),
    ).toEqual(["liked"]);
    expect(
      preferGraded(["disliked", "plain"], (c) =>
        c === "disliked" ? -2 * step : 0,
      ),
    ).toEqual(["plain"]);
  });
  it("does not force the line to the once-graded piece", () => {
    // Before this, one grade up on "hi" made it the only piece left, and the
    // line was "hi" every time; now the engine chooses between both pieces as
    // it does with nothing graded, and a second grade then settles it.
    const once = fold([{ i: 0, axes: { naturalness: 5 } }]);
    expect(said(once)).toBe(said(fold([])));
    const twice = fold([
      { i: 0, axes: { naturalness: 5 } },
      { i: 0, axes: { naturalness: 5 } },
    ]);
    expect(said(twice)).toBe("hi");
  });
});
