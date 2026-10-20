import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import journalBank from "../../data/english/parts/journal.json" with { type: "json" };
import { composeJournal, JOURNAL_DATA } from "./journal";

// The journal as a memoir with hindsight (pool item words-main-line): an entry
// told as small that a later record of the same person grew would be looked
// back on in the later entry. The look-back sentences are hand-written and
// held (owner, Oct 6, EN-1 to EN-3; pool item words-journal-memoir-revise), so
// in a year of the played world in a drawn place the director still finds
// those later records, each pointing at an earlier moment that weighed little
// then and more now, and the journal revises nothing and says none of the
// held look-backs.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const interrupt =
  DEFAULT_DIRECTOR_DATA.parameters.directorInterruptImpact!.value;
// The held look-back sentences, straight from the bank (the journal data
// carries only what ships).
const revisions = new Set(
  (
    journalBank as unknown as {
      parts: { key: string; text: string; origin?: string }[];
    }
  ).parts
    .filter(
      (part) =>
        part.key.startsWith("journal.memoir-revise.") &&
        part.origin === "authored",
    )
    .map((part) => part.text),
);

it(`the director finds the later records that would revise an early entry, and the journal revises nothing (seed ${seed})`, () => {
  expect(revisions.size).toBeGreaterThan(0);
  expect(JOURNAL_DATA.memoir?.revise ?? []).toEqual([]);
  const tried: string[] = [];
  for (let life = 0; life < 4; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "journal-revision");
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    for (const person of core.people.values())
      if (person.alive && person.id.startsWith("person_"))
        director.watch(core, person.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    let candidates = 0;
    for (const [personId, book] of director.ledger.people) {
      const lines = composeJournal(core, director, personId).flatMap(
        (chapter) => chapter.lines,
      );
      for (const line of lines) {
        const where = `${place.name}, seed ${seed}:${life}, ${personId}, ${line.id}`;
        // Nothing is revised, and no held look-back is said.
        expect(line.revises, where).toBeUndefined();
        for (const text of revisions) {
          const said = new RegExp(
            text
              .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
              .replace(/\{\{?\w+\}?\}/g, ".+"),
          );
          expect(said.test(line.text), where).toBe(false);
        }
      }
      // The records that would revise: a later moment echoing an earlier one
      // that weighed little then and more now.
      for (const later of book.moments)
        for (const link of later.echoes) {
          if (link.earlierKind !== "moment") continue;
          const earlier = book.momentsById.get(link.earlierId);
          if (!earlier || !(earlier.date < later.date)) continue;
          if (earlier.impact < interrupt && earlier.hindsight >= interrupt)
            candidates += 1;
        }
    }
    if (candidates > 0) return;
    tried.push(place.name);
  }
  throw new Error(
    `no later record in a year would revise an early entry in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
