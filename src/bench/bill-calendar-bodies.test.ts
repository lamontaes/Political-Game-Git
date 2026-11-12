import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
// The world first: the engine modules load in the order the game loads them.
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { stateFloorHolds } from "../core2/office-day-state";
import { BenchPlayer } from "./player";
import { calendarItems } from "./calendar";

// A place drawn from all 56 on a seed nobody chose (named in the output).
const seed =
  process.env.CALENDAR_BODIES_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

// The calendar names the day the player's own chamber next sits, at the state level too: the
// first day the legislature holds the member for a floor vote.
describe(`a state legislator's calendar names their chamber's next sitting (seed ${seed})`, () => {
  it("lists the lower house meeting on the day the member is held for a floor vote", () => {
    const tried: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "calendar-bodies");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const seat = townSeats(api).find(
        (s) => s.office.kind === "legislature-lower" && s.holder,
      );
      const rep = seat?.holder?.personId;
      if (!rep) {
        tried.push(`${draw.name}: no lower-house member`);
        continue;
      }
      // The first day runs: the sessions already sitting open on it (a world is built before its first day).
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      const named = calendarItems(core, rep)
        .filter(
          (item) =>
            item.kind === "meeting" && item.recordIds.includes(seat!.office.id),
        )
        .map((m) => m.date)[0];
      if (!named) {
        tried.push(`${draw.name}: no meeting on the calendar`);
        continue;
      }
      // No date is typed: the hold record says the day (stateFloorHolds, as bill-westway-floor
      // reads it) and the calendar must name that same day.
      const player = new BenchPlayer(core, world.director);
      player.select(rep);
      let heldOn: string | null = null;
      for (let guard = 0; guard < 150 && !heldOn; guard += 1) {
        if (player.pollingPlace) player.leavePolls();
        if (stateFloorHolds(api).length) {
          heldOn = core.date;
          break;
        }
        const packet = player.packet;
        if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      if (!heldOn) {
        tried.push(`${draw.name}: no floor day held the member`);
        continue;
      }
      expect(named, `${draw.name} (${draw.key}, seed ${draw.seed})`).toBe(
        heldOn,
      );
      console.log(
        `calendar: ${draw.name} (${draw.key}, seed ${draw.seed}) names ${named}, the day the member is held`,
      );
      return;
    }
    throw new Error(
      `no drawn place held a lower-house member on a floor day (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
