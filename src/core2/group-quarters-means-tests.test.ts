/**
 * A group-quarters room (a prison cell block, a nursing-home wing, a dormitory)
 * has no household income of its own: the poverty count leaves it out of the
 * Census poverty universe, and a means test never reads it as an eligible
 * household. Places are drawn from all 56 until the world holds counted rooms;
 * every place passed over is named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { reachOf } from "./counted-reach";
import { gameStartDate } from "./game-start";
import { residentsRuntime } from "./modules/residents";
import { householdPoverty } from "./world-poverty";
import type { CoreState } from "./types";

const seed = process.env.GQ_MEANS_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 20;
const WANT = 2;

it("a group-quarters room is no poor household and no means-tested household", () => {
  const passed: string[] = [];
  const proven: string[] = [];
  for (let draw = 0; draw < DRAWS && proven.length < WANT; draw += 1) {
    const place = drawPlace(seed, `gq-means:${draw}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core as CoreState;
    const rt = residentsRuntime(core)!;
    const rooms = [...rt.store.liveHouseholds()].filter((h) => h.quarters);
    if (!rooms.length) {
      passed.push(`${where}: no counted group-quarters room`);
      continue;
    }
    const ids = new Set(rooms.map((h) => h.id));
    const polled = householdPoverty(core).filter((row) => ids.has(row.id));
    expect(
      polled.map((row) => row.id),
      `${where}: rooms read as households in the poverty count`,
    ).toEqual([]);
    // A means test reaches nothing in a room: with a limit no household
    // exceeds, the counted reach is the ordinary households' members only.
    const placeIds = [...new Set(rooms.map((h) => h.placeId))];
    let roomMembers = 0;
    for (const h of rooms)
      roomMembers += rt.store.countedMembers(h).length * rt.store.weightOf(h);
    let reached = 0;
    let ordinary = 0;
    for (const placeId of placeIds) {
      reached += reachOf(core, placeId as never, {
        incomeBelowDollars: () => Number.MAX_SAFE_INTEGER,
      }).counted.people;
      reachOf(core, placeId as never, {});
      for (const h of rt.store.liveHouseholds())
        if (h.placeId === placeId && !h.quarters)
          ordinary += rt.store.countedMembers(h).length * rt.store.weightOf(h);
    }
    expect(
      reached,
      `${where}: a means test reached room members`,
    ).toBeLessThanOrEqual(ordinary + 1e-6);
    proven.push(
      `${where}: ${rooms.length} rooms with ${roomMembers} people, none in the poverty count; a means test reaches ${Math.round(reached)} of ${Math.round(ordinary)} ordinary counted people`,
    );
  }
  process.stdout.write(
    `GQ-MEANS (GQ_MEANS_SEED=${seed}) ${proven.join(" | ")}. Passed over: ${passed.join("; ") || "none"}\n`,
  );
  expect(proven.length, `proven nowhere: ${passed.join("; ")}`).toBe(WANT);
}, 1_800_000);
