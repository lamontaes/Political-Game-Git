/**
 * The presidency's ballot is the world's own choice (CTO, Nov 17): by the day
 * its filing closes, each major party has a candidate who weighed the race and
 * filed under their own label, and no filing comes from the party-nominee
 * stand-in. A place is drawn from all 56; a place with no presidential race (a
 * territory) is passed over by name. Set PRESIDENCY_SEED or GOLDEN_PATH_SEED to
 * replay a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { partySide } from "./appointments";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./modules/elections";
import { coreAPI } from "./state";

const seed =
  process.env.PRESIDENCY_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");
/** The year opens before most states' presidential filing closes. */
const START = "2028-01-02";
const DRAWS = 4;

it(`each major party has a world-chosen presidential candidate by the filing close (seed ${seed})`, () => {
  const passedOver: string[] = [];
  for (let draw = 0; draw < DRAWS; draw++) {
    const place = drawPlace(seed, `presidency-candidates:${draw}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, START, {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const elections = api.moduleState(ELECTIONS_MODULE_ID);
    const president = (
      elections.table("contests").rows() as unknown as ContestRow[]
    ).find(
      (contest) =>
        contest.officeId === "office:US:president" &&
        contest.electionDate.startsWith(START.slice(0, 4)),
    );
    if (!president) {
      passedOver.push(`${where}: no presidential race`);
      continue;
    }
    const closed = addDays(makeIsoDate(president.filingDeadline), 1);
    if (closed > core.date) advanceCore(core, closed);
    const filings = elections
      .table("filings")
      .query("byContest", [president.id]) as unknown as {
      id: string;
      how?: string;
    }[];
    expect(
      filings
        .filter((filing) => filing.how !== undefined)
        .map((filing) => `${filing.id}: ${filing.how}`),
      `${where}: presidential filings made by the stand-in`,
    ).toEqual([]);
    const sides = new Set(
      ballot(api, president.id).map((filing) =>
        partySide(filing.party ?? null),
      ),
    );
    expect(
      [-1, 1].filter((side) => !sides.has(side)),
      `${where}: major sides with no presidential candidate on ${core.date}`,
    ).toEqual([]);
    process.stdout.write(
      `presidency candidates: ${where}, ${ballot(api, president.id).length} on the ballot on ${core.date}; passed over: ${passedOver.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place had a presidential race (seed ${seed}): ${passedOver.join("; ")}`,
  );
}, 900_000);
