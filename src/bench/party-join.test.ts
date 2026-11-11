/**
 * Joining a party is an act with a place and a person
 * (play-join-a-party-has-no-scene-and-no-headquarters), in played worlds: the
 * player opens with no party (theirs to choose); joining writes a
 * `party-joined` record naming the party and, where the party has one, its
 * leader who signs them up; and Travel then lists the party's office with the
 * member reason, which it does not list before they join.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { setBookkeeping } from "../core2/bookkeeping";
import {
  joinParty,
  partiesHere,
  partyTie,
  PARTY_JOINED,
} from "../core2/modules/parties";
import { townPlaces } from "./places";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.PARTY_JOIN_SEED || randomBytes(8).toString("hex");
/** Places proved, and the most drawn to find them (a place may keep no party). */
const PLACES = 2;
const DRAWS = 6;

describe(`joining a party (seed ${seed})`, () => {
  it("opens with no party, writes the joining record and lists the office", () => {
    setBookkeeping(false);
    const proved: string[] = [];
    for (let at = 0; at < DRAWS && proved.length < PLACES; at += 1) {
      const place = drawPlace(at ? `${seed}:${at}` : seed, "party-join");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const playerId = core.playerId!;
      const party = partiesHere(api)[0];
      if (!party) continue;
      // Not registered by the opening.
      expect(partyTie(api, playerId)?.tie, where).toBe("no-party");
      const listed = () =>
        townPlaces(core, playerId).find(
          (p) => p.organizationId === party.organizationId,
        );
      expect(
        listed(),
        `${where}: the office is not listed before joining`,
      ).toBeUndefined();
      joinParty(api, playerId, party.id);
      const record = [...core.durableLog.values()].find(
        (row) =>
          row.kind === PARTY_JOINED &&
          row.personIds[0] === playerId &&
          row.facts?.partyId === party.id,
      );
      expect(record, `${where}: the joining record`).toBeTruthy();
      if (party.leaderId && core.people.has(party.leaderId))
        expect(record!.personIds, where).toContain(party.leaderId);
      const office = listed();
      expect(
        office,
        `${where}: the office is listed for a member`,
      ).toBeTruthy();
      expect(
        office!.reasons.some((r) => r.kind === "member"),
        `${where}: with the member reason`,
      ).toBe(true);
      console.log(
        `party-join: ${where}: ${record!.id}, leader ${party.leaderId ?? "none"}, office ${office!.name}`,
      );
      proved.push(where);
    }
    expect(proved.length, "places proved").toBe(PLACES);
  }, 1_800_000);
});
