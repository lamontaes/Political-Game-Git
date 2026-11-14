// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { OFFICE_DAY_MODULE_ID } from "../core2/modules/office-day";
import { coreAPI } from "../core2/state";

// Dev mode's advance and run-until take the clock from the played character and run the world
// on its own. A stop the character had not answered used to stay behind, and the character's
// clock then refused every Hour, Day and Week (Hampstead, Maryland, seed
// 39ec0fdc-2c02-4e33-a7b7-e193551af953, play-clock-refuses-to-cross-a-stop-nothing-shows).
// Pinned: Packanack Lake, New Jersey, world seed f6-dev-advance-1.
setBookkeeping(false);
const PLACE = "3455620";
const SEED = "f6-dev-advance-1";
const where = `place ${PLACE}, seed ${SEED}`;

function fixture() {
  // Built once, about thirty seconds.
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const player = new BenchPlayer(world.core, world.director);
  const dev = new DevMode(world.core, world.director, player, world.placeId);
  player.select(world.core.playerId);
  // The character's clock binds on its first advance.
  player.advance("day");
  const calendar = coreAPI(world.core).moduleCalendar(OFFICE_DAY_MODULE_ID);
  const stop = (recordId: string, daysOn: number, hold: boolean) =>
    calendar.registerStop({
      recordId,
      controlledPersonId: world.core.playerId,
      at: {
        date: addDays(makeIsoDate(world.core.date), daysOn),
        minuteOfDay: 600,
      },
      kind: "interrupt",
      reasonKey: "dev-advance-stops-test",
      source: {
        tag: "SOURCED",
        asOf: world.core.date,
        citation: "A test stop for dev mode's advance",
      },
      hold,
    });
  return { world, player, dev, stop };
}

// One world, three runs in order; the stop that holds the clock goes last, as it stays.
describe(`dev mode's advance and the character's stops (${where})`, () => {
  const f = fixture();
  const { world, player, dev, stop } = f;
  it("a run with no stops on the way returns only its dates and time", () => {
    const ran = dev.advance(addDays(makeIsoDate(world.core.date), 3));
    expect(Object.keys(ran).sort(), where).toEqual(["from", "ms", "to"]);
  });

  it("answers a stop it runs past, lists it, and leaves the character's clock free to move", () => {
    stop("test:stranded", 2, false);
    const ran = dev.advance(addDays(makeIsoDate(world.core.date), 10));
    expect(
      ran.passedStops?.map((row) => row.recordId),
      where,
    ).toEqual(["test:stranded"]);
    expect(ran.heldStops, where).toEqual([]);
    // The clock the character takes up again moves, as the Hour, Day and Week buttons do.
    expect(() => player.advance("day"), where).not.toThrow();
  });

  it("leaves a stop that holds the clock where it is, and says so", () => {
    stop("test:held", 2, true);
    const ran = dev.advance(addDays(makeIsoDate(world.core.date), 10));
    expect(ran.passedStops, where).toEqual([]);
    expect(
      ran.heldStops?.map((row) => row.recordId),
      where,
    ).toEqual(["test:held"]);
  });
}, 240_000);
