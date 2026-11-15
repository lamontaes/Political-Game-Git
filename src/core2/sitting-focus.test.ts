/**
 * Colleagues the player sits with are people the player sees (pool:
 * legislature-colleague-ties-stay-slight, the focus gap found Nov 15). A
 * person in the player's circle chooses daily while the two were together
 * within `focusDailyContactDays` (calendar.ts `hasDailyFocus`). Once
 * committees, caucuses and the floor became rooms whose time the sitting
 * reader keeps, the player's meetings stopped writing tie rows, and the
 * circle and "seen lately" read only rows: 26 of the 30 colleagues, who are
 * tier `calendar`, fell out of it and chose nothing between calendar dates
 * (3 senators acted in Feb 1 to 7, against 28 before the rooms change). Now
 * both read the sitting reader too (closeness.ts `knownThroughRecords` and
 * `lastTogether`).
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason), the senate's sixteenth
 * member by id as the player; the first played week of February 2025.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { knownThroughRecords, lastTogether } from "./closeness";
import { gameStartDate } from "./game-start";
import { addDays, daysBetweenText, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { bodyOf, memberKey, members } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI, fillInPerson } from "./state";
import type { PersonId } from "./types";

it("colleagues the player sat with lately choose daily", () => {
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
  const player = ids[15]! as PersonId;
  core.playerId = player;
  advanceCore(core, makeIsoDate("2025-01-31"));
  // The colleagues the sitting reader says the player knows and sat with in
  // the last month, as of the week's first day.
  const known = knownThroughRecords(core, player);
  const seen = ids.filter((id) => {
    if (id === player || !known.has(id as PersonId)) return false;
    const last = lastTogether(core, player, id as PersonId);
    return !!last && daysBetweenText(last, core.date) <= 30;
  });
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
  expect(seen.length).toBeGreaterThanOrEqual(20);
  expect(seen.filter((id) => !acted.has(id))).toEqual([]);
}, 120_000);
