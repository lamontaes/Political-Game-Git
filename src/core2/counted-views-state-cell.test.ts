/**
 * The town's counted voters read their own state's survey cell (pool item
 * core-counted-views-town-groups-national-cell): households whose place id is
 * their governing unit's, which the place lookup may not know, were given the
 * nation's CES 2024 spread instead of their state's, so a state's lean never
 * reached most of its counted voters. In a drawn place that has such
 * households, every counted voter's cell is the town's state's at their age.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { countedResidents, countedSurveyCell } from "./electorate";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { stateOfPlaceKey } from "./places";
import { VIEWS_KEYS } from "./modules/views";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

it("a counted voter whose place the lookup does not know reads the town's state, not the nation", () => {
  let proof: string | undefined;
  for (let draw = 0; draw < DRAWS && !proof; draw++) {
    const place = drawPlace(`${seed}-${draw}`, "counted-views-state-cell");
    const where = `seed ${place.seed}, ${place.name} (${place.key})`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const state = stateOfPlaceKey(place.key)!.slice(3);
    const row = (VIEWS_KEYS.states as Record<string, { mean: number }>)[state];
    // A state the survey has no sample of reads the nation's: nothing to tell apart.
    if (!row) continue;
    const unknown = countedResidents(core).filter(
      (voter) => !corePlaceByJurisdictionId(voter.placeId as never),
    );
    if (!unknown.length) continue;
    for (const voter of unknown) {
      const cell = countedSurveyCell(core, voter);
      expect(cell, `${where}: ${voter.id}`).not.toBe(VIEWS_KEYS.national);
    }
    proof = `${where}: ${unknown.length} counted voters in groups the lookup does not know read ${state}'s cells`;
  }
  expect(
    proof,
    `none of ${DRAWS} drawn places (seed ${seed}) had counted voters the place lookup does not know in a state the survey sampled`,
  ).toBeDefined();
  console.log(`VIEWS ${proof}`);
}, 3_600_000);
