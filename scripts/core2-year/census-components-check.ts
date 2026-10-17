/**
 * Does a played year of a town move at the rates the Census says its state
 * moved? For each drawn place: one year of the played world, the town's births
 * and deaths and its net change from moving per 1,000 residents, against its
 * state's latest Census Vintage 2025 county components (births, deaths,
 * domestic and international net migration, summed over the state's counties
 * and divided by the state's population). A town is not its state; this checks
 * the order of magnitude and the sign, one run, no repeat medians.
 *
 * Reads: data/research/renewal/moves (the roadmap R9 county components).
 * Run: node --import tsx scripts/core2-year/census-components-check.ts [seed ...]
 */
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { lawChain } from "../../src/core2/modules/laws";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { coreAPI } from "../../src/core2/state";
import regions from "../../src/core2/data/regional/regions.json" with { type: "json" };
import { drawPlace } from "./place";

const COMPONENTS_DIR = "data/research/renewal/moves";
const PER = 1000;

interface Components {
  births: number;
  deaths: number;
  domestic: number;
  international: number;
  year: number;
}

/** A state's latest-year county components summed, from the roadmap R9 files. */
function stateComponents(usps: string): Components | undefined {
  const name = readdirSync(COMPONENTS_DIR).find(
    (file) => file === `roadmap-r9-components-${usps}.json`,
  );
  if (!name) return undefined;
  const rows = (
    JSON.parse(readFileSync(join(COMPONENTS_DIR, name), "utf8")) as {
      rows: {
        year: number;
        value: {
          BIRTHS: number;
          DEATHS: number;
          DOMESTICMIG: number;
          INTERNATIONALMIG: number;
        };
      }[];
    }
  ).rows;
  const year = Math.max(...rows.map((row) => row.year));
  const sum: Components = {
    births: 0,
    deaths: 0,
    domestic: 0,
    international: 0,
    year,
  };
  for (const row of rows)
    if (row.year === year) {
      sum.births += row.value.BIRTHS;
      sum.deaths += row.value.DEATHS;
      sum.domestic += row.value.DOMESTICMIG;
      sum.international += row.value.INTERNATIONALMIG;
    }
  return sum;
}

const statePeople = (usps: string): number | undefined =>
  Object.values(
    (
      regions as unknown as {
        states: Record<string, { usps: string; population: number }>;
      }
    ).states,
  ).find((row) => row.usps === usps)?.population;

const seeds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [randomBytes(6).toString("hex")];
for (const seed of seeds) {
  const place = drawPlace(seed, "census-components");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const chain = lawChain(api);
  const usps = chain.stateKey.replace(/^US-/, "");
  const store = residentsRuntime(core)!.store;
  const fullHere = () =>
    [...core.people.values()].filter(
      (p) => p.alive && p.placeId === chain.townPlaceId,
    );
  const startedWith = new Set(fullHere().map((p) => p.id));
  const start = store.weightedPeople(chain.townPlaceId) + startedWith.size;
  const yearStart = core.date;
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const hereNow = fullHere();
  const end = store.weightedPeople(chain.townPlaceId) + hereNow.length;
  const rows = (
    api.moduleState("core2-renewal-v1").table("counts").rows() as unknown as {
      placeId: string;
      births: string[];
      deaths: string[];
    }[]
  ).filter((row) => row.placeId === chain.townPlaceId);
  // Births and deaths of the counted people (the counts table) and of the full ones (who was here at the start and is dead; who was born since).
  const fullDied = [...startedWith].filter(
    (id) => core.people.get(id as never)?.alive === false,
  ).length;
  const fullBorn = hereNow.filter((p) => p.birthDate > yearStart).length;
  const births = rows.reduce((n, row) => n + row.births.length, 0) + fullBorn;
  const deaths = rows.reduce((n, row) => n + row.deaths.length, 0) + fullDied;
  const moved = end - start - births + deaths;
  const rate = (n: number, base: number) => ((n / base) * PER).toFixed(1);
  const real = stateComponents(usps);
  const people = statePeople(usps);
  console.log(
    `${place.name}, ${usps} (${place.key}), seed ${seed}: ${start} residents; per 1,000 over a year: births ${rate(births, start)}, deaths ${rate(deaths, start)}, net moving ${rate(moved, start)}`,
  );
  if (real && people)
    console.log(
      `  ${usps} Census ${real.year}: births ${rate(real.births, people)}, deaths ${rate(real.deaths, people)}, net domestic ${rate(real.domestic, people)}, net international ${rate(real.international, people)}`,
    );
  else console.log(`  no Census components for ${usps}`);
}
