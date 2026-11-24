import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { sharedHoursBetween } from "./closeness";
import { coreAPI } from "./state";
import { townSeats } from "./modules/offices";
import { relationFacts } from "../director/relation-facts";
import type { PersonId } from "./types";

// An executive and the body they answer to know each other from the time the
// work puts them in one room (world-legislating.ts SITTING_CALENDAR, rows in
// data/legislature/executive-sittings.json): a mayor sits with the council at
// every sitting, so knows every member on day one; a governor does not sit, so
// shares no sitting with the legislature (their meetings with its leaders and
// a signing with a sponsor are events not built yet: pool item
// government-executive-leaders-meeting-as-sitting and scene-signing-casts-who-it-reaches). Pinned places: a council town and a unicameral
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

  it(`a governor does not sit with the legislature, so shares no sitting with its members (${GOVERNOR_PLACE.name}, ${GOVERNOR_PLACE.key}, seed ${GOVERNOR_PLACE.seed})`, () => {
    const core = world(GOVERNOR_PLACE);
    const seats = townSeats(coreAPI(core));
    const governor = seats.find((r) => r.office.kind === "governor")?.holder
      ?.personId as PersonId;
    const members = seats
      .filter(
        (r) => r.office.kind.startsWith("legislature-") && r.holder?.personId,
      )
      .map((r) => r.holder!.personId as PersonId);
    expect(governor, "governor").toBeTruthy();
    expect(members.length, "members").toBeGreaterThan(1);
    for (const member of members)
      expect(sharedHoursBetween(core, governor, member), member).toBe(0);
  }, 120_000);
});
