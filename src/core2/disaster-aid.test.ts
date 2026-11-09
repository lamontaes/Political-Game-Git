/**
 * A disaster elsewhere reaches the state's budget (Nation, Nov 8): the
 * federal Public Assistance FEMA obligated for it, read when the disaster is
 * opened, comes into the state's budget as federal aid and goes out as relief
 * in the year it begins. Played in a place drawn from all 56 on a seed
 * nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { BUDGETS_MODULE_ID, type BudgetRow } from "./modules/budgets";
import {
  nationalDisasterDetail,
  nationalEvents,
} from "./modules/national-events";
import { coreAPI } from "./state";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

it("a disaster's federal aid is in the state's budget for the year", () => {
  const place = drawPlace(seed, "disaster-aid");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  let day = makeIsoDate(world.core.date);
  const end = addDays(day, 150);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(world.core, day);
  }
  const where = `${place.name}, seed ${seed}`;
  const budgets = api
    .moduleState(BUDGETS_MODULE_ID)
    .table("budgets")
    .rows() as unknown as BudgetRow[];
  const withAid = nationalEvents(api)
    .filter((e) => e.date <= day)
    .map((e) => ({
      e,
      aid: nationalDisasterDetail(api, e.id)!.publicAssistanceMinor,
    }))
    .filter(({ aid }) => aid > 0)
    .map(({ e, aid }) => ({
      e,
      aid,
      row: budgets.find(
        (b) => b.governmentId === e.stateKey && b.source.includes(e.id),
      ),
    }));
  expect(
    withAid.length,
    `${where}: a disaster with federal aid`,
  ).toBeGreaterThan(0);
  for (const { e, aid, row } of withAid.filter((x) => x.row)) {
    expect(row!.revenueMinor.federalAid, e.id).toBeGreaterThanOrEqual(aid);
    expect(row!.spendingMinor.otherPrograms, e.id).toBeGreaterThanOrEqual(aid);
  }
  const reached = withAid.filter((x) => x.row);
  expect(
    reached.length,
    `${where}: disasters that reached a state budget`,
  ).toBeGreaterThan(0);
  const first = reached[0]!;
  process.stdout.write(
    `nation proof: disaster aid: ${where}; ${first.e.id} put ${first.aid} cents of federal aid into ${first.row!.id} (${reached.length} of ${withAid.length} with aid reached a budget)\n`,
  );
}, 1800000);
