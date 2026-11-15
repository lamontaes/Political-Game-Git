import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { sharedHoursBetween } from "./closeness";
import { coreAPI } from "./state";
import { townSeats } from "./modules/offices";
import { leaderOf } from "./modules/leadership";
import {
  authorityFor,
  billOf,
  castMemberVote,
  draftBill,
  holdEveryChamber,
  type Provision,
} from "./modules/legislature";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { relationFacts } from "../director/relation-facts";
import type { PersonId } from "./types";

// An executive and the body they answer to know each other from the time the
// work puts them in one room (world-legislating.ts executiveHours, rows in
// data/legislature/executive-sittings.json): a mayor sits with the council at
// every sitting, so knows every member on day one; a governor does not sit, so
// meets the chamber's leaders each floor week and the sponsor of each bill
// they sign, and no one else. Pinned places: a council town and a unicameral
// territory, so the test runs in about a minute.
const MAYOR_PLACE = drawPlace(
  "4276344481a2b078e70633cfee47d0caccb65f74:2",
  "desk-visit",
);
const GOVERNOR_PLACE = drawPlace("2d8f6b0a4c1e9573", "office-desk");

function world(place: { seed: string; key: string }) {
  return buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core;
}

describe("an executive knows the body they answer to", () => {
  it(`a mayor has met every council member on day one (${MAYOR_PLACE.name}, ${MAYOR_PLACE.key}, seed ${MAYOR_PLACE.seed})`, () => {
    const core = world(MAYOR_PLACE);
    const seats = townSeats(coreAPI(core));
    const mayor = seats.find((r) => r.office.kind === "mayor")?.holder
      ?.personId as PersonId;
    const council = seats
      .filter((r) => r.office.kind === "council" && r.holder?.personId)
      .map((r) => r.holder!.personId as PersonId)
      .filter((id) => id !== mayor);
    expect(mayor, "mayor").toBeTruthy();
    expect(council.length, "council").toBeGreaterThan(1);
    for (const member of council) {
      expect(sharedHoursBetween(core, mayor, member), member).toBeGreaterThan(
        0,
      );
      const facts = relationFacts(core, member, mayor);
      expect([facts.acquainted, facts.metBefore], member).toEqual([true, true]);
    }
  }, 120_000);

  it(`a governor meets the leaders, and a sponsor once they sign the sponsor's bill (${GOVERNOR_PLACE.name}, ${GOVERNOR_PLACE.key}, seed ${GOVERNOR_PLACE.seed})`, () => {
    const core = world(GOVERNOR_PLACE);
    const api = coreAPI(core);
    const seats = townSeats(api);
    const governor = seats.find((r) => r.office.kind === "governor")?.holder
      ?.personId as PersonId;
    const chamber = seats.filter(
      (r) => r.office.kind.startsWith("legislature-") && r.holder?.personId,
    );
    const body = chamber[0]!.office.id;
    const leaders = new Set(
      ["speaker", "president-pro-tempore", "majority-leader", "minority-leader"]
        .map((post) => leaderOf(api, body, post))
        .filter(Boolean) as string[],
    );
    expect(leaders.size, "leaders").toBeGreaterThan(0);
    for (const leader of leaders) {
      expect(
        sharedHoursBetween(core, governor, leader as PersonId),
        leader,
      ).toBeGreaterThan(0);
      expect(relationFacts(core, leader as PersonId, governor).metBefore).toBe(
        true,
      );
    }
    const sponsor = chamber
      .map((r) => r.holder!.personId as PersonId)
      .find((id) => !leaders.has(id) && id !== governor)!;
    expect(sharedHoursBetween(core, governor, sponsor), "before").toBe(0);
    expect(relationFacts(core, sponsor, governor).metBefore).toBe(false);
    let status = "";
    for (const question of PLATFORM_QUESTIONS) {
      const provision = {
        kind: "policy-question",
        question,
        value: 1,
      } as Provision;
      if (!authorityFor(api, provision).allowed) continue;
      const draft = draftBill(api, {
        bodyOfficeId: body,
        sponsorId: sponsor,
        provisions: [provision],
      });
      if (draft.status === "blocked") continue;
      for (const seat of chamber)
        castMemberVote(api, draft.id, seat.holder!.personId!, "yes");
      holdEveryChamber(api, draft.id);
      status = billOf(api, draft.id).status;
      break;
    }
    expect(status, "the bill reached the desk and was signed").toBe("enacted");
    expect(
      sharedHoursBetween(core, governor, sponsor),
      "after",
    ).toBeGreaterThan(0);
    expect(relationFacts(core, sponsor, governor).metBefore).toBe(true);
  }, 120_000);
});
