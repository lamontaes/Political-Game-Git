import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { VOTING_MODULE_ID } from "./modules/voting";
import { coreAPI } from "./state";

// The exit poll counts the counted voters too: a town where most voters are
// counted no longer reports a few dozen people. Each counted voter tells by
// the named voters' rule (pollsterCase and the trait lean), at its turnout
// share, so the tally holds about everyone who voted in the town's own race.
describe.each(["exit-poll-counted-a", "exit-poll-counted-b"])(
  "(%s)",
  (salt) => {
    const place = drawPlace(salt, "elections-exit-poll-counted-voters");
    it(`the poll holds the counted voters' answers (${place.name}, ${place.key}, seed ${place.seed})`, () => {
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 700));
      const api = coreAPI(core);
      const results = (
        api
          .moduleState(VOTING_MODULE_ID)
          .table("results")
          .rows() as unknown as {
          contestId: string;
          namedTurnout: number;
          countedTurnout: number;
          exitPoll: Record<string, number>;
        }[]
      ).filter((row) => row.countedTurnout > 0);
      expect(results.length, "a race with counted voters").toBeGreaterThan(0);
      for (const row of results) {
        const polled = Object.values(row.exitPoll).reduce((a, b) => a + b, 0);
        // More than the named voters alone, and no more than everyone who voted
        // (each answer's count is rounded on its own, so by at most one each).
        expect(polled, row.contestId).toBeGreaterThan(row.namedTurnout);
        expect(polled, row.contestId).toBeLessThanOrEqual(
          row.namedTurnout +
            row.countedTurnout +
            Object.keys(row.exitPoll).length,
        );
      }
    }, 600_000);
  },
);
