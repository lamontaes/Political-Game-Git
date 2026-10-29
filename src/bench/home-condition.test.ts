import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { backdropFor, homeOf, roomCondition } from "./scene";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

// One dwelling, one condition (owner, Oct 28 sitting: a run-down living room
// beside a clean kitchen): every room of a household's home is shown in the
// same condition. Places are drawn from all 56 until one draws a household
// whose condition is not the painted one, at most PLACES of them, each named.
const PLACES = 4;
const HOURS = (scenePlaces.homeRoomByHour as { fromHour: number }[]).map(
  (row) => row.fromHour * 60 + 30,
);

it("shows every room of one home in one condition", () => {
  setBookkeeping(false);
  const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
  let checked = 0;
  for (let n = 0; n < PLACES; n += 1) {
    const place = drawPlace(`${base}-${n}`, "home-condition");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const playerId = world.playerId!;
    const where = `${place.name} (${place.key}), seed ${base}-${n}`;
    if (!roomCondition(world.core, playerId).length) continue;
    // Midday, when a condition is painted: the variant of every room the
    // person is in through the day.
    const variants = new Set(
      HOURS.map((minute) => homeOf(world.core, playerId, minute)).map(
        (room) => backdropFor(world.core, room, 12 * 60, playerId).variant,
      ),
    );
    const conditions = new Set(
      [...variants].filter((v) => ["rundown", "lived-in"].includes(v)),
    );
    expect(
      conditions.size,
      `${where}: ${[...variants].join(", ")}`,
    ).toBeLessThanOrEqual(1);
    checked += 1;
    console.log(`${where}: ${[...variants].join(", ")}`);
  }
  expect(
    checked,
    `no drawn household had a condition (${base})`,
  ).toBeGreaterThan(0);
}, 1_200_000);
