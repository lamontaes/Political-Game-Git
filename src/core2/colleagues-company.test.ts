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
 * together, so few free hours go to fellow senators at all (9 in these two
 * weeks). They still spread out: the player 1, seven colleagues the rest.
 * What stayed pinned was that the player is not favored and no colleague
 * takes the share the player used to.
 *
 * Re-pinned when the colleagues the player sits with came back into the
 * player's circle and choose daily again (they had fallen out of it with
 * rooms, and 27 of them did nothing between calendar dates). The counts
 * before came from the evidence a tie keeps, which only acts touching the
 * player's circle keep (state.ts `retainRelationshipEvidence`); they are now
 * read from every visit's change notice. In these two weeks the senators make
 * 181 visits to colleagues, 23 senators visiting and 26 colleagues visited,
 * none to the player: the player's pull is mid-table for every colleague,
 * and the chooser takes the hardest pull (pool:
 * people-free-company-goes-to-one-tie). That item also holds why one
 * colleague, 022, draws 46 of the 181; the cap on any one colleague's share
 * comes back with its fix.
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason), the senate's
 * sixteenth member by id as the player; two played weeks of February 2025.
 */
import { expect, it } from "vitest";
import { ENCOUNTERS } from "./encounters";
import { subscribeRelationshipChanges } from "./module-notifications";
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

  // Every visit a senator pays a fellow senator, from the tie writer's change
  // notice (cause: a visit), whether or not the tie keeps its evidence.
  const to = new Map<string, number>();
  const by = new Set<string>();
  subscribeRelationshipChanges(core, "colleagues-company", ["*"], (_api, n) => {
    if (n.date < "2025-02-01" || n.date > "2025-02-14") return;
    if (n.reason?.cause !== ENCOUNTERS.causes.visit) return;
    if (!senators.has(n.actorId) || !senators.has(n.otherId)) return;
    to.set(n.otherId, (to.get(n.otherId) ?? 0) + 1);
    by.add(n.actorId);
  });
  advanceCore(core, makeIsoDate("2025-01-31"));
  let day = makeIsoDate("2025-02-01");
  for (let i = 0; i < 14; i++, day = addDays(day, 1)) advanceCore(core, day);
  const others = [...to].filter(([id]) => id !== player);
  // Most senators keep company with a colleague (3 of 31 before the circle
  // read the sitting reader), and it spreads over at least seven of them.
  expect(by.size).toBeGreaterThan(senators.size / 2);
  expect(others.length).toBeGreaterThanOrEqual(7);
}, 70_000);
