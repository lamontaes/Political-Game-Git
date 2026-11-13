/**
 * Two people who went through one school in the same years, or worked for one
 * employer in overlapping spans before the start, share it on record (pool
 * item people-no-shared-school-or-work-between-people-at-the-start). In a
 * drawn place (replay with SHARED_PAST_SEED) at the start, the pairs of full
 * people `sharedHistory` returns a school or a coworker row for are counted;
 * where the town has a school the count is not zero, and every row names the
 * record it stands on. The place and seed are in every message.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { schoolSpans } from "./past-school";
import { sharedHistory } from "./shared-history";
import { ageOn } from "./counted-groups";

/** An age past every school stage: no one this old is enrolled in a K-12 school. */
const PAST_SCHOOL_AGE = 19;

const base = process.env.SHARED_PAST_SEED ?? randomBytes(8).toString("hex");
/** The most people read for pairs: enough for a town's school, small enough to read quickly. */
const SAMPLE = 250;

for (const salt of ["a", "b"]) {
  it(`pairs of full people share a school or past work on record (draw ${salt}, seed ${base})`, () => {
    const seed = createHash("sha256").update(`${base}:${salt}`).digest("hex");
    const place = drawPlace(seed, "shared-history-past");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const town = core.people.get(world.playerId as string)!.placeId;
      const people = [...core.people.values()]
        .filter((p) => p.alive && p.tier !== "husk" && p.placeId === town)
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, SAMPLE);
      const withSchool = people.filter((p) => schoolSpans(core, p.id).length);
      let schoolPairs = 0;
      let coworkerPairs = 0;
      let ended = 0;
      let grownPairs = 0;
      let example = "";
      for (let i = 0; i < people.length; i += 1)
        for (let j = i + 1; j < people.length; j += 1) {
          const rows = sharedHistory(core, people[i]!.id, people[j]!.id);
          for (const row of rows) {
            expect(row.recordId, `${where}: a row's record`).toBeTruthy();
            if (row.kind === "schoolmate") {
              schoolPairs += 1;
              // School that has ended is past (Fable A, Nov 13): a pair in
              // which one is past school age is never at school together now.
              const grown = [people[i]!, people[j]!].some(
                (p) => ageOn(p.birthDate, core.date) > PAST_SCHOOL_AGE,
              );
              if (grown) {
                grownPairs += 1;
                expect(
                  row.ended,
                  `${where}: ${people[i]!.id} and ${people[j]!.id} at ${row.recordId}: one is past school age`,
                ).toBe(true);
              }
              if (row.ended) ended += 1;
              if (!example)
                example = `${people[i]!.id} and ${people[j]!.id} at ${row.recordId} in ${row.year}`;
            }
            if (row.kind === "coworker") coworkerPairs += 1;
          }
        }
      console.log(
        `shared-history-past: ${where}; ${people.length} full people, ${withSchool.length} with school years; ${schoolPairs} schoolmate pairs (${ended} ended), ${coworkerPairs} coworker pairs; first ${example || "none"}`,
      );
      // Where a grown person shares a school with anyone, an ended pair is
      // on record: the check above cannot pass on a draw with none to read.
      if (grownPairs) expect(ended, `${where}: ended pairs`).toBeGreaterThan(0);
      if (withSchool.length >= 2)
        expect(schoolPairs, `${where}: schoolmate pairs`).toBeGreaterThan(0);
    } finally {
      setBookkeeping(was);
    }
  }, 900_000);
}
