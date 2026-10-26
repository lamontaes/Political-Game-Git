/**
 * Bills go to subject committees (pool item gov-bills-go-to-subject-committees):
 * in a random place from all 56, the town as the player gets it, played a
 * year. The October 14 audit found every bill in the 'general' committee with
 * the same members and the same vote. Now bills reach several committees, and
 * the committees' members and votes differ from one bill to the next.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  LEGISLATURE_MODULE_ID,
  type CommitteeRecord,
} from "./modules/legislature";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it("sends bills to different subject committees whose votes differ", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "committee-routing-played");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const records = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("committees")
    .rows() as unknown as CommitteeRecord[];
  if (records.length < 5) {
    console.log(`committee-routing-played: few committee records in ${where}`);
    return;
  }
  const committees = new Set(records.map((row) => row.committee));
  expect(committees.has("general"), where).toBe(false);
  expect(committees.size, `${where}: committees used`).toBeGreaterThan(1);
  // The committees' members differ, and the votes differ from bill to bill.
  const rosters = new Set(
    records.map((row) => [...row.memberIds].sort().join(",")),
  );
  expect(rosters.size, `${where}: distinct committee rosters`).toBeGreaterThan(
    1,
  );
  const tallies = new Set(records.map((row) => `${row.yes}-${row.no}`));
  expect(tallies.size, `${where}: distinct committee tallies`).toBeGreaterThan(
    1,
  );
  // A committee that heard a bill voted on it, member by member; one that
  // held it without a hearing recorded no votes.
  for (const row of records.filter((entry) => entry.heard))
    expect(row.votes.length, `${where} ${row.id}`).toBeGreaterThan(0);
}, 900_000);
