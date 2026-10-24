import { describe, expect, it } from "vitest";
import type { PartGradeLedger } from "../../src/english/english-grades";
import { foldGrades } from "./apply-grades";
import { heldItems, heldPage, type Bank } from "./held-parts-batch";

// A batch of held hand-written parts, by move: what is selected, how a line
// shows its slots, and that the owner's grade on an item reaches the ledger
// against that one part. Fixture banks stand in for data/english/parts.
const bank: Bank = {
  register: "journal",
  slots: { other: "A person, by name, from the records." },
  parts: [
    {
      key: "journal.race.won",
      move: "race",
      text: "{other} won the race.",
      origin: "authored",
      shippable: false,
      uses: [{ subject: "election", role: "other", requiresFacts: ["won"] }],
    },
    {
      key: "journal.race.lost",
      move: "race",
      text: "{other} lost the race.",
      origin: "authored",
      shippable: false,
    },
    {
      key: "journal.race.shipped",
      move: "race",
      text: "{other} ran.",
      origin: "authored",
      shippable: true,
    },
    {
      key: "journal.race.mined",
      move: "race",
      text: "We won.",
      shippable: false,
    },
  ],
};
const empty = {
  schema: "x",
  batches: [],
  parts: {},
} as unknown as PartGradeLedger;
const ledger = (key: string) =>
  ({
    ...empty,
    parts: {
      [key]: {
        good: 0,
        bad: 1,
        fix: 0,
        sharedGood: 0,
        sharedBad: 0,
        sharedFix: 0,
      },
    },
  }) as unknown as PartGradeLedger;

describe("the held-parts batch", () => {
  it("takes authored parts held and ungraded, never a shipped, mined or graded one", () => {
    const keys = (l: PartGradeLedger) =>
      heldItems([{ name: "journal.json", bank }], { ledger: l }).map(
        (item) => item.parts[0],
      );
    expect(keys(empty)).toEqual(["journal.race.lost", "journal.race.won"]);
    expect(keys(ledger("journal.race.lost"))).toEqual(["journal.race.won"]);
  });

  it("names every slot a line fills and the facts it needs, on the page", () => {
    const items = heldItems([{ name: "journal.json", bank }], {
      ledger: empty,
    });
    const won = items.find((item) => item.parts[0] === "journal.race.won")!;
    expect(won.slots).toEqual([
      { name: "other", from: "A person, by name, from the records." },
    ]);
    expect(won.requires).toEqual(["won"]);
    const page = heldPage("batch-test", items);
    expect(page).toContain("· **{other} won the race.**");
    expect(page).toContain("{other}: A person, by name, from the records.");
    expect(page).toContain("Said only when the record holds: won");
  });

  it("folds a grade on an item into the ledger against that part alone", () => {
    const items = heldItems([{ name: "journal.json", bank }], {
      ledger: empty,
    });
    const at = items.findIndex((item) => item.parts[0] === "journal.race.won");
    const folded = foldGrades([
      {
        batch: { id: "batch-test", items },
        grades: { batch: "batch-test", grades: [{ i: at, grade: "good" }] },
      },
    ]);
    expect(folded.parts["journal.race.won"]?.good).toBe(1);
    expect(folded.parts["journal.race.lost"]).toBeUndefined();
  });
});
