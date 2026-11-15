/**
 * Watching never sets who chooses (pool: core-observer-changes-choices).
 * The debug observer used to make every full person choose every day
 * (calendar.ts `hasDailyFocus`), so a watched world was a different world:
 * at this place, Feb 1 to Mar 31, 2025, 10,346 visits with the observer on
 * against 2,751 with it off, and the state senators, who are tier `calendar`
 * and choose only on calendar dates, visited a colleague daily only when
 * watched (Nov 15).
 *
 * What this pins is that route: the same people act with the observer on and
 * off. It does not pin every pick. A second route through the tie writer's
 * `fullTrace` (state.ts) still moves a few picks (2,747 visits against 2,751
 * over the same two months, the first on Feb 3), and the item stays open for
 * it.
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason), the senate's sixteenth
 * member by id as the player; the first played week of February 2025.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { bodyOf, memberKey, members } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI, fillInPerson } from "./state";
import type { PersonId } from "./types";

function sittingSenatorsWhoActed(observer: boolean): string[] {
  setBookkeeping(false);
  const { core } = buildBenchWorld("8647-mason", gameStartDate(), {
    twoLevel: true,
    placeKey: "4846968",
  });
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (r) =>
      r.office.level === "state" &&
      bodyOf(api, r.office.id) &&
      members(api, r.office.id).length >= 3 &&
      members(api, r.office.id).every((t) => t.personId),
  )!;
  const ids = members(api, seat.office.id).map(memberKey).sort();
  for (const id of ids) fillInPerson(core, id);
  core.playerId = ids[15] as PersonId;
  core.observer = observer;
  advanceCore(core, makeIsoDate("2025-01-31"));
  for (
    let day = makeIsoDate("2025-02-01");
    day <= "2025-02-07";
    day = addDays(day, 1)
  )
    advanceCore(core, day);
  const acted = new Set(
    [...core.actCounters.values()]
      .filter((row) => row.month === "2025-02")
      .map((row) => row.actorId as string),
  );
  return ids.filter((id) => acted.has(id));
}

it("the same senators act in a week with the observer on and off", () => {
  const unwatched = sittingSenatorsWhoActed(false);
  const watched = sittingSenatorsWhoActed(true);
  // Unwatched, only the player and the colleagues in the player's focus act
  // between calendar dates; before the fix, watched, nearly every senator did.
  expect(unwatched.length).toBeLessThan(10);
  expect(watched).toEqual(unwatched);
}, 120_000);
