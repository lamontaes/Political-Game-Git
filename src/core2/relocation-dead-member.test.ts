/**
 * A household with a member who died moves whole under its own id, and a
 * played year runs to its end (pool: core-relocation-job-held-intermittent).
 * The place and seed are the played year that once stopped on "A whole
 * household moves under its own id" (Dover, New Hampshire, PR 5149's
 * comments); a drawn place from all 56 runs beside it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const PINNED = {
  key: "3318820",
  seed: "ee04c2985f301a47",
  name: "Dover, New Hampshire",
};
const drawn = drawPlace(
  `${process.env.RELOCATION_SEED ?? randomBytes(8).toString("hex")}:0`,
  "relocation-dead-member",
);

for (const place of [PINNED, drawn]) {
  it(`runs a played year; households that moved with a dead member on the roll keep their id (${place.name}, ${place.key}, seed ${place.seed})`, () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // Where every household lives at the start.
    const before = new Map<string, string>();
    for (const household of core.households.values())
      before.set(household.id, household.placeId);
    const start = core.date;
    advanceCore(core, addDays(makeIsoDate(start), 366));
    expect(core.date > start, `${place.name} ${place.seed}`).toBe(true);
    // A household that moved and now holds a dead member beside a living one:
    // the move left no one behind under another id.
    const moved = [...core.households.values()].filter((household) => {
      if (
        !before.has(household.id) ||
        household.placeId === before.get(household.id)
      )
        return false;
      const members = household.memberIds.map((id) => core.people.get(id)!);
      return members.some((p) => !p.alive) && members.some((p) => p.alive);
    });
    console.log(
      `RELOCATION ${place.name} ${place.seed}: moved with a dead member on the roll: ${moved.map((h) => h.id).join(", ") || "none"}`,
    );
    for (const household of moved)
      for (const id of household.memberIds)
        expect(core.people.get(id)!.householdId, id).toBe(household.id);
  }, 3_000_000);
}
