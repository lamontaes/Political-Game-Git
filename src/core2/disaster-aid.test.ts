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
import { setBookkeeping } from "./bookkeeping";
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
  // Bookkeeping is a debug switch (AGENTS.md, "Keep it simple"); a played-world check runs without it.
  setBookkeeping(false);
  const place = drawPlace(seed, "disaster-aid");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const where = `${place.name}, seed ${seed}`;
  let day = makeIsoDate(world.core.date);
  // Play on until the world's own exposures have made a disaster with federal
  // aid that reached a state budget, up to three years; running out of time
  // without one fails the test, never passes it.
  const end = addDays(day, 365 * 3);
  const aided = () => {
    const budgets = api
      .moduleState(BUDGETS_MODULE_ID)
      .table("budgets")
      .rows() as unknown as BudgetRow[];
    return nationalEvents(api)
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
  };
  let withAid = aided();
  while (day < end && !withAid.some((x) => x.row)) {
    for (let i = 0; i < 30 && day < end; i++) {
      day = addDays(day, 1);
      advanceCore(world.core, day);
    }
    withAid = aided();
  }
  expect(
    withAid.length,
    `${where}: a disaster with federal aid within three years`,
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
