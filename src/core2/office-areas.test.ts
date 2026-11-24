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
import { contestStands, standReasons } from "./contest-positions";
import { gameStartDate } from "./game-start";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 24;
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
      const platform = stands.map((stand) => `${stand.position}=0.5`);
      expect(standReasons(api, contest, platform)).toEqual(
        stands.map((stand) => `${stand.position}=${stand.reason}`),
      );
    }
    process.stdout.write(
      `office areas: ${place.name} (${place.key}, seed ${place.seed}), ${contests.length} row office contests; passed over: ${passedOver.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place held a county row office contest (seed ${seed}): ${passedOver.join("; ")}`,
  );
}, 600_000);
