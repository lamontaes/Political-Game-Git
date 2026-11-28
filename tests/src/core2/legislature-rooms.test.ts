/**
 * A chamber's committees and party caucuses are rooms of the one sitting
 * reader (pool: legislature-colleague-ties-stay-slight). A committee seats its
 * roster as leadership seated it and sits on the place's committee days; a
 * caucus seats one party's members and sits on its caucus day. Nothing is
 * written for a meeting: the player reads the same reader as every other
 * member, less the days their own office day says they stayed away.
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason): the player is the
 * senate's sixteenth member by id (seat 016, a Democrat on Finance, Health,
 * Labor and Commerce, and Transportation), the seat the lying thread's played
 * files use. Pinned by rooms/find.mts on the scratch branch: Wednesday Jan 29
 * 2025 is a floor day with committees and no caucus; Tuesday Jan 28 has the
 * caucus. The two colleagues are found in the world, not named by seat: one
 * of the other party who sits on Finance and Health with the player, and one
 * of the player's own party who sits on Finance (the world's history decides
 * which seat holds which party, so a seat number is not a party). The player
 * stays away from Finance on Jan 29 through the office day's own `doEntry`,
 * the call the player's press makes; the party colleague attends as every
 * character does.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { halfLifeDays } from "../../../src/core2/closeness";
import { sittingHoursByBody } from "../../../src/core2/sitting-closeness";
import { knownAmong } from "../../../src/core2/encounters";
import { gameStartDate } from "../../../src/core2/game-start";
import { makeIsoDate } from "../../../src/core2/kernel/dates";
import { pairKey } from "../../../src/core2/kernel/ids";
import { advanceCore } from "../../../src/core2/life";
import {
  bodyOf,
  memberKey,
  members,
} from "../../../src/core2/modules/legislature";
import { seatedCommittees } from "../../../src/core2/modules/leadership";
import { townSeats } from "../../../src/core2/modules/offices";
import {
  doEntry,
  stateDayParameter,
  stateOfficeOf,
} from "../../../src/core2/office-day-state";
import { coreAPI, fillInPerson } from "../../../src/core2/state";
import type { CoreState, PersonId } from "../../../src/core2/types";

const roomHours = (core: CoreState, a: string, b: string, body: string) =>
  sittingHoursByBody(core, a as PersonId, b as PersonId).find(
    (r) => r.bodyId === body,
  )?.hours ?? 0;

it("committees and caucuses are rooms of the sitting reader, and a day the player stays away is a day they did not sit", () => {
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
  const chamber = seat.office.id;
  const ids = members(api, chamber).map(memberKey).sort();
  for (const id of ids) fillInPerson(core, id);
  const player = ids[15]!;
  core.playerId = player as PersonId;
  const office = stateOfficeOf(api, player)!;
  expect(office.officeId).toBe(chamber);
  expect(player.split(":")[5]).toBe("016");
  const finance = `${chamber}:committee:finance`;
  const health = `${chamber}:committee:health`;
  const caucus = `${chamber}:caucus:${office.party}`;

  advanceCore(core, makeIsoDate("2025-01-27"));
  const roster = seatedCommittees(api, chamber).find(
    (c) => c.committee === "finance",
  )!.memberIds;
  const healthRoster = seatedCommittees(api, chamber).find(
    (c) => c.committee === "health",
  )!.memberIds;
  const partyOf = new Map(
    members(api, chamber).map((t) => [memberKey(t), t.party] as const),
  );
  // The colleagues, found in the world: someone of the other party on Finance
  // and Health with the player, and someone of the player's party on Finance.
  const other = ids.find(
    (id) =>
      id !== player &&
      roster.includes(id) &&
      healthRoster.includes(id) &&
      partyOf.get(id) !== office.party,
  )!;
  const party = ids.find(
    (id) =>
      id !== player && roster.includes(id) && partyOf.get(id) === office.party,
  )!;
  expect(other, "no other-party member on Finance and Health").toBeDefined();
  expect(party, "no party colleague on Finance").toBeDefined();
  for (const id of [player, other, party]) expect(roster).toContain(id);
  const fade = Math.pow(
    2,
    -1 / halfLifeDays((k) => api.parameter(k), "coworker"),
  );
  const perDay = (room: number) =>
    (stateDayParameter("meetingHours") * api.parameter("sittingContactShare")) /
    Math.max(1, knownAmong(api, room - 1));
  const caucusSize = members(api, chamber).filter(
    (t) => t.party === office.party,
  ).length;

  // Tuesday: the caucus sits; the player's party colleague gains a day of it.
  const caucusBefore = roomHours(core, player, party, caucus);
  advanceCore(core, makeIsoDate("2025-01-28"));
  expect(roomHours(core, player, party, caucus)).toBeCloseTo(
    caucusBefore * fade + perDay(caucusSize),
    9,
  );

  // Wednesday: the player stays away from Finance, keeps Health.
  const before = {
    playerFinance: roomHours(core, player, other, finance),
    partyFinance: roomHours(core, party, other, finance),
    playerHealth: roomHours(core, player, other, health),
  };
  expect(before.playerFinance).toBeGreaterThan(0);
  doEntry(api, `${player}:2025-01-29:committee:${chamber}:finance`, {
    kind: "attend",
    attend: false,
  });
  advanceCore(core, makeIsoDate("2025-01-29"));
  expect(roomHours(core, player, other, finance)).toBeCloseTo(
    before.playerFinance * fade,
    9,
  );
  expect(roomHours(core, party, other, finance)).toBeCloseTo(
    before.partyFinance * fade + perDay(roster.length),
    9,
  );
  const healthSize = seatedCommittees(api, chamber).find(
    (c) => c.committee === "health",
  )!.memberIds.length;
  expect(roomHours(core, player, other, health)).toBeCloseTo(
    before.playerHealth * fade + perDay(healthSize),
    9,
  );
  // No meeting wrote the player a tie of its own.
  const change = core.relationships.get(pairKey(player, other))?.latestChange;
  expect((change?.reason as { cause?: string } | undefined)?.cause).not.toBe(
    "office-day-state.meeting",
  );
}, 55_000);
