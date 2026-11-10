// @vitest-environment node
/** A race's counted ballots go once the race is past the window; a recent race's stay (keep results, not their history). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { VOTING_MODULE_ID, dropOldCountedBallots } from "./modules/voting";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  `drops the counted ballots of a race past the window and keeps a recent race's (replay ${replay})`,
  { timeout: 900_000 },
  () => {
    const drawn = drawPlace(replay, "counted-ballot-retention");
    const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    });
    const api = coreAPI(core);
    const rows = api.moduleState(VOTING_MODULE_ID).table("countedBallots");
    const row = (id: string, days: number) =>
      rows.put({
        id: `counted:${id}`,
        contestId: id,
        date: addDays(makeIsoDate(core.date), -days),
        field: [],
        voterIds: [],
      } as never);
    const window = api.parameter("countedBallotRetentionDays");
    row("contest:test:long-past", window + 30);
    row("contest:test:recent", window - 10);
    dropOldCountedBallots(api);
    expect(
      rows.get("counted:contest:test:long-past"),
      drawn.name,
    ).toBeUndefined();
    expect(rows.get("counted:contest:test:recent"), drawn.name).toBeDefined();
  },
);
