/* global process, console, performance */
// One model, two tiers: is a town above 10,000 sized to its Census count in
// its economy, not only its people? A place is drawn from all 56 (seeds are
// tried in turn until one has a reference population above the sample), the
// play build opens it with `countScale` set to its Census count over the
// sample, and it plays --days days. From the records it reports, against the
// Census-scaled expectation:
//   - the town's people (full plus counted) against its reference population;
//   - its establishments by kind against `localBusinessSupplyFor` at that
//     population (the sample's population gives the figure it would have had);
//   - the jobs held there and the housing it holds (owned homes and rentals).
// Usage: CORE2_BOOKKEEPING=0 node --max-old-space-size=8000 --import tsx scripts/core2-year/census-scaled-economy.mjs [--seed S] [--days 365] [--min 12000] [--max 60000]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const seed = value("--seed", randomBytes(16).toString("hex"));
const days = Number(value("--days", 365));
const min = Number(value("--min", 12000));
const max = Number(value("--max", 60000));

const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { advanceCore } = await at("src/core2/life.ts");
const { addDays, makeIsoDate } = await at("src/core2/kernel/dates.ts");
const { coreAPI } = await at("src/core2/state.ts");
const { drawPlace } = await at("scripts/core2-year/place.ts");
const { residentCounts, townPlaceOf, residentsRuntime } = await at(
  "src/core2/modules/residents.ts",
);
const { placeReferencePopulation } = await at(
  "src/simulation/nationwide-world/place-population.ts",
);
const { corePlaceByKey, corePlaceByJurisdictionId } = await at(
  "src/core2/place-lookup.ts",
);
const { localBusinessSupplyFor } = await at(
  "src/simulation/local-business-counts.ts",
);
const { townFigures, ownedHomes } = await at("src/core2/modules/housing.ts");
const { setBookkeeping } = await at("src/core2/bookkeeping.ts");
setBookkeeping(false);

// Draw places in turn until one is above the sample and inside the budget.
let place;
let reference;
for (let i = 0; i < 20000; i += 1) {
  const drawn = drawPlace(`${seed}:${i}`, "census-scaled-economy");
  const geoid = corePlaceByKey(drawn.key)?.sourceGeoid;
  const ref = geoid ? placeReferencePopulation(geoid) : null;
  if (ref && ref.value >= min && ref.value <= max) {
    place = drawn;
    reference = ref;
    break;
  }
}
if (!place)
  throw new Error(`no place between ${min} and ${max} for seed ${seed}`);
console.error(
  `seed ${seed}; ${place.name}, ${place.state} (${place.key}); reference ${reference.value} (${reference.source})`,
);

const sample = 10000;
const countScale = reference.value / sample;
const t0 = performance.now();
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
  countScale,
});
const core = world.core;
const api = coreAPI(core);
const opened = performance.now();
if (days > 0) advanceCore(core, addDays(makeIsoDate(core.date), days));
const done = performance.now();

const townId = townPlaceOf(core);
const counted = residentCounts(core).find((r) => r.placeId === townId);
const full = [...core.people.values()].filter(
  (p) => p.placeId === townId && p.alive && p.tier !== "husk",
).length;
const jid = core.placeMetadata?.housingTown ?? townId;
const supplyAt = (population) => {
  const rows = localBusinessSupplyFor(
    corePlaceByKey(place.key)?.context?.jurisdiction?.id ?? null,
  );
  return rows;
};
const supply = supplyAt(reference.value) ?? [];
const expectedEstablishments = supply.reduce((n, r) => n + r.expected, 0);
const expectedJobs = supply.reduce(
  (n, r) => n + r.expected * r.staffPerBusiness,
  0,
);
const businesses = [...core.finance.businesses.keys()].filter(
  (id) => core.organizations.get(id)?.placeId === townId,
);
let jobsFull = 0;
for (const id of businesses)
  jobsFull += core.finance.jobsByOrganization.get(id)?.size ?? 0;
const rt = residentsRuntime(core);
let jobsCounted = 0;
let renterHouseholds = 0;
let countedHouseholds = 0;
if (rt) {
  for (const h of rt.store.liveHouseholds()) {
    if (h.gone || h.placeId !== townId) continue;
    countedHouseholds += h.weight ?? 1;
    if (h.tenure === "rent") renterHouseholds += h.weight ?? 1;
  }
}
const fig = (() => {
  try {
    return townFigures(api, jid);
  } catch {
    return null;
  }
})();
const owned = ownedHomes(api, jid).length;
const report = {
  seed,
  place: `${place.name}, ${place.state}`,
  key: place.key,
  referencePopulation: reference.value,
  countScale,
  openSeconds: Math.round((opened - t0) / 100) / 10,
  yearSeconds: Math.round((done - opened) / 100) / 10,
  days,
  people: {
    full,
    counted: counted?.people ?? 0,
    total: full + (counted?.people ?? 0),
  },
  establishments: {
    inTown: businesses.length,
    expectedAtCensusSize: Math.round(expectedEstablishments),
    expectedAtSampleSize: Math.round(
      (expectedEstablishments * sample) / reference.value,
    ),
  },
  jobs: {
    fullJobsAtTownBusinesses: jobsFull,
    expectedAtCensusSize: Math.round(expectedJobs),
  },
  housing: {
    countedHouseholdsWeighted: countedHouseholds,
    renterHouseholdsWeighted: renterHouseholds,
    renters: fig?.renters ?? null,
    ownedHomeRecords: owned,
  },
};
console.log(JSON.stringify(report, null, 2));
