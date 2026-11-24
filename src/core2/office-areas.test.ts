/**
 * A seat runs on what its office does (pool item
 * campaign-stands-chosen-by-the-office-and-the-record, P28 and C11).
 *
 * In worlds from buildBenchWorld in places drawn from all 56 on a seed nobody
 * chose (GOLDEN_PATH_SEED pins one), every county row office's contest (sheriff,
 * prosecutor, clerk, treasurer, assessor, coroner) offers only the policy areas
 * and budget lines office-areas.json gives that office, every stand has the
 * reason it was open to the seat, and a seat on a body that votes the budget
 * keeps its government's questions. A place with no row office contest is
 * passed over by name; the test fails by name when no drawn place has one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import officeAreas from "./data/campaigns/office-areas.json" with { type: "json" };
import budgetLineAreas from "./data/campaigns/budget-line-areas.json" with { type: "json" };
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { levelMayDecide } from "./modules/world-legislating";
import type { OfficeLevel } from "./offices-local";
import {
  contestPositions,
  contestStands,
  standReasons,
} from "./contest-positions";
import { platformFromViews } from "./modules/candidacy";
import { gameStartDate } from "./game-start";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 24;
const RECORDS = [
  "voted",
  "office-record",
  "circumstance",
  "faith",
  "degree",
  "heard",
];
const KINDS = officeAreas.kinds as Record<
  string,
  { areas: string[]; budgetLines: string[] }
>;

it(`a row office's stands are its own work, each with its reason (seed ${seed})`, () => {
  const passedOver: string[] = [];
  for (let draw = 0; draw < DRAWS; draw++) {
    const place = drawPlace(
      draw === 0 ? seed : `${seed}:${draw}`,
      "office-areas",
    );
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
    const contests = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).filter(
      (contest) =>
        KINDS[
          (offices.get(contest.officeId) as unknown as { kind: string }).kind
        ],
    );
    if (!contests.length) {
      passedOver.push(
        `${place.name} (${place.key}): no county row office contest`,
      );
      continue;
    }
    for (const contest of contests) {
      const kind = (
        offices.get(contest.officeId) as unknown as { kind: string }
      ).kind;
      const work = KINDS[kind]!;
      const stands = contestStands(api, contest);
      for (const stand of stands) {
        const where = `${place.name} (${place.key}, seed ${place.seed}) ${kind}: ${stand.position}`;
        if (stand.position.startsWith("budget-line:"))
          expect(work.budgetLines, where).toContain(
            stand.position.slice("budget-line:".length),
          );
        else {
          const key = stand.position.slice(stand.position.indexOf(":") + 1);
          expect(work.areas, where).toContain(key.slice(0, key.indexOf(".")));
        }
        expect(stand.reason, where).toBe(`office-work:${kind}`);
      }
    }
    // What the town's adults would file under each row office: every stand
    // they state has a reason from their own record, and the seat's.
    let judged = 0;
    const adults = [...world.core.people.values()]
      .filter((p) => p.alive)
      .slice(0, 40);
    for (const contest of contests) {
      const positions = contestPositions(api, contest);
      for (const adult of adults) {
        const platform = platformFromViews(api, adult.id, null, positions);
        const why = standReasons(api, contest, platform, adult.id, null);
        const where = `${place.name} (${place.key}, seed ${place.seed}) ${contest.officeId} ${adult.id}`;
        expect(why.length, `${where}: a stand has no reason`).toBe(
          platform.length,
        );
        for (const entry of why) {
          const [record, seat] = entry.slice(entry.indexOf("=") + 1).split(";");
          expect(RECORDS, where).toContain(record);
          expect(seat, where).toMatch(/^(office-work:|body-decides:)/);
          judged += 1;
        }
      }
    }
    process.stdout.write(
      `office areas: ${place.name} (${place.key}, seed ${place.seed}), ${contests.length} row office contests, ${judged} stands each with a record reason; passed over: ${passedOver.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place held a county row office contest (seed ${seed}): ${passedOver.join("; ")}`,
  );
}, 600_000);

/**
 * A council or board runs on a budget line only where its state's law lets
 * its government decide something in the line's family (the CTO, Nov 24: a New
 * Jersey borough runs no schools or hospitals; the state's home-rule and
 * Dillon's Rule record says what a body decides). Drawn places, each one
 * building a world and reading every local body seat's offered stands; a place
 * whose bodies hold no line of a family their state lets them decide nothing in
 * is passed over by name, and the test fails by name when no drawn place holds
 * the case.
 */
it(`a body seat offers a budget line only where its state lets it decide in the line's family (seed ${seed})`, () => {
  const lines = budgetLineAreas.lines as Record<string, string[]>;
  const passedOver: string[] = [];
  for (let draw = 0; draw < DRAWS; draw++) {
    const place = drawPlace(
      draw === 0 ? seed : `${seed}:${draw}`,
      "budget-line-areas",
    );
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
    const bodies = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).filter((contest) => {
      const office = offices.get(contest.officeId) as unknown as {
        kind: string;
        level: string;
      };
      return (
        ["council", "board", "county-board", "township-board"].includes(
          office.kind,
        ) && !["state", "federal"].includes(office.level)
      );
    });
    let judged = 0;
    for (const contest of bodies) {
      const office = offices.get(contest.officeId) as unknown as {
        level: OfficeLevel;
      };
      const decides = new Set(
        PLATFORM_QUESTIONS.filter((question) =>
          levelMayDecide(api, office.level, question),
        ).map((question) => question.split(":")[1]!.split(".")[0]!),
      );
      const lacking = Object.entries(lines).filter(
        ([, families]) => !families.some((family) => decides.has(family)),
      );
      if (!lacking.length) continue;
      judged += 1;
      const offered = contestPositions(api, contest);
      for (const [line, families] of lacking)
        expect(
          offered,
          `${place.name} (${place.key}, seed ${place.seed}) ${contest.officeId}: offers ${line} though its state lets it decide nothing in ${families.join(", ")}`,
        ).not.toContain(`budget-line:${line}`);
    }
    if (judged) {
      process.stdout.write(
        `budget-line areas: ${place.name} (${place.key}, seed ${place.seed}), ${judged} body seats checked; passed over: ${passedOver.join("; ") || "none"}\n`,
      );
      return;
    }
    passedOver.push(`${place.name} (${place.key}): no body lacking a family`);
  }
  throw new Error(
    `No drawn place held a body that lacks a line's family (seed ${seed}): ${passedOver.join("; ")}`,
  );
}, 600_000);
