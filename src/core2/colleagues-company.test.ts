/**
 * Colleagues keep company with the colleagues they know, not only the player
 * (pool: people-colleagues-company-all-goes-to-the-player). Members of a body
 * know each other through its sittings, which leave no tie row; the player's
 * own office day writes rows. When a member's time with someone they know
 * offered only people with a row, every senator's went to the player (177
 * acts in two weeks at seat 001 and 197 at seat 016, none to any other
 * senator, Nov 15). Now the colleagues a record says one knows are offered
 * too (closeness.ts `knownPeople`), pulled by the time their tie has lost
 * since the two last sat together; among colleagues whose pulls are alike,
 * each member's nearest in the sitting's own order stands for the rest, so
 * no class piles onto its lowest id either (132 of 200 to seat 002 before).
 *
 * Re-pinned when sittings became rooms with attendance (pool:
 * legislature-colleague-ties-stay-slight). The earlier premise was at least
 * 10 colleagues taking some (173 acts with D1, 185 once lost hours ran from
 * the last sitting). That held only while colleagues' ties faded between
 * floor days and the player's own caucus and committee rows drew company.
 * Now every member's committees, caucuses and the rest of a session day
 * renew those ties, and `tiePull` reads hours lost since the two were last
 * together, so few of the counted acts go to fellow senators (9 in these
 * two weeks). They still spread out: the player 1, seven colleagues the rest.
 * What stays pinned is that the player is not favored and no colleague
 * takes the share the player used to.
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason), the senate's
 * sixteenth member by id as the player; two played weeks of February 2025.
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

it("senators keep company with the colleagues they sit with, not all with the player", () => {
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
  const player = ids[15]!;
  core.playerId = player as PersonId;
  const senators = new Set(ids);

  advanceCore(core, makeIsoDate("2025-01-31"));
  // Each day's company a senator chose to keep with another senator, read
  // from the tie it last changed that day. A tie keeps its latest change only
  // when it touches the player, someone the player has dealt with or a
  // controlled person (state.ts, `retainRelationshipEvidence`), so this
  // counts every act to the player and only those other acts that touch the
  // player's circle. Every count below is of those kept acts, not of all
  // acts; that is conservative for what is asserted, since the player's real
  // share is lower than the kept share.
  const to = new Map<string, number>();
  let day = makeIsoDate("2025-02-01");
  for (let i = 0; i < 14; i++, day = addDays(day, 1)) {
    advanceCore(core, day);
    for (const row of core.relationships.values()) {
      const change = row.latestChange;
      if (change?.date !== day || change.actionId !== "contact-known-person")
        continue;
      if (!senators.has(change.actorId) || !senators.has(change.otherId))
        continue;
      to.set(change.otherId, (to.get(change.otherId) ?? 0) + 1);
    }
  }
  const total = [...to.values()].reduce((a, b) => a + b, 0);
  const others = [...to].filter(([id]) => id !== player).map(([, n]) => n);
  // Kept acts. Before: every one went to the player (197 of 197). With D1:
  // the player 57 of 173, and 13 colleagues 1 to 14 each. With lost hours
  // run from the last day together: the player 33 of 185, and 24
  // colleagues. With rooms and attendance (this head): 9 acts, the player 1,
  // seven colleagues the rest (seat 022 has 2).
  expect(total).toBeGreaterThan(0);
  expect(to.get(player) ?? 0).toBeLessThan(total / 2);
  expect(Math.max(...others)).toBeLessThanOrEqual(total / 4);
  expect(others.length).toBeGreaterThanOrEqual(7);
}, 90_000);
