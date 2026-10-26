import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

// An official's aide who lives where the office sits (a capital) used to be
// filled in with no household cost, so their money need was zero and traits
// alone decided whether they went to work: in Homewood, South Carolina half of
// them never did, and were never paid. They now come with the cost and
// savings officials get, and spend it out each month. Pinned to that place
// (the draw of seed sc7 for "scan"), and a place drawn at random.
const seed = process.env.STAFF_AIDE_SEED ?? randomBytes(8).toString("hex");
const DRAWS: readonly (readonly [string, string])[] = [
  ["sc7", "scan"],
  [seed, "staff-aide-living"],
];

describe("an official's aide where the office sits", () => {
  for (const [drawSeed, purpose] of DRAWS)
    it(`goes to work and is paid (seed ${drawSeed}, draw ${purpose})`, () => {
      setBookkeeping(false);
      const place = drawPlace(drawSeed, purpose);
      const where = `${place.name} (${place.key}), seed ${drawSeed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 150));
      // Aides whose work began more than 60 days before the end of the run.
      const settled = addDays(makeIsoDate(core.date), -60);
      const aides = [...core.people.values()].filter(
        (p) =>
          p.id.startsWith("person:aide:") &&
          p.alive &&
          p.jobId &&
          [...(core.work.commitmentsByPerson.get(p.id) ?? [])].some(
            (id) => core.work.commitments.get(id)!.startsAt <= settled,
          ),
      );
      expect(aides.length, `aides in ${where}`).toBeGreaterThan(0);
      for (const aide of aides) {
        let worked = 0;
        for (const r of core.work.rollups.values())
          if (r.personId === aide.id) worked += r.workedDays;
        const totals = core.cashJournal.totalsByOwner.get(aide.id);
        expect(
          aide.livingCostDailyMinor,
          `${aide.id} in ${where}`,
        ).toBeGreaterThan(0);
        expect(worked, `${aide.id} worked days in ${where}`).toBeGreaterThan(0);
        expect(
          totals?.grossCreditMinor ?? 0,
          `${aide.id} paid in ${where}`,
        ).toBeGreaterThan(0);
        expect(
          totals?.grossDebitMinor ?? 0,
          `${aide.id} living spending in ${where}`,
        ).toBeGreaterThan(0);
      }
    }, 1_800_000);
});
