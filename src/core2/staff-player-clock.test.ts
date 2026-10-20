/**
 * A council member the player controls lives through the staff engine's
 * reviews (pool item play-staff-hire-worked-today-stops-clock). The player's
 * clock runs a day's calendar work after the day's work, so a review must not
 * hire someone who has worked today: ending their old job then stopped the
 * game. In places drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { bodyOf } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("a controlled council member's clock runs 200 days through the staff reviews", () => {
  let ran = 0;
  for (let draw = 0; draw < 3; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "staff-player-clock");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const seat = townSeats(api).find(
      (s) =>
        s.holder?.personId &&
        (s.office.kind === "council" ||
          s.office.kind === "county-board" ||
          s.office.kind === "township-board") &&
        bodyOf(api, s.office.id),
    );
    if (!seat?.holder?.personId) continue;
    const player = new BenchPlayer(world.core, world.director);
    player.select(seat.holder.personId);
    const until = addDays(makeIsoDate(world.core.date), 200);
    for (let guard = 0; world.core.date < until && guard < 3000; guard += 1) {
      if (player.pollingPlace) player.leavePolls();
      const packet =
        player.packet?.kind === "stop"
          ? player.packet
          : player.advance(
              "calendar",
              addDays(
                makeIsoDate(player.packet?.at.date ?? world.core.date),
                7,
              ),
            ).packet;
      if (packet.kind === "stop")
        player.resume({ kind: "stop", pauseId: packet.pauseId });
    }
    expect(
      world.core.date >= until,
      `${where}: the clock reached ${until}`,
    ).toBe(true);
    ran += 1;
  }
  expect(ran, "a place with a council member").toBeGreaterThan(0);
}, 3_600_000);
