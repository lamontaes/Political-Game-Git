/**
 * A candidate for U.S. Senator or President meets the Constitution's age
 * (elections-federal-office-minimum-age): 30 and 35, whatever the state's own
 * age for its statewide offices says. Played world, a place and seed nobody
 * chose; the player is the resident who turns 18 soonest, so is under both.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  type ContestRow,
} from "./modules/elections";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "federal-office-age");

it(`holds Senate and presidential candidates to 30 and 35 in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
  const required = (contest: ContestRow) =>
    checkEligibility(api, playerId!, contest.id).find(
      (check) => check.rule === "minimum-age",
    )!;
  let senate = 0;
  let president = 0;
  for (const contest of contests) {
    const kind = contest.officeId.slice(contest.officeId.lastIndexOf(":") + 1);
    if (kind !== "us-senate" && kind !== "president") continue;
    const check = required(contest);
    expect(
      Number(check.required),
      `${where}: ${contest.id}`,
    ).toBeGreaterThanOrEqual(kind === "us-senate" ? 30 : 35);
    expect(check.met, `${where}: ${contest.id} for a 17-year-old`).toBe(false);
    if (kind === "us-senate") senate += 1;
    else president += 1;
  }
  // The territories and D.C. send no senators.
  if (
    !["US-AS", "US-DC", "US-GU", "US-MP", "US-PR", "US-VI"].includes(
      place.state,
    )
  )
    expect(senate, `${where}: Senate contests`).toBeGreaterThan(0);
  if (!["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"].includes(place.state))
    expect(president, `${where}: presidential contests`).toBeGreaterThan(0);
}, 300_000);
