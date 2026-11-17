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
  const peopleIn = (inGroup: (id: string) => boolean) =>
    [...store.liveHouseholds()]
      .filter((h) => inGroup(store.groups[h.group]!.id))
      .reduce((n, h) => n + store.weightedCount(h), 0);
  const people = peopleIn((id) => unknown.has(id));
  const others = peopleIn((id) => !unknown.has(id));
  advanceCore(core, addDays(makeIsoDate(core.date), 150));
  const moves = countedMoves(coreAPI(core)).filter(
    (row) => row.direction === "out",
  );
  const out = moves.filter((row) => unknown.has(row.groupId));
  const othersOut = moves
    .filter((row) => !unknown.has(row.groupId))
    .reduce((n, row) => n + row.people, 0);
  return { where, groups: unknown.size, people, out, others, othersOut };
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
    // They leave by the same rule as the rest of the town's counted people,
    // so their share who left is the same order as everyone else's in the
    // same months: a comparison inside the world, never a published rate
    // (owner, Nov 17: "Everything comes from the simulation").
    const share = movers / t.people;
    const othersShare = t.othersOut / Math.max(1, t.others);
    const line = `${t.where}: ${movers} of ${Math.round(t.people)} left (${(100 * share).toFixed(2)}%), the rest of the town ${Math.round(t.othersOut)} of ${Math.round(t.others)} (${(100 * othersShare).toFixed(2)}%)`;
    expect(othersShare, line).toBeGreaterThan(0);
    expect(share / othersShare, line).toBeGreaterThan(1 / 3);
    expect(share / othersShare, line).toBeLessThan(3);
    proof = `${line}; ${t.groups} groups the lookup does not know; ${t.out.length} households left in 150 days, e.g. ${t.out[0]!.id}`;
  }
  expect(
    proof,
    `none of ${DRAWS} drawn places (seed ${seed}) had counted groups the place lookup does not know`,
  ).toBeDefined();
  process.stdout.write(`MOVES ${proof}\n`);
}, 3_600_000);
