import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import {
  stateLegislators,
  STATE_LEGISLATURE_KEYS,
} from "../nationwide-world/state-legislature-opening";
import { deserializeWorld, serializeWorld } from "../serialization";
import { SeededRng } from "../rng";
import { personName } from "../people";
import { makeIsoDate } from "../dates";
import type { World } from "../types";
import { stateMemberSeatingEvidence } from "./member-seating";

const seed = "A94-recorded-service-seniority";
const pool = [...lifePlaceStateIdentities()];
const rng = new SeededRng(seed);
const places = Array.from(
  { length: 5 },
  () => pool.splice(rng.integer(0, pool.length), 1)[0]!,
);

describe("A94 tenure reads an actual seating event", () => {
  for (const place of places) {
    const jurisdiction = stateJurisdictionForKey(place.jurisdictionKey);
    const ownPack =
      jurisdiction && legislativePackForJurisdiction(jurisdiction.id);
    if (!ownPack) {
      it.todo(
        `seats actual members in ${place.jurisdictionKey}: no admitted own pack`,
      );
      continue;
    }
    it(`keeps actual seating evidence in ${place.jurisdictionKey}`, () => {
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        seed,
        offices: ["state-legislature"],
      });
      const world = fixture.world;
      const pack = legislativePackForJurisdiction(fixture.stateJurisdictionId);
      if (!pack) throw Error("The previously admitted own pack disappeared.");
      const packId = `${pack.packId}:candidacy`;
      const members = stateLegislators(world, packId);
      expect(members.length).toBeGreaterThan(0);
      const opening = world.history.events.find(
        (event) => event.stableKey === STATE_LEGISLATURE_KEYS.opening(packId),
      )!;
      expect(opening).toBeDefined();
      const loaded = deserializeWorld(serializeWorld(world));
      for (const member of members) {
        const evidence = stateMemberSeatingEvidence(
          world,
          packId,
          fixture.stateJurisdictionId,
          member,
        );
        expect(evidence).toEqual({
          eventId: opening.id,
          workRelationshipId: member.workRelationshipId,
          occurredAt: opening.occurredAt,
          kind: "opening-seating",
        });
        expect(
          stateMemberSeatingEvidence(
            world,
            packId,
            fixture.stateJurisdictionId,
            member,
          ),
        ).toEqual(evidence);
        expect(
          stateMemberSeatingEvidence(
            loaded,
            packId,
            fixture.stateJurisdictionId,
            member,
          ),
        ).toEqual(evidence);
      }
      const member = members[0]!;
      const work = world.history.workRelationships.find(
        (row) => row.id === member.workRelationshipId,
      )!;
      // Generated past service does not backdate the actual batch seating.
      expect(work.startedAt).not.toBe(opening.occurredAt);
      console.info(
        "A94 seating",
        JSON.stringify({
          seed,
          place: place.jurisdictionKey,
          person: personName(world.people[member.personId]!),
          workId: work.id,
          generatedServiceStart: work.startedAt,
          seatingEventId: opening.id,
          seatedAt: opening.occurredAt,
          members: members.length,
        }),
      );

      const withoutEvent: World = {
        ...world,
        history: {
          ...world.history,
          events: world.history.events.filter(
            (event) => event.id !== opening.id,
          ),
        },
      };
      expect(
        stateMemberSeatingEvidence(
          withoutEvent,
          packId,
          fixture.stateJurisdictionId,
          member,
        ),
      ).toBeNull();
      for (const changedEvent of [
        { ...opening, recordedAt: makeIsoDate("2099-01-01") },
        { ...opening, sequence: work.sequence },
        { ...opening, involvedEntityIds: [] },
        { ...opening, type: "world.unrelated-event" as const },
      ]) {
        const invalid: World = {
          ...world,
          history: {
            ...world.history,
            events: world.history.events.map((event) =>
              event.id === opening.id ? changedEvent : event,
            ),
          },
        };
        expect(
          stateMemberSeatingEvidence(
            invalid,
            packId,
            fixture.stateJurisdictionId,
            member,
          ),
        ).toBeNull();
      }
      // A later-created relationship cannot inherit the original cohort's event.
      const laterWork: World = {
        ...world,
        history: {
          ...world.history,
          workRelationships: world.history.workRelationships.map((row) =>
            row.id === work.id
              ? { ...row, sequence: opening.sequence + 1 }
              : row,
          ),
        },
      };
      expect(
        stateMemberSeatingEvidence(
          laterWork,
          packId,
          fixture.stateJurisdictionId,
          member,
        ),
      ).toBeNull();
      expect(
        stateMemberSeatingEvidence(world, packId, fixture.stateJurisdictionId, {
          ...member,
          ordinal: member.ordinal + 1,
        }),
      ).toBeNull();
    });
  }
  it.todo(
    "reads a later elected member after its ordinary seating event producer exists",
  );
  it.todo(
    "proves individual late-entry seating through the actual late-entry writer",
  );
});
