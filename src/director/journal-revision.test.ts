import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import { composeJournal, JOURNAL_DATA } from "./journal";

// The journal as a memoir with hindsight (pool item words-main-line): an entry
// told as small that a later record of the same person grew is looked back
// on in the later entry, and only then. In a year of the played world in a
// drawn place, every revising entry names the earlier entry it revises, the
// earlier moment weighed little then and more now, and the later moment's own
// echo points at it. No entry says a revision without one.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const interrupt =
  DEFAULT_DIRECTOR_DATA.parameters.directorInterruptImpact!.value;
const revisions = new Set(
  (JOURNAL_DATA.memoir?.revise ?? []).map((row) => row.text),
);

it(`a journal revises an early entry only when a later record changed what it meant (seed ${seed})`, () => {
  expect(revisions.size).toBeGreaterThan(0);
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
    let found = 0;
    for (const [personId, book] of director.ledger.people) {
      const lines = composeJournal(core, director, personId).flatMap(
        (chapter) => chapter.lines,
      );
      for (const line of lines) {
        const where = `${place.name}, seed ${seed}:${life}, ${personId}, ${line.id}`;
        if (!line.revises) {
          // Nothing is revised without a record that says so.
          for (const text of revisions) {
            const said = new RegExp(
              text
                .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
                .replace(/\{\{?\w+\}?\}/g, ".+"),
            );
            expect(said.test(line.text), where).toBe(false);
          }
          continue;
        }
        found += 1;
        if (process.env.JOURNAL_REVISION_SHOW)
          appendFileSync(
            process.env.JOURNAL_REVISION_SHOW,
            `${where}: ${line.text}\n`,
          );
        const later = book.momentsById.get(line.momentIds[0]!)!;
        for (const earlierId of line.revises) {
          const earlier = book.momentsById.get(earlierId)!;
          expect(earlier.date < later.date, where).toBe(true);
          expect(earlier.impact, where).toBeLessThan(interrupt);
          expect(earlier.hindsight, where).toBeGreaterThanOrEqual(interrupt);
          expect(
            later.echoes.some(
              (link) =>
                link.earlierId === earlierId && link.earlierKind === "moment",
            ),
            where,
          ).toBe(true);
          // The earlier entry was told before, and the revision cites both records.
          expect(
            lines.some(
              (row) =>
                row.momentIds.includes(earlierId) && row.date < line.date,
            ),
            where,
          ).toBe(true);
          expect(line.sourceRecordIds, where).toContain(earlier.causeId);
          expect(line.sourceRecordIds, where).toContain(later.causeId);
        }
      }
    }
    if (found > 0) return;
    tried.push(place.name);
  }
  throw new Error(
    `no journal in a year revised an early entry in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
