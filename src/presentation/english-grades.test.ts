import { describe, expect, it } from "vitest";
import { composeFromBank, type EnglishBank } from "./bank-english";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "./english-composition";
import {
  heldByGrades,
  PART_GRADES,
  type PartGradeLedger,
} from "./english-grades";
import type { GroundedEnglishPacket } from "./grounded-english";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import {
  foldGrades,
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
      /not GOOD, BAD or FIX/,
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

  it("starts empty on main until a grade file lands", () => {
    expect(PART_GRADES.schema).toBe("english-part-grades/1");
    for (const key of Object.keys(PART_GRADES.parts))
      expect(PART_GRADES.batches.length, key).toBeGreaterThan(0);
  });
});

const bank: EnglishBank = {
  parts: ["a", "b", "c"].map((key) => ({
    key: `meeting.opener.${key}`,
    move: "opener",
    kind: "k",
    text: `Part ${key} for {body}.`,
    shippable: true,
  })),
};

describe("the bank composer reads the grades", () => {
  const places = lifePlaceStateIdentities();
  const ledger = ledgerOf([
    { i: 0, grade: "BAD" },
    { i: 4, grade: "FIX" },
  ]);

  it("covers all 56 places", () => expect(places).toHaveLength(56));

  it.each(places)(
    "never picks a held part in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const pick = `meeting:${jurisdictionKey}`;
      const before = composeFromBank(
        bank,
        "opener",
        { body: jurisdictionKey },
        pick,
        undefined,
        { schema: "english-part-grades/1", batches: [], parts: {} },
      );
      expect(before).not.toBeNull();
      const after = composeFromBank(
        bank,
        "opener",
        { body: jurisdictionKey },
        pick,
        undefined,
        ledger,
      );
      expect(after?.partKey).toBe("meeting.opener.b");
      expect(after?.text).toBe(`Part b for ${jurisdictionKey}.`);
    },
  );

  it("says nothing when every part is held", () => {
    const all = ledgerOf([
      { i: 0, grade: "BAD" },
      { i: 1, grade: "BAD" },
      { i: 4, grade: "BAD" },
    ]);
    expect(
      composeFromBank(bank, "opener", { body: "x" }, "k", undefined, all),
    ).toBeNull();
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

  it("refuses the line, with the reason, when its only core is held", () => {
    const ledger = ledgerOf(
      [
        { i: 0, grade: "BAD" },
        { i: 1, grade: "FIX" },
      ],
      coreOnly,
    );
    const line = composeGroundedLine(packet, greet, { partGrades: ledger });
    expect(line.kind).toBe("missing-context");
    if (line.kind !== "missing-context") return;
    expect(line.reasons.join(" ")).toContain("held back by the owner's grade");
  });
});
