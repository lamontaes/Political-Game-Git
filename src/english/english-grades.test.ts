import { describe, expect, it } from "vitest";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "../english/english-composition";
import {
  heldByGrades,
  PART_GRADES,
  type PartGradeLedger,
} from "../english/english-grades";
import type { GroundedEnglishPacket } from "./grounded-english";
import {
  foldGrades,
  withKept,
  type BatchFile,
} from "../../scripts/dialogue-batch/apply-grades";

/*
 * The owner's grades reach the engine as data. A grading batch lists each
 * line with the part keys that made it; a grade file names the item and the
 * grade. These fixtures stand in for both files; what is under test is the
 * fold and the reading, not any line's wording.
 */
const batch: BatchFile = {
  id: "batch-test",
  items: [
    { i: 0, parts: ["bank:meeting.opener.a"] },
    { i: 1, parts: ["bank:meeting.opener.b"] },
    { i: 2, parts: ["talk.greet:opener:hey", "talk.greet:core:hi"] },
    { i: 3, parts: ["talk.greet:opener:hey", "talk.greet:core:hello"] },
    { i: 4, parts: ["bank:meeting.opener.c"] },
  ],
};

function ledgerOf(
  grades: { i: number; grade: string }[],
  from: BatchFile = batch,
): PartGradeLedger {
  return foldGrades([{ batch: from, grades: { batch: from.id, grades } }]);
}

describe("the owner's grades fold into a part ledger", () => {
  it("counts a one-part line against its part and a shared line against each", () => {
    const ledger = ledgerOf([
      { i: 0, grade: "BAD" },
      { i: 1, grade: "good" },
      { i: 2, grade: "FIX" },
    ]);
    expect(ledger.batches).toEqual(["batch-test"]);
    expect(ledger.parts["bank:meeting.opener.a"]).toMatchObject({ bad: 1 });
    expect(ledger.parts["bank:meeting.opener.b"]).toMatchObject({ good: 1 });
    expect(ledger.parts["talk.greet:opener:hey"]).toMatchObject({
      fix: 0,
      sharedFix: 1,
    });
    expect(ledger.parts["talk.greet:core:hello"]).toBeUndefined();
  });

  it("refuses a grade that names no item or no known grade", () => {
    expect(() => ledgerOf([{ i: 9, grade: "BAD" }])).toThrow(
      /batch-test item 9: no such item/,
    );
    expect(() => ledgerOf([{ i: 0, grade: "meh" }])).toThrow(
      /not good, rewrite or kill/,
    );
  });

  it("holds a part graded BAD or FIX alone, and never one graded GOOD", () => {
    const ledger = ledgerOf([
      { i: 0, grade: "BAD" },
      { i: 1, grade: "GOOD" },
      { i: 4, grade: "FIX" },
    ]);
    expect(heldByGrades("bank:meeting.opener.a", ledger)).toBe(true);
    expect(heldByGrades("bank:meeting.opener.b", ledger)).toBe(false);
    expect(heldByGrades("bank:meeting.opener.c", ledger)).toBe(true);
    expect(heldByGrades("bank:meeting.opener.never-graded", ledger)).toBe(
      false,
    );
  });

  it("holds a shared part only after two bad lines and no good one", () => {
    const once = ledgerOf([{ i: 2, grade: "BAD" }]);
    expect(heldByGrades("talk.greet:opener:hey", once)).toBe(false);
    const twice = ledgerOf([
      { i: 2, grade: "BAD" },
      { i: 3, grade: "FIX" },
    ]);
    expect(heldByGrades("talk.greet:opener:hey", twice)).toBe(true);
    const redeemed = ledgerOf([
      { i: 2, grade: "BAD" },
      { i: 3, grade: "GOOD" },
    ]);
    expect(heldByGrades("talk.greet:opener:hey", redeemed)).toBe(false);
  });

  it("reads the Grade tab's words: kill holds like BAD, rewrite like FIX", () => {
    const ledger = ledgerOf([
      { i: 0, grade: "kill" },
      { i: 1, grade: "good" },
      { i: 4, grade: "rewrite" },
    ]);
    expect(ledger.parts["bank:meeting.opener.a"]).toMatchObject({ bad: 1 });
    expect(ledger.parts["bank:meeting.opener.c"]).toMatchObject({ fix: 1 });
    expect(heldByGrades("bank:meeting.opener.a", ledger)).toBe(true);
    expect(heldByGrades("bank:meeting.opener.b", ledger)).toBe(false);
  });

  it("folds a grade file that carries each line's parts without its batch", () => {
    const ledger = foldGrades([
      {
        batch: null,
        grades: {
          batch: "batch-standalone",
          grades: [{ i: 7, grade: "kill", parts: ["bank:meeting.opener.z"] }],
        },
      },
    ]);
    expect(ledger.batches).toEqual(["batch-standalone"]);
    expect(heldByGrades("bank:meeting.opener.z", ledger)).toBe(true);
  });

  it("names the graded batches behind every part the ledger holds", () => {
    expect(PART_GRADES.schema).toBe("english-part-grades/1");
    for (const key of Object.keys(PART_GRADES.parts))
      expect(PART_GRADES.batches.length, key).toBeGreaterThan(0);
  });
});

