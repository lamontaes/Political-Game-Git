import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { FAMILY_PARTNERED } from "../core2/modules/people";
import { preStartHistory } from "../core2/pre-start";
import { SCHOOL_STARTED, schoolsAttended } from "../core2/past";
import { composeJournal } from "./journal";

// The household's years before the start are told in "My life" from the
// records the engines ran for them (owner, Oct 28, 2026: "simulate to the
// birth year"): the first school a child started at (the school engine) and
// the day partners set up home (the people engine), each line citing its
// record's id. Places are drawn from all 56 until one holds a named school.
const seed =
  process.env.JOURNAL_HOUSEHOLD_SEED ?? randomBytes(8).toString("hex");

describe("the household's story in the journal", () => {
  it("tells the first school and the day partners set up home, each citing its run record", () => {
    const passed: string[] = [];
    for (let draw = 0; draw < 6; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "journal-household");
      const where = `seed ${seed}:${draw}, ${place.name} (${place.key})`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
        playerBirthDate: "1990-06-15",
      });
      const started = preStartHistory(core, { kind: SCHOOL_STARTED }).filter(
        (row) =>
          row.facts.grade === 0 &&
          schoolsAttended(core, String(row.facts.personId)).some(
            (school) => school.recordId === row.id && school.name,
          ),
      );
      if (!started.length) {
        passed.push(`${where}: no named first school`);
        continue;
      }
      const told = new Set<string>();
      const partnered = preStartHistory(core, { kind: FAMILY_PARTNERED });
      const people = [
        ...new Set([
          ...started.slice(0, 20).map((row) => String(row.facts.personId)),
          ...partnered.slice(0, 20).flatMap((row) => row.personIds ?? []),
        ]),
      ];
      for (const id of people) {
        director.watch(core, id as never);
        const lines = composeJournal(core, director, id as never).flatMap(
          (chapter) => chapter.lines,
        );
        for (const row of [...started, ...partnered]) {
          const line = lines.find((entry) =>
            entry.sourceRecordIds.includes(row.id),
          );
          if (!line) continue;
          told.add(row.kind);
          expect(line.text, where).not.toMatch(/\{|undefined/);
          if (row.kind === SCHOOL_STARTED)
            expect(line.text, `${where}: ${row.id}`).toMatch(
              /school|start|began/i,
            );
          if (row.kind === FAMILY_PARTNERED)
            expect(line.text, `${where}: ${row.id}`).toMatch(
              /met|found each other|knew each other/,
            );
        }
      }
      expect(
        [...told],
        `${where}; passed over: ${passed.join("; ")}`,
      ).toContain(SCHOOL_STARTED);
      if (partnered.length)
        expect([...told], `${where}: ${partnered.length} couples`).toContain(
          FAMILY_PARTNERED,
        );
      return;
    }
    throw new Error(`No drawn place held a named school: ${passed.join("; ")}`);
  }, 900_000);
});
