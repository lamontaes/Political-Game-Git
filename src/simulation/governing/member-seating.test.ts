import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { recordedTermFixture } from "../../../tests/fixtures/recorded-legislative-term";
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
import { addDays, daysBetween, makeIsoDate } from "../dates";
import { advanceWorld } from "../world";
import {
  enterLegislativeTermLate,
  LEGISLATIVE_TERM_ENTRY,
  legislativeTermForRelationship,
} from "../legislative-office-terms";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { workStatusAt } from "../life-queries";
import { lateTermEntryKey } from "../late-term-entry-events";
import {
  composeFutureTransitionHandlerRegistries,
  createFutureTransitionHandlerRegistry,
} from "../future-transitions";
import type { World } from "../types";
import { stateMemberSeatingEvidence } from "./member-seating";
import { seatedChamberForPack } from "./chamber-votes";

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
      for (const chamber of pack.chambers) {
        const projected = seatedChamberForPack(
          world,
          pack.packId,
          chamber.chamberKey,
          chamber.name,
        );
        expect(projected).not.toBeNull();
        for (const member of projected!.body.members) {
          expect(member.tenureStartedAt).toBe(opening.occurredAt);
          expect(member.seatingEventId).toBe(opening.id);
        }
        expect(
          seatedChamberForPack(
            loaded,
            pack.packId,
            chamber.chamberKey,
            chamber.name,
          ),
        ).toEqual(projected);
      }
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
  it("reads the actual late-entry event after an explicitly supplied blocked entry", () => {
    const fixture = recordedTermFixture();
    const work = fixture.world.history.workRelationships.find((row) =>
      legislativeTermForRelationship(fixture.world, row.id),
    )!;
    const term = legislativeTermForRelationship(fixture.world, work.id)!;
    const base = createCampaignElectionTransitionRegistry();
    const originalEntry = base.get(LEGISLATIVE_TERM_ENTRY)!;
    const handlers = composeFutureTransitionHandlerRegistries(
      createFutureTransitionHandlerRegistry([
        [
          LEGISLATIVE_TERM_ENTRY,
          (world, due) =>
            due.id === term.entry.id
              ? {
                  world,
                  status: "blocked",
                  reasonKey: "test:isolated-blocked-entry",
                  context:
                    "Supplied entry refusal isolates the existing late-entry writer; not a naturally refused qualification.",
                  outcomeEventId: null,
                }
              : originalEntry(world, due),
        ],
      ]),
      base,
    );
    const delayed = advanceWorld(
      fixture.world,
      daysBetween(fixture.world.currentDate, addDays(term.startsAt, 1)),
      handlers,
    );
    expect(workStatusAt(delayed, work.id)?.status).toBe("expected");
    const entered = enterLegislativeTermLate(delayed, work.id);
    expect(workStatusAt(entered, work.id)?.status).toBe("active");
    const holder = stateLegislators(entered, term.pack.packId).find(
      (row) => row.workRelationshipId === work.id,
    );
    expect(holder).toBeDefined();
    const event = entered.history.events.find(
      (row) => row.stableKey === lateTermEntryKey(work.id),
    )!;
    const evidence = stateMemberSeatingEvidence(
      entered,
      term.pack.packId,
      term.governing.id,
      holder!,
    );
    expect(evidence).toEqual({
      eventId: event.id,
      workRelationshipId: work.id,
      occurredAt: entered.currentDate,
      kind: "late-term-entry",
    });
    const missingEvent: World = {
      ...entered,
      history: {
        ...entered.history,
        events: entered.history.events.filter((row) => row.id !== event.id),
      },
    };
    expect(
      stateMemberSeatingEvidence(
        missingEvent,
        term.pack.packId,
        term.governing.id,
        holder!,
      ),
    ).toBeNull();
    const wrongContest: World = {
      ...entered,
      history: {
        ...entered.history,
        events: entered.history.events.map((row) =>
          row.id === event.id
            ? {
                ...row,
                involvedEntityIds: row.involvedEntityIds.filter(
                  (id) => id !== term.contest.id,
                ),
              }
            : row,
        ),
      },
    };
    expect(
      stateMemberSeatingEvidence(
        wrongContest,
        term.pack.packId,
        term.governing.id,
        holder!,
      ),
    ).toBeNull();
    const loaded = deserializeWorld(serializeWorld(entered));
    const pack = legislativePackForJurisdiction(term.governing.id)!;
    const chamber = pack.chambers.find(
      (row) => `${pack.packId}:${row.chamberKey}` === holder!.officeKey,
    )!;
    // This recorded campaign fixture has a real elected term but no opening
    // roster. Its individual event does not fabricate a whole chamber.
    expect(
      seatedChamberForPack(
        loaded,
        pack.packId,
        chamber.chamberKey,
        chamber.name,
      ),
    ).toBeNull();
    expect(
      stateMemberSeatingEvidence(
        loaded,
        term.pack.packId,
        term.governing.id,
        holder!,
      ),
    ).toEqual(evidence);
    expect(enterLegislativeTermLate(loaded, work.id)).toBe(loaded);
    console.info(
      "A94 late seating",
      JSON.stringify({
        seed: fixture.world.seed,
        place: term.pack.jurisdictionKey,
        person: personName(entered.people[holder!.personId]!),
        workId: work.id,
        seatingEventId: event.id,
        scheduledTermStart: term.startsAt,
        seatedAt: event.occurredAt,
        suppliedBlockedEntry: true,
      }),
    );
  });
});
