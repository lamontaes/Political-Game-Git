/**
 * A county race is voted by the whole county (elections-county-race-sees-only-
 * the-town, step A): in a played world, a decided county contest's result
 * counts the rest of the town's county on the same engine as the town's
 * counted residents, kept as a place record by the county's id, beside the
 * town's own named and counted voters. A town race stays the town's. A place
 * drawn from all 56; one with no county on record (an island area) or no
 * county race decided in the window is passed over by name. Set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countyPlaceIdOf } from "./electorate-places";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { VOTING_MODULE_ID, type ResultRow } from "./modules/voting";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

it(`a county race counts the rest of the county's voters, a town race only the town's (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "county-race-county-votes");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const { stateKey } = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { stateKey: string };
    const county = countyPlaceIdOf(
      core.placeMetadata.countyNames as string | undefined,
      stateKey.slice(3),
    );
    if (!county) {
      tried.push(`${where}: no county on record`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 730));
    const contests = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    const results = api.moduleState(VOTING_MODULE_ID).table("results");
    const places = api.moduleState(VOTING_MODULE_ID).table("places");
    const decided = (family: string) =>
      contests.filter(
        (c) =>
          c.family === family &&
          !c.special &&
          (results.get(c.id) as unknown as ResultRow | undefined)?.winnerId,
      );
    const countyRaces = decided("countyOffice");
    if (!countyRaces.length) {
      tried.push(`${where}: no county race decided in two years`);
      continue;
    }
    for (const contest of countyRaces) {
      const result = results.get(contest.id) as unknown as ResultRow;
      const row = places.get(`place:${contest.id}:${county}`) as unknown as
        { eligible: number; cast: number } | undefined;
      // The rest of the county voted, counted by its place record.
      expect(
        row,
        `${where}: ${contest.id} has no ${county} place`,
      ).toBeTruthy();
      expect(row!.eligible, `${where}: ${contest.id}`).toBeGreaterThan(0);
      expect(result.placesCast ?? 0, `${where}: ${contest.id}`).toBeGreaterThan(
        0,
      );
      // The town's own voters are counted too, beside the county's.
      expect(
        result.namedEligible + result.countedEligible,
        `${where}: ${contest.id}`,
      ).toBeGreaterThan(0);
    }
    // A town race is still the town's alone.
    for (const contest of decided("municipalOffice"))
      expect(
        places.get(`place:${contest.id}:${county}`),
        `${where}: town race ${contest.id} counted the county`,
      ).toBeFalsy();
    const first = countyRaces[0]!;
    const row = places.get(`place:${first.id}:${county}`) as unknown as {
      eligible: number;
      cast: number;
    };
    const result = results.get(first.id) as unknown as ResultRow;
    process.stdout.write(
      `COUNTY RACE ${where}: ${countyRaces.length} county contests; ${first.id} counted ${county} (${row.eligible} eligible, ${Math.round(row.cast)} cast) beside the town's ${result.namedEligible} named and ${result.countedEligible} counted voters; winner ${result.winnerId}${tried.length ? `; passed over: ${tried.join("; ")}` : ""}\n`,
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 3_600_000);
