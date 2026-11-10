// @vitest-environment node
/** A decision not to run in a race long decided leaves the table in play; a decision to run stays (keep results, not their history). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CANDIDACY_MODULE_ID } from "./modules/candidacy";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  `drops a declined decision in a race decided long ago and keeps one to run (replay ${replay})`,
  { timeout: 900_000 },
  () => {
    const run = (on: boolean) => {
      const previous = setBookkeeping(on);
      try {
        const drawn = drawPlace(replay, "candidacy-decision-retention");
        const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
          placeKey: drawn.key,
          twoLevel: true,
        });
        const api = coreAPI(core);
        const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
        const decisions = api
          .moduleState(CANDIDACY_MODULE_ID)
          .table("decisions");
        // A race decided a year before the start, and two people's decisions in it.
        const contestId = "contest:test:long-decided";
        contests.put({
          id: contestId,
          officeId: "office:test",
          seatId: "seat:test",
          electionDate: addDays(makeIsoDate(core.date), -365),
        } as never);
        const decision = (personId: string, run: boolean) =>
          decisions.put({
            id: `${contestId}:${personId}`,
            personId,
            contestId,
            date: addDays(makeIsoDate(core.date), -400),
            run,
            reasons: {},
            scores: [],
            sourceIds: [],
          } as never);
        decision("person-declined", false);
        decision("person-ran", true);
        advanceCore(core, addDays(makeIsoDate(core.date), 35));
        return {
          declined: decisions.get(`${contestId}:person-declined`) !== undefined,
          ran: decisions.get(`${contestId}:person-ran`) !== undefined,
        };
      } finally {
        setBookkeeping(previous);
      }
    };
    expect(run(false)).toEqual({ declined: false, ran: true });
    expect(run(true)).toEqual({ declined: true, ran: true });
  },
);