describe("the line composer reads the grades", () => {
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: "event-talk-1",
    worldSeed: "grades-seed",
    bankVersion: "1",
    stage: "open",
    sourceRecordIds: ["event-talk-1"],
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
          { key: "hello", kind: "template", text: "hello." },
        ],
      },
    },
  };
  const coreOnly: BatchFile = {
    id: "batch-core",
    items: [
      { i: 0, parts: ["talk.greet:core:hi"] },
      { i: 1, parts: ["talk.greet:core:hello"] },
    ],
  };

  it("words the line from a part the owner did not hold back", () => {
    for (const held of ["hi", "hello"] as const) {
      const ledger = ledgerOf(
        [{ i: held === "hi" ? 0 : 1, grade: "BAD" }],
        coreOnly,
      );
      const line = composeGroundedLine(packet, greet, { partGrades: ledger });
      expect(line.kind).toBe("rendered");
      if (line.kind !== "rendered") return;
      expect(line.parts[0]!.variantKey).not.toBe(held);
    }
  });

  it("says a held part only when nothing else can say the line", () => {
    // A conversation that cannot word its reply cannot go on, so when every
    // core is held the line is still said, from a held part.
    const ledger = ledgerOf(
      [
        { i: 0, grade: "BAD" },
        { i: 1, grade: "FIX" },
      ],
      coreOnly,
    );
    const line = composeGroundedLine(packet, greet, { partGrades: ledger });
    expect(line.kind).toBe("rendered");
    const unheld = composeGroundedLine(packet, greet, {
      partGrades: ledgerOf([{ i: 0, grade: "BAD" }], coreOnly),
    });
    expect(unheld.kind === "rendered" && unheld.parts[0]!.variantKey).toBe(
      "hello",
    );
  });
});

describe("per-axis grades from a multi-axis batch", () => {
  const axisBatch: BatchFile = {
    id: "batch-axes",
    items: [
      {
        i: 0,
        parts: ["bank:talk.line"],
        variants: [
          { n: 1, axis: "length", parts: ["bank:talk.short"] },
          { n: 2, axis: "formality", parts: ["bank:talk.formal"] },
        ],
      },
      { i: 1, parts: ["bank:talk.other"] },
    ],
  };
  const fold = (grades: object[]) =>
    foldGrades([{ batch: axisBatch, grades: { batch: axisBatch.id, grades } }]);

  it("holds a part on the axis it failed, and only there", () => {
    const ledger = fold([
      {
        i: 0,
        axes: { formality: "GOOD", length: "BAD" },
        prefer: { length: 1 },
      },
    ]);
    expect(heldByGrades("bank:talk.line", ledger, "length")).toBe(true);
    expect(heldByGrades("bank:talk.line", ledger, "formality")).toBe(false);
    expect(heldByGrades("bank:talk.line", ledger, "word choice")).toBe(false);
    // The variant the owner preferred is good on that axis.
    expect(ledger.parts["bank:talk.short"]?.axes?.length).toEqual({
      good: 1,
      bad: 0,
      fix: 0,
    });
    expect(heldByGrades("bank:talk.short", ledger, "length")).toBe(false);
  });

  it("holds without an axis only when every graded axis failed", () => {
    const mixed = fold([{ i: 0, axes: { formality: "GOOD", length: "BAD" } }]);
    expect(heldByGrades("bank:talk.line", mixed)).toBe(false);
    const allBad = fold([{ i: 0, axes: { formality: "FIX", length: "BAD" } }]);
    expect(heldByGrades("bank:talk.line", allBad)).toBe(true);
  });

  it("keeps one-axis behavior and refuses a preference for no variant", () => {
    const ledger = fold([{ i: 1, grade: "BAD" }]);
    expect(heldByGrades("bank:talk.other", ledger)).toBe(true);
    expect(heldByGrades("bank:talk.other", ledger, "length")).toBe(false);
    expect(() =>
      fold([{ i: 0, axes: { length: "BAD" }, prefer: { length: 2 } }]),
    ).toThrow(/prefer length 2 names no length variant/);
  });
});

