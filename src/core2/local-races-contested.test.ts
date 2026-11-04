/**
 * How many local races draw a challenger (elections-local-races-too-uncontested,
 * Lane 1 unit 5): in played worlds (buildBenchWorld, every module installed)
 * of six places drawn from all 56, the share of decided local contests (town,
 * township and county seats, specials left out) with no more candidates on the
 * ballot than seats falls inside Ballotpedia's band, taken together. Each
 * on-ballot filing traces to the candidacy decision that made it. A real share
 * checks the total; who runs follows each resident's own reasons. Set
 * GOLDEN_PATH_SEED to reproduce a run.
 *
 * Ballotpedia: 71 percent of the 4,500-plus local elections it covered in
 * April 2024 were uncontested
 * (https://news.ballotpedia.org/2024/05/03/71-of-the-more-than-4500-local-elections-ballotpedia-covered-in-april-were-uncontested/);
 * BallotReady: 66 percent of county legislative races and 74 percent of
 * sheriff races were uncontested in November 2020
 * (https://organizations.ballotready.org/research/nothing-to-lose-uncontested-races-in-2020-and-their-implications).
 * The item's band is 50 to 80 percent.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { decisionOf } from "./modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { VOTING_MODULE_ID } from "./modules/voting";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PLACES = 6;
const DAYS = 730;
const LOCAL = new Set(["city", "township", "county"]);

it(`local races drawn by residents' own reasons are uncontested at a real rate (seed ${seed})`, () => {
  setBookkeeping(false);
  let decided = 0;
  let uncontested = 0;
  const lines: string[] = [];
  for (let n = 0; n < PLACES; n += 1) {
    const place = drawPlace(`${seed}:${n}`, "local-races-contested");
    const where = `${place.name} (${place.key}), run seed ${seed}:${n}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    const api = coreAPI(core);
    const elections = api.moduleState(ELECTIONS_MODULE_ID);
    const results = api.moduleState(VOTING_MODULE_ID).table("results");
    let here = 0;
    let hereUncontested = 0;
    const counts: string[] = [];
    for (const contest of elections
      .table("contests")
      .rows() as unknown as ContestRow[]) {
      if (!LOCAL.has(contest.level) || contest.special) continue;
      if (!results.get(`result:${contest.id}`)) continue;
      const onBallot = (
        elections
          .table("filings")
          .query("byContest", [contest.id]) as unknown as FilingRow[]
      ).filter((f) => f.status === "on-ballot");
      // Every candidate on the ballot decided to run, by their own record.
      for (const filing of onBallot) {
        const decision = decisionOf(
          api,
          contest.id,
          filing.personId as PersonId,
        );
        expect(
          decision?.run,
          `${where}: ${filing.id} has no decision to run`,
        ).toBe(true);
      }
      here += 1;
      // One seat a contest: no more candidates than seats is one or none.
      if (onBallot.length <= 1) hereUncontested += 1;
      counts.push(`${contest.id} ${onBallot.length}`);
    }
    decided += here;
    uncontested += hereUncontested;
    lines.push(
      `${where}: ${hereUncontested} of ${here} uncontested [${counts.join("; ")}]`,
    );
  }
  const share = decided ? uncontested / decided : NaN;
  process.stdout.write(
    `LOCAL RACES seed ${seed}: ${uncontested} of ${decided} uncontested (${share.toFixed(2)})\n${lines.join("\n")}\n`,
  );
  expect(decided, lines.join("\n")).toBeGreaterThanOrEqual(20);
  expect(share, lines.join("\n")).toBeGreaterThanOrEqual(0.5);
  expect(share, lines.join("\n")).toBeLessThanOrEqual(0.8);
}, 3_600_000);
