/**
 * Counted deaths are paid by the cohort that owes them (pool item
 * core-counted-deaths-run-below-the-table-in-small-towns). A cohort (sex and
 * birth year) owes the deaths its members' chances add up to. Each month's
 * deaths were paid from the whole town's pool in one lump by whichever
 * cohort owed the most, which is always the oldest, so a record of the
 * oldest cohort took the month's deaths for every age. The old cohorts ran up
 * overpayments of a dozen people each, nobody under sixty-five died for a
 * year, and the first year ran under the tables. A cohort now pays no more
 * than it owes, to the next whole person.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

/** Pinned: San Isidro, Texas (92ca3f7f) and North Vacherie, Louisiana (4dad0344), the places the cause was found in. */
const PLACES = [
  { draw: "fam-b:0", name: "San Isidro" },
  { draw: "fam-b:1", name: "North Vacherie" },
];
/** The most a cohort may be overpaid: the person its last payment rounded up to. */
const OVERPAID = 1.001;

interface CarryRow {
  readonly deaths?: Readonly<Record<string, number>>;
}
interface CountsRow {
  readonly deathCauses: Readonly<Record<string, number>>;
  readonly expected: { readonly deaths: number };
}

it("no cohort pays the town's deaths ahead of what it owes, and the town's dead keep up with its tables", () => {
  const was = setBookkeeping(true);
  try {
    for (const { draw, name } of PLACES) {
      const place = drawPlace(draw, "relative-news");
      const where = `${name}, seed ${place.seed}, place ${place.key}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 125));
      const state = coreAPI(core).moduleState("core2-renewal-v1");
      const carry = state.table("countedCarry").rows() as unknown as CarryRow[];
      const owed = carry.flatMap((row) => Object.values(row.deaths ?? {}));
      expect(
        owed.length,
        `${where}: cohorts keep what they owe`,
      ).toBeGreaterThan(0);
      expect(
        Math.min(...owed),
        `${where}: the most any cohort has paid ahead of what it owes`,
      ).toBeGreaterThanOrEqual(-OVERPAID);
      const rows = state.table("counts").rows() as unknown as CountsRow[];
      const expected = rows.reduce((n, row) => n + row.expected.deaths, 0);
      const died = rows.reduce(
        (n, row) =>
          n + Object.values(row.deathCauses).reduce((m, k) => m + k, 0),
        0,
      );
      expect(
        died,
        `${where}: ${died.toFixed(1)} died in four months, ${expected.toFixed(1)} expected`,
      ).toBeGreaterThanOrEqual(expected * 0.5);
    }
  } finally {
    setBookkeeping(was);
  }
}, 600_000);
