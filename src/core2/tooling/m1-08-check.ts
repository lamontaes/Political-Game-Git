/**
 * M1-08 golden-path check, on the whole economy. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. A drawn town runs three years.
 * Passes when: (1) its businesses opened and closed as often as its state's
 * do (Census BDS establishment entry and exit rates, 2010-2019 and
 * 2022-2023): each count inside the 5th to 95th percentile a town this size
 * would see at its state's rate (Poisson); (2) every owner's draw came out of
 * profit the business kept; (3) every new business
 * and location records who founded it and why. Exits nonzero on failure.
 */
import bds from "../data/business/bds-rates.json" with { type: "json" };
import { advanceCore, createLifeCore } from "../life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { coreAPI } from "../state";
import { generatedOpening } from "./generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2],
  placeKey = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3];
if (!seed || !placeKey)
  throw new Error("GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are required.");
const YEARS = 3;
const failures: string[] = [];
const input = withWorldEconomy(
  generatedOpening({ seed, key: placeKey }, { twoLevel: true }),
);
const core = createLifeCore(input, {
  data: worldCoreData(),
  modules: [...WORLD_MODULES],
});
const api = coreAPI(core);
advanceCore(core, input.startedAt);
const openAt = () =>
  [...core.finance.businesses.values()].filter((b) => !b.closedAt).length;
const opening = openAt();
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + YEARS);
advanceCore(core, end.toISOString().slice(0, 10));
const closing = openAt();

const business = api.moduleState("business");
const foundings = [...business.table("foundings").rows()] as unknown as {
  organizationId: string;
  founderId?: string;
  kindId: string;
  room?: number;
}[];
const closed = [...core.finance.businesses.values()].filter(
  (b) => b.closedAt && b.closedAt > input.startedAt,
).length;

// The state's rates, from its two-digit FIPS (the place key's first two digits).
const rates = (
  bds.states as Record<string, { entryPct: number; exitPct: number }>
)[placeKey.slice(0, 2)] ?? {
  entryPct: bds.nationEntryPct,
  exitPct: bds.nationExitPct,
};
/** The p-th quantile of a Poisson count with mean `mean`. */
function poisson(mean: number, q: number): number {
  let k = 0,
    term = Math.exp(-mean),
    total = term;
  while (total < q && k < 10_000) {
    k += 1;
    term *= mean / k;
    total += term;
  }
  return k;
}
const exposure = ((opening + closing) / 2) * YEARS;
const band = (label: string, count: number, pct: number) => {
  const mean = (exposure * pct) / 100;
  const low = poisson(mean, 0.05),
    high = poisson(mean, 0.95);
  if (count < low || count > high)
    failures.push(
      `${label} ${count} outside [${low}, ${high}] (mean ${mean.toFixed(1)})`,
    );
  return { count, low, high, mean: +mean.toFixed(1) };
};
const entry = band("openings", foundings.length, rates.entryPct);
const exit = band("closings", closed, rates.exitPct);

// Owners' draws: out of kept profit, leaving the cushion.
const draws = [...business.table("draws").rows()] as unknown as {
  id: string;
  retainedBeforeMinor: number;
  drawnMinor: number;
  cashMinor: number;
  cushionMinor: number;
}[];
let drawn = 0;
for (const row of draws) {
  if (row.drawnMinor <= 0) continue;
  drawn += 1;
  if (row.drawnMinor > row.retainedBeforeMinor + 1)
    failures.push(
      `${row.id}: drew ${row.drawnMinor} with ${row.retainedBeforeMinor} kept`,
    );
}
for (const row of foundings)
  if (!row.founderId) failures.push(`${row.organizationId}: founded by no one`);

const owners = new Map(
  (
    [...business.table("owners").rows()] as unknown as {
      id: string;
      basis: string;
    }[]
  ).map((row) => [row.id, row.basis]),
);
const locations = foundings.filter(
  (row) => owners.get(row.organizationId) === "location",
).length;
console.log(
  JSON.stringify(
    {
      place: input.placeMetadata?.placeName,
      seed,
      start: input.startedAt,
      years: YEARS,
      businesses: { opening, closing },
      stateRatesPct: rates,
      openings: entry,
      closings: exit,
      newLocations: locations,
      ownerDraws: drawn,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exit(1);
