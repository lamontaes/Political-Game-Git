/**
 * A candidate who dies is off the ballot (pool: gov-dead-candidate-stays-on-ballot;
 * the trace audit's Virginia year, where a dead candidate won the governorship).
 * In the played world, a contest with candidates on its ballot loses the one
 * who dies, and the count reads the ballot on the day it is held.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
} from "./modules/elections";
import { coreAPI } from "./state";

it("takes a candidate who dies off the ballot and leaves the others", () => {
  for (let attempt = 0; attempt < 12; attempt++) {
    const seed = randomBytes(8).toString("hex");
    const place = drawPlace(seed, "ballot-dead-candidate");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // Past the filing deadlines of the first elections.
    advanceCore(core, addDays(makeIsoDate(core.date), 200));
    const contests = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    const contest = contests.find(
      (row) =>
        row.electionDate > core.date &&
        ballot(api, row.id).filter((f) => core.people.has(f.personId)).length >=
          2,
    );
    if (!contest) continue;
    const before = ballot(api, contest.id).filter((f) =>
      core.people.has(f.personId),
    );
    const doomed = before[0]!;
    api.updatePerson(doomed.personId, { alive: false });
    const after = ballot(api, contest.id);
    expect(
      after.some((f) => f.personId === doomed.personId),
      `${where} ${contest.id}`,
    ).toBe(false);
    // Everyone else who was living stays.
    expect(after.length, where).toBe(
      before.filter((f) => f.personId !== doomed.personId).length,
    );
    return;
  }
  throw new Error(
    "No drawn place in 12 draws had a contest with two named candidates.",
  );
}, 1_200_000);
