// @vitest-environment node
/** A town contest's returns and places go once a newer town election night has a result; every result stays (keep results, not their history). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { VOTING_MODULE_ID, dropOlderTownReturns } from "./modules/voting";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  `drops an older town contest's returns and places, keeps its result and an outside race's returns (replay ${replay})`,
  { timeout: 900_000 },
  () => {
    const drawn = drawPlace(replay, "town-returns-retention");
    const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    });
    const api = coreAPI(core);
    const voting = api.moduleState(VOTING_MODULE_ID);
    const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
    const town = contests.rows()[0] as unknown as { id: string };
    expect(town, drawn.name).toBeDefined();
    const night = (id: string, date: string) => {
      voting
        .table("results")
        .put({ id: `result:${id}`, contestId: id, date } as never);
      voting
        .table("returns")
        .put({ id: `returns:${id}`, contestId: id, reports: [] } as never);
      voting
        .table("places")
        .put({ id: `place:${id}:p1`, contestId: id, placeId: "p1" } as never);
    };
    night(town.id, "2020-11-03");
    night("race:outside:old", "2020-11-03");
    dropOlderTownReturns(api, "contest:newer", "2024-11-05");
    // A newer night that is not a town contest drops nothing.
    expect(
      voting.table("returns").get(`returns:${town.id}`),
      drawn.name,
    ).toBeDefined();
    contests.put({ ...(town as object), id: "contest:newer" } as never);
    dropOlderTownReturns(api, "contest:newer", "2024-11-05");
    expect(
      voting.table("returns").get(`returns:${town.id}`),
      drawn.name,
    ).toBeUndefined();
    expect(
      voting.table("places").query("byContest", [town.id]),
      drawn.name,
    ).toHaveLength(0);
    expect(
      voting.table("results").get(`result:${town.id}`),
      drawn.name,
    ).toBeDefined();
    expect(
      voting.table("returns").get("returns:race:outside:old"),
      drawn.name,
    ).toBeDefined();
  },
);
