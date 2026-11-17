/**
 * The played places as their state counts them (`residentsPart`): a county held as a sample
 * of households names each sampled worker's county employer, and the place's unplaced workers
 * (its employment target less its recorded jobs) already count those same workers. Counting
 * both put every working-age adult of the county at work, so nobody there could be looking and
 * the rest of the state was left holding the state's whole jobless count (Waimanalo, Hawaii,
 * Nov 17: 493,038 of the county's 582,521 adults at work, every working-age band full).
 * A place is drawn from all 56; set COUNTRY_PART_SEED to replay a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  COUNTRY_AGE_BANDS,
  resolveCountryPart,
  type CountryState,
} from "./country-model";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsPart, residentsRuntime } from "./modules/residents";
import { placeStateKey } from "./place-map";
import { coreAPI } from "./state";

const seed = process.env.COUNTRY_PART_SEED ?? randomBytes(8).toString("hex");
const sum = (values: readonly number[]) => values.reduce((n, v) => n + v, 0);

it("counts a sampled county's workers once, and drops nobody who is looking", () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "country-part-counts");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const rt = residentsRuntime(core)!;
    // The case: a place of the drawn state held as a sample, each record standing for many.
    const sampled = new Set<string>();
    for (const h of rt.store.liveHouseholds())
      if (
        rt.store.weightOf(h) > 1 &&
        h.employment?.length &&
        placeStateKey(h.placeId) === place.state
      )
        sampled.add(h.placeId);
    if (!sampled.size) {
      passed.push(`${where}: no place held as a sample with county employers`);
      continue;
    }
    // Two days in, the jobs engine holds the opening's seekers.
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    for (const placeId of sampled) {
      // What the place's own records say, each household times what it stands for.
      let named = 0,
        unplaced = 0;
      for (const h of rt.store.liveHouseholds()) {
        if (h.placeId !== placeId) continue;
        const weight = rt.store.weightOf(h);
        named += (h.employment?.length ?? 0) * weight;
        unplaced += h.unplacedWorkers * weight;
      }
      const part = residentsPart(core, new Set([placeId]), COUNTRY_AGE_BANDS);
      const recorded =
        sum([...part.workersByEmployer].flatMap(([id, n]) => (id ? [n] : []))) +
        0;
      const said = `${where}, ${placeId}: ${Math.round(sum(part.workers))} at work of ${Math.round(sum(part.adults))} adults; ${Math.round(named)} named by a county employer, ${Math.round(unplaced)} unplaced, ${Math.round(recorded)} in recorded jobs; ${Math.round(sum(part.seekers))} looking`;
      process.stderr.write(`${said}\n`);
      // The named and the unplaced are the same workers: at most the larger of the two is at
      // work outside a recorded job, never their sum.
      expect(sum(part.workers), said).toBeLessThanOrEqual(
        recorded + Math.max(named, unplaced) + 1e-6,
      );
    }
    // And the state's tier keeps everyone the records say is looking: no band is so full of
    // workers that its seekers have no room.
    const key = place.state;
    const places = new Set(
      rt.input.accounts
        .map((row) => row.placeId)
        .filter((id) => placeStateKey(id) === key),
    );
    const counts = residentsPart(core, places, COUNTRY_AGE_BANDS);
    const state = coreAPI(core)
      .moduleState("macro")
      .table("countryStates")
      .get(`country-state:${key}`) as unknown as CountryState;
    const held = resolveCountryPart(state, {
      people: counts.adults,
      workers: counts.workers,
      seekers: counts.seekers,
      children: counts.children,
      jobs: {},
      unsortedJobs: sum(counts.workers),
      cash: 0,
    });
    const looking = sum(counts.seekers);
    expect(
      looking,
      `${where}: nobody is looking in the played places`,
    ).toBeGreaterThan(0);
    expect(
      sum(held.seekers),
      `${where}: ${Math.round(looking)} looking by the records, ${Math.round(sum(held.seekers))} kept by the state`,
    ).toBeCloseTo(looking, 6);
    return;
  }
  throw new Error(`no drawn place had a sampled county: ${passed.join("; ")}`);
}, 1_800_000);
