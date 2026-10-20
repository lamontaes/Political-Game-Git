import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import bank from "../../data/english/parts/journal.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { composeJournal } from "./journal";

// Household roots, where the partners met and a parent's new job are facts the
// family history keeps (pool item words-past-household-roots-and-moments).
// The nine lines that tell them were hand-written, so they stay out of play
// (not shippable) until the English engine's grading passes them (merge audit
// Oct 20, item 5). While they are held: the world still keeps each kind of
// fact, and "My life" tells none of them in words nobody graded. A random
// place from all 56.
const seed =
  process.env.JOURNAL_HOUSEHOLD_SEED ?? randomBytes(8).toString("hex");
const KINDS = ["household:roots", "household:partners-met", "household:moment"];
const MOVES = ["home-line-roots", "home-line-met", "work-line-parent-job"];

describe("the household's story in the journal", () => {
  it("holds the nine hand-written household lines out of play until graded", () => {
    const lines = (
      bank as {
        parts: {
          move?: string;
          origin?: string;
          shippable: boolean;
        }[];
      }
    ).parts.filter((part) => MOVES.includes(part.move ?? ""));
    // Three lines for each of the three moves.
    expect(lines.length).toBe(9);
    for (const line of lines) {
      expect(line.origin).toBe("authored");
      expect(line.shippable).toBe(false);
    }
  });

  it("keeps roots, where the partners met and a parent's job in the family history, and tells none in ungraded words", () => {
    const kept = new Set<string>();
    for (
      let attempt = 0;
      attempt < 4 && kept.size < KINDS.length;
      attempt += 1
    ) {
      const place = drawPlace(`${seed}:${attempt}`, "journal-household");
      const where = `seed ${seed}, ${place.name} (${place.key})`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core, director } = world;
      let tried = 0;
      for (const person of core.people.values()) {
        const facts = (person.pastFacts ?? []).filter((f) =>
          KINDS.includes(f.kind),
        );
        if (!facts.length) continue;
        for (const fact of facts) kept.add(fact.kind);
        director.watch(core, person.id);
        const lines = composeJournal(core, director, person.id).flatMap(
          (chapter) => chapter.lines,
        );
        for (const fact of facts) {
          const told = lines.find((row) =>
            row.sourceRecordIds.includes(fact.id),
          );
          expect(
            told,
            `${where}: ${fact.id} told in ungraded words`,
          ).toBeUndefined();
        }
        tried += 1;
        if (tried >= 40) break;
      }
    }
    // Not vacuous: every kind the lines would tell is really kept.
    expect([...kept].sort(), `seed ${seed}`).toEqual([...KINDS].sort());
  }, 900_000);
});