describe("grades from batches whose files were removed", () => {
  it("keeps them and adds the new batch's", () => {
    const old = ledgerOf([{ i: 0, grade: "BAD" }]);
    const fresh = foldGrades([
      {
        batch: { ...batch, id: "batch-new" },
        grades: { batch: "batch-new", grades: [{ i: 0, grade: "GOOD" }] },
      },
    ]);
    const merged = withKept(fresh, old);
    expect(merged.batches).toEqual(["batch-test", "batch-new"]);
    expect(merged.parts["bank:meeting.opener.a"]).toMatchObject({
      good: 1,
      bad: 1,
    });
    // A ledger whose batches are all still on disk is simply refolded.
    expect(withKept(old, old)).toBe(old);
  });

  it("takes back out the share of a batch still on disk, so it is not counted twice", () => {
    const old = ledgerOf([{ i: 0, grade: "BAD" }]);
    const kept = foldGrades([
      {
        batch: { ...batch, id: "batch-gone" },
        grades: { batch: "batch-gone", grades: [{ i: 1, grade: "BAD" }] },
      },
    ]);
    // The ledger holds batch-test (on disk) and batch-gone (removed).
    const both = withKept(old, kept);
    const fresh = foldGrades([
      {
        batch,
        grades: { batch: "batch-test", grades: [{ i: 0, grade: "BAD" }] },
      },
    ]);
    const merged = withKept(fresh, both, () => old);
    expect(merged.batches).toEqual(["batch-gone", "batch-test"]);
    expect(merged.parts["bank:meeting.opener.a"]).toMatchObject({ bad: 1 });
    expect(merged.parts["bank:meeting.opener.b"]).toMatchObject({ bad: 1 });
  });
});

describe("grades from a scene batch", () => {
  const scenes: BatchFile = {
    id: "batch-scenes",
    items: [
      {
        i: 0,
        parts: ["bank:talk.ask"],
        choices: [
          { n: 1, parts: ["bank:talk.reply-a"] },
          { n: 2, parts: ["bank:talk.reply-b"] },
        ],
      },
      {
        i: 1,
        parts: ["bank:meeting.close"],
        variants: [
          { n: 1, axis: "word choice", parts: ["bank:meeting.close-b"] },
        ],
      },
    ],
  };
  it("grades each reply of a choice set against its own parts, and a preferred alternative as good", () => {
    const ledger = foldGrades([
      {
        batch: scenes,
        grades: {
          batch: scenes.id,
          grades: [
            { i: 0, choices: { "1": "good", "2": "bad" } },
            { i: 1, grade: "fail", prefer: 1 },
          ],
        },
      },
    ]);
    expect(heldByGrades("bank:talk.reply-a", ledger)).toBe(false);
    expect(heldByGrades("bank:talk.reply-b", ledger)).toBe(true);
    expect(heldByGrades("bank:meeting.close", ledger)).toBe(true);
    expect(ledger.parts["bank:meeting.close-b"]).toMatchObject({ good: 1 });
  });
});
