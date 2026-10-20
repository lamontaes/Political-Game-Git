/**
 * Ten days in a state office, in the world the owner plays: the bench world,
 * a place and seed nobody chose, every module installed. The player takes
 * the state's sitting representative or senator for ten days, then the
 * governor for ten. Each day's stops and acts are listed with the records
 * they wrote, and the engines decide what the player leaves.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { townSeats } from "./modules/offices";
import { deskWaiting, leaveDeskToCharacter } from "./modules/office-day";
import { heldFederal, releaseFederal } from "./office-day-federal";
import {
  actOn,
  resultsOf,
  startStateDay,
  stateDay,
  stateOfficeOf,
  waitingEntries,
} from "./office-day-state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.OFFICE_STATE_SEED || randomBytes(8).toString("hex");
// Some territorial office data has no sitting state seat to play: draw on,
// up to six places, until one has both a sitting governor and a sitting
// representative or senator, and fail if none does.
function drawWorld() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(
      seed,
      attempt ? `office-state-${attempt}` : "office-state",
    );
    console.log(`office-day-state: ${place.name} (${place.key}), seed ${seed}`);
    const world = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const seats = townSeats(api);
    const governor = seats.find((s) => s.office.kind === "governor")?.holder
      ?.personId;
    const member = seats.find((s) => s.office.kind.startsWith("legislature-"))
      ?.holder?.personId;
    if (governor && member) return { place, world, api, governor, member };
  }
  throw new Error(
    `seed ${seed}: no drawn place in six had both a sitting governor and a sitting legislator`,
  );
}
const { place, world, api, governor, member } = drawWorld();
const core = world.core;
const player = new BenchPlayer(core, world.director);

/** Play day by day through `date`, doing what the stops hold as the character would. */
function playThrough(date: string, personId: string) {
  player.select(personId);
  startStateDay(api);
  for (let guard = 0; guard < 5_000; guard++) {
    if (player.pollingPlace) player.leavePolls();
    const packet = player.packet;
    if (packet?.kind === "stop") {
      for (const entry of waitingEntries(api, personId))
        if (entry.stop && entry.date <= addDays(makeIsoDate(core.date), 1))
          actOn(api, entry);
      for (const key of heldFederal(api)) releaseFederal(api, key);
      for (const bill of deskWaiting(api)) leaveDeskToCharacter(api, bill.id);
      player.resume({ kind: "stop", pauseId: packet.pauseId });
    } else if (packet?.kind === "choice")
      player.resume({ kind: "own-choice", pauseId: packet.pauseId });
    else if (core.date >= date) return;
    else player.advance("day");
  }
  throw new Error(`The day did not reach ${date}`);
}

/** One line per day: its entries and acts with the records they wrote. */
function transcript(personId: string, from: string, to: string): string[] {
  const lines: string[] = [];
  for (const r of resultsOf(api, personId))
    if (r.date >= from && r.date <= to)
      lines.push(
        `${r.date} ${r.kind} (${r.stop ?? "no stop"}) by ${r.by}: ${r.choice.kind}; ${r.recordIds.length} records${r.recordIds[0] ? `, first ${r.recordIds[0]}` : ""}`,
      );
  return lines.sort();
}

describe(`ten days in a state office (${place.name}, seed ${seed})`, () => {
  for (const [role, who] of [
    ["representative or senator", member],
    ["governor", governor],
  ] as const) {
    it(`plays ten days as the state's ${role}`, () => {
      // The governor's days that carry the address and the budget are the
      // ones worth ten days; start the evening before the first of them.
      let from = core.date;
      if (role === "governor") {
        const office = stateOfficeOf(api, who)!;
        for (let n = 0; n < 450; n++) {
          const day = addDays(makeIsoDate(core.date), n);
          if (
            stateDay(api, office, day).some(
              (e) =>
                e.kind === "state-of-the-state" || e.kind === "budget-proposal",
            )
          ) {
            from = addDays(makeIsoDate(day), -1);
            break;
          }
        }
        playThrough(from, who);
      }
      const to = addDays(makeIsoDate(from), 10);
      const started = performance.now();
      playThrough(to, who);
      const seconds = (performance.now() - started) / 1000;
      const lines = transcript(who, from, to);
      console.log(
        `${role}: ${lines.length} lines in ${seconds.toFixed(1)} s\n${lines.join("\n")}`,
      );
      expect(core.date >= to).toBe(true);
      // The office day wrote something: an entry done or an act kept.
      expect(lines.length).toBeGreaterThan(0);
      // The timeout stays long on purpose: the governor's run first plays day by
      // day, as the character, up to 450 days to the address or the budget, and
      // a dense state can take many minutes on a shared machine.
    }, 1_800_000);
  }
});
