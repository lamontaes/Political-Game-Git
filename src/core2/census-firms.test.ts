/**
 * A town opened at its Census scale has firms sized to the weighted town
 * (pool items world-census-weight-economy and world-census-weight-owner-draws):
 * the same dollars per resident as the town opened as its sample, for sales,
 * wages, outside costs and the owners' draws, read from the firms' books and
 * the draw rows over 62 days. A drawn place above 10,000 people, from all 56.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { publishedPlaceReferencePopulation } from "./gov-rules/place-population";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { realLocalities } from "./places";
import { residentCounts } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

function bigPlace() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const place = drawPlace(seed, `census-firms-${attempt}`);
    const row = realLocalities().find((r) => r.key === place.key);
    const real = row?.sourceGeoid
      ? publishedPlaceReferencePopulation(row.sourceGeoid)?.value
      : undefined;
    if (real !== undefined && real > 20_000) return { ...place, real };
  }
  throw new Error(`No place above 20,000 people drawn (seed ${seed})`);
}
const place = bigPlace();

function perResident(countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
    ...(countScale !== undefined ? { countScale } : {}),
  });
  const residents = core.people.size + residentCounts(core)[0]!.people;
  const snap = () => {
    let sales = 0;
    let wages = 0;
    let costs = 0;
    for (const book of core.finance.businesses.values()) {
      sales += book.receivedMinor;
      wages += book.wagesPaidMinor;
      costs += book.operatingPaidMinor;
    }
    return { sales, wages, costs };
  };
  const before = snap();
  let date = makeIsoDate(gameStartDate());
  for (let day = 0; day < 62; day += 1) {
    date = addDays(date, 1);
    advanceCore(core, date);
  }
  const after = snap();
  // A draw on the books is what the journal moved: a counted owner's group
  // receives the whole draw (business.ts), so it is not weighted again.
  const draws = coreAPI(core)
    .moduleState("business")
    .table("draws")
    .rows()
    .reduce((n, row) => n + Number(row.drawnMinor ?? 0), 0);
  return {
    residents,
    sales: (after.sales - before.sales) / residents,
    wages: (after.wages - before.wages) / residents,
    costs: (after.costs - before.costs) / residents,
    draws: draws / residents,
  };
}

describe(`firms sized to the Census town in ${place.name} (${place.real} people, seed ${seed})`, () => {
  it("each line of the firms' money per resident is near the sample town's", () => {
    const sample = perResident(1);
    const census = perResident();
    expect(
      census.residents / sample.residents,
      `${place.name}: residents against the sample (seed ${seed})`,
    ).toBeGreaterThan(1.5);
    // Sales, wages and costs are sums over every firm; the owners' draws are
    // a few owners' choices, so they sit in a wider band.
    const bands = {
      sales: [0.6, 1.6],
      wages: [0.6, 1.6],
      costs: [0.6, 1.6],
      draws: [0.25, 4],
    } as const;
    for (const line of ["sales", "wages", "costs", "draws"] as const) {
      const ratio = census[line] / sample[line];
      const [low, high] = bands[line];
      expect(
        ratio,
        `${place.name}: ${line} per resident at Census scale over the sample's (seed ${seed})`,
      ).toBeGreaterThan(low);
      expect(ratio, `${place.name}: ${line} (seed ${seed})`).toBeLessThan(high);
    }
  }, 1_800_000);
});
