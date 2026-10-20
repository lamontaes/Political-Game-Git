/* global process, console */
// One model, two tiers: does a town opened at its Census size hold the
// businesses and jobs the county rates say it has? The town's own place is
// built (a random one of all 56 when --place is not given) with `countScale`
// at the Census count over the sample, a year is played, and the town's
// establishments and the jobs they hold (full people, and counted workers at
// their weight) are set against `localBusinessSupplyFor` at the Census size.
// Usage: CORE2_BOOKKEEPING=0 node --max-old-space-size=8000 --import tsx scripts/core2-year/census-scaled-economy.mjs [--seed s] [--place key] [--days 365]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const seed = value("--seed", randomBytes(8).toString("hex"));
const days = Number(value("--days", 365));

const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { setBookkeeping } = await at("src/core2/bookkeeping.ts");
const { addDays, makeIsoDate } = await at("src/core2/kernel/dates.ts");
const { townPlaceOf, residentCounts } = await at(
  "src/core2/modules/residents.ts",
);
const { corePlaceByKey } = await at("src/core2/place-lookup.ts");
const { placeReferencePopulation } = await at(
  "src/simulation/nationwide-world/place-population.ts",
);
const { localBusinessSupplyFor } = await at(
  "src/simulation/local-business-counts.ts",
);
setBookkeeping(false);

const date = gameStartDate();
const probe = buildBenchWorld(seed, date, {
  twoLevel: true,
  ...(value("--place", undefined) ? { placeKey: value("--place") } : {}),
});
const geoid = corePlaceByKey(probe.core.placeMetadata?.placeKey)?.sourceGeoid;
const reference = geoid ? placeReferencePopulation(geoid)?.value : undefined;
const sampled = probe.core.people.size;
const scale = reference && reference > sampled ? reference / sampled : 1;
const started = Date.now();
const world =
  scale > 1
    ? buildBenchWorld(seed, date, {
        twoLevel: true,
        placeKey: probe.core.placeMetadata?.placeKey,
        countScale: scale,
      })
    : probe;
const opened = Date.now();
const { DevMode } = await at("src/bench/dev-mode.ts");
const { BenchPlayer } = await at("src/bench/player.ts");
const core = world.core;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
dev.advance(addDays(makeIsoDate(core.date), days));
const played = Date.now();
const town = townPlaceOf(core);
const counted = residentCounts(core).find((r) => r.placeId === town);
const kinds = new Map();
for (const o of core.organizations.values())
  if (o.placeId === town &&
    o.kind === "employer" &&
    !o.outsideFlow &&
    !o.publicPayAuthority &&
    !o.governmentFacts)
    kinds.set(o.kind, (kinds.get(o.kind) ?? 0) + 1);
const supply =
  localBusinessSupplyFor(world.place.context.jurisdiction.id) ?? [];
const expected = supply.reduce((n, r) => n + r.expected, 0);
const seated = [...kinds.values()].reduce((n, c) => n + c, 0);
const fullJobs = [...core.people.values()].filter(
  (p) => p.placeId === town && p.alive && p.jobId,
).length;
console.log(
  JSON.stringify(
    {
      seed,
      place: world.place.displayName ?? world.place.name,
      reference,
      sampled,
      scale,
      expectedEstablishments: Math.round(expected),
      seatedEstablishments: seated,
      fullJobs,
      countedWorkers: counted?.workers ?? 0,
      openSeconds: (opened - started) / 1000,
      yearSeconds: (played - opened) / 1000,
    },
    null,
    2,
  ),
);
