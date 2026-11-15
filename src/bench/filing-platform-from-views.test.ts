import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { contestPositions } from "../core2/contest-positions";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { platformFromViews } from "../core2/modules/candidacy";
import {
  checkEligibility,
  filingOfficeFor,
  playerContests,
  type ContestRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { buildBenchWorld } from "./world";

// A filing made at the counter carries no hand-built platform: the filing
// takes the filer's own stands, read from their views on the questions the
// seat takes up, the same read a simulated candidate's filing makes. Pinned
// to two drawn places (fixed seed and tags, never a draw to hope for):
// filing-platform-a is Lansdowne, Pennsylvania; filing-platform-b is
// Plankinton, South Dakota.
const PINNED = ["filing-platform-a", "filing-platform-b"];
const SEED = "c1-filing-platform-from-views";
const WEEKS = 52;

it.each(PINNED)(
  "the counter files the player's own stands (%s)",
  (tag) => {
    setBookkeeping(false);
    const place = drawPlace(SEED, tag);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const playerId = core.playerId as PersonId;
    const open = () =>
      playerContests(api).find(
        (row) =>
          row.level !== "federal" &&
          row.level !== "state" &&
          checkEligibility(api, playerId, row.id).every((check) => check.met),
      );
    let contest: ContestRow | undefined = open();
    for (let week = 0; week < WEEKS && !contest; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      contest = open();
    }
    expect(
      contest,
      `${where}: no local race the player may file for`,
    ).toBeTruthy();
    const filedWith = filingOfficeFor(api, contest!.id).filedWith;
    let counter = openBenchFilingVisit(core, playerId, filedWith, 10 * 60);
    counter = chooseAtCounter(core, counter, `pick:${contest!.id}`);
    // No platform handed in, as the counter files.
    counter = chooseAtCounter(core, counter, "file");
    const result = counter.result as {
      status: string;
      filing?: { id: string; platform: readonly string[] };
    };
    expect(result.status, where).not.toBe("refused");
    const platform = result.filing!.platform;
    const positions = contestPositions(api, contest!);
    expect(
      platform.length,
      `${where}: the filing carries stands`,
    ).toBeGreaterThan(0);
    // Each stand is on a question the seat takes up, one to a question.
    const questions = platform.map((row) => row.split("=")[0]!);
    for (const question of questions)
      expect(positions, where).toContain(question);
    expect(new Set(questions).size, where).toBe(questions.length);
    // And it is the person's own read, the one a simulated filing makes.
    expect(platform, where).toEqual(
      platformFromViews(api, playerId, null, positions),
    );
  },
  600_000,
);
