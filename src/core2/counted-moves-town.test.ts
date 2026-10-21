/**
 * The town's own counted households leave at the ACS rate like any other
 * (pool item core-counted-moves-town-groups-never-leave): households whose
 * place id is their governing unit's, which the place lookup may not know,
 * were skipped by the monthly moves and never moved. In a drawn place that has
 * such households, some of them leave in a few months, and they are not left
 * out of the year's departures.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedMoves } from "./modules/counted-moves";
import { residentsRuntime } from "./modules/residents";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

function trial(draw: number) {
  const place = drawPlace(`${seed}-${draw}`, "counted-moves-town");
  const where = `seed ${place.seed}, ${place.name} (${place.key})`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const store = residentsRuntime(core)!.store;
  // Groups whose households' place the lookup does not know.
  const unknown = new Set<string>();
  for (const h of store.liveHouseholds())
    if (!corePlaceByJurisdictionId(h.placeId as never))
      unknown.add(store.groups[h.group]!.id);
  if (!unknown.size) return undefined;
  const people = [...store.liveHouseholds()]
    .filter((h) => unknown.has(store.groups[h.group]!.id))
    .reduce((n, h) => n + store.weightedCount(h), 0);
  advanceCore(core, addDays(makeIsoDate(core.date), 150));
  const out = countedMoves(coreAPI(core)).filter(
    (row) => row.direction === "out" && unknown.has(row.groupId),
  );
  return { where, groups: unknown.size, people, out };
}

it("counted households of the governing town move, from groups the place lookup does not know", () => {
  let proof: string | undefined;
  for (let draw = 0; draw < DRAWS && !proof; draw++) {
    const t = trial(draw);
    if (!t) continue;
    const movers = t.out.reduce((n, row) => n + row.people, 0);
    expect(
      t.out.length,
      `${t.where}: a household of the town left`,
    ).toBeGreaterThan(0);
    // Five months of a year's ACS rate (about 4 percent of the people in a year) is the order of what left.
    expect(movers, `${t.where}: ${movers} of ${t.people} left`).toBeLessThan(
      t.people * 0.1,
    );
    proof = `${t.where}: ${t.groups} groups of ${Math.round(t.people)} people the lookup does not know; ${t.out.length} households (${movers} people) left in 150 days, e.g. ${t.out[0]!.id}`;
  }
  expect(
    proof,
    `none of ${DRAWS} drawn places (seed ${seed}) had counted groups the place lookup does not know`,
  ).toBeDefined();
  console.log(`MOVES ${proof}`);
}, 3_600_000);
