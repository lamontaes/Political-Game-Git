/* global process, console */
// One model, two tiers: does a town's full and counted people total its real
// Census population? For each seed (random when not given), the play build's
// own world (buildBenchWorld, the bench's place draw from all 56) is built
// and its town's residents, both tiers, are set against the place's Census
// reference population and its ACS adult count (B05003, the only place-level
// age table the game holds).
// Usage: CORE2_BOOKKEEPING=0 node --max-old-space-size=8000 --import tsx scripts/core2-year/census-match.mjs [--seeds a,b,c | --count 3]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const seeds =
  value("--seeds", undefined)?.split(",") ??
  Array.from({ length: Number(value("--count", 3)) }, () =>
    randomBytes(16).toString("hex"),
  );

const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { residentCounts, townPlaceOf } = await at(
  "src/core2/modules/residents.ts",
);
const { placeReferencePopulation } = await at(
  "src/simulation/nationwide-world/place-population.ts",
);
const { corePlaceByKey } = await at("src/core2/place-lookup.ts");
const { isDemoted } = await at("src/core2/counted-groups.ts");
const citizenship = JSON.parse(
  readFileSync("src/core2/data/place-citizenship-2024.json", "utf8"),
);

const rows = [];
for (const seed of seeds) {
  const date = gameStartDate();
  const world = buildBenchWorld(seed, date, { twoLevel: true });
  const core = world.core;
  const town = townPlaceOf(core);
  const key = core.placeMetadata?.placeKey;
  const geoid = corePlaceByKey(key)?.sourceGeoid;
  const reference = geoid ? placeReferencePopulation(geoid) : null;
  const adultsAcs = geoid ? citizenship.byPlace[geoid]?.[1] : undefined;
  const ageOn = (birth) => {
    const [y, m, d] = birth.split("-").map(Number);
    const [ty, tm, td] = core.date.split("-").map(Number);
    return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  };
  const full = [...core.people.values()].filter(
    (p) => p.placeId === town && p.alive && p.tier !== "husk" && !isDemoted(p),
  );
  const counted = residentCounts(core).find((r) => r.placeId === town);
  const fullAdults = full.filter((p) => ageOn(p.birthDate) >= 18).length;
  const people = full.length + (counted?.people ?? 0);
  const adults = fullAdults + (counted?.adults ?? 0);
  rows.push({
    seed,
    place: world.place.displayName ?? world.place.name,
    geoid,
    census: reference?.value ?? null,
    censusSource: reference?.source ?? null,
    full: full.length,
    counted: counted?.people ?? 0,
    people,
    adultsAcs: adultsAcs ?? null,
    adults,
    under18: people - adults,
    under18Acs:
      reference && adultsAcs !== undefined ? reference.value - adultsAcs : null,
    countedByAgeBand: counted?.byAgeBand ?? {},
  });
  console.error(JSON.stringify(rows.at(-1)));
}
console.log(JSON.stringify(rows, null, 2));
