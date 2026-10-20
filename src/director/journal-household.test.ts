import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { composeJournal } from "./journal";

// Household roots, where the partners met and a parent's new job are dated
// facts the family history keeps (pool item words-past-household-roots-and-
// moments). Their journal sentences are hand-written and held (owner, Oct 6,
// EN-1 to EN-3; pool item words-journal-household-lines), so "My life" tells
// none of them until the engine writes them, and never a line that cites one
// of those facts in a hand-written voice. A random place from all 56.
const seed =
  process.env.JOURNAL_HOUSEHOLD_SEED ?? randomBytes(8).toString("hex");

describe("the household's story in the journal", () => {
  it("keeps the household facts and tells none of them in a hand-written line", () => {
    const place = drawPlace(seed, "journal-household");
    const where = `seed ${seed}, ${place.name} (${place.key})`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const told = new Set<string>();
    const kept = new Set<string>();
    const kinds = [
      "household:roots",
      "household:partners-met",
      "household:moment",
    ];
    let tried = 0;
    for (const person of core.people.values()) {
      if (!(person.pastFacts ?? []).some((f) => kinds.includes(f.kind)))
        continue;
      director.watch(core, person.id);
      const lines = composeJournal(core, director, person.id).flatMap(
        (chapter) => chapter.lines,
      );
      for (const fact of person.pastFacts ?? []) {
        if (!kinds.includes(fact.kind)) continue;
        kept.add(fact.kind);
        const line = lines.find((row) => row.sourceRecordIds.includes(fact.id));
        if (line) told.add(fact.kind);
      }
      tried += 1;
      if (tried >= 40) break;
    }
    expect(tried, where).toBeGreaterThan(0);
    // The family history still holds the roots, and the journal tells none.
    expect([...kept], where).toContain("household:roots");
    expect([...told], where).toEqual([]);
  }, 300_000);
});
