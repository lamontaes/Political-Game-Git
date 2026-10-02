import { describe, expect, it } from "vitest";
import { smallWorld } from "../fixtures/small-world";
import { drawRandomPlace } from "../support/random-place";
import {
  CIVIC_ACTION_EVENTS,
  reviewTownCivicActions,
} from "../../src/simulation/living-world/civic-actions";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import { advanceWorld } from "../../src/simulation/world";
import { composeWorldTimeHandlers } from "../../src/simulation/campaigns";
import { daysBetween } from "../../src/simulation/dates";
import { ensureLocalGovernmentSeats } from "../../src/simulation/living-world/local-government-seats";
import {
  ensureLocalCouncilMeetings,
  LOCAL_COUNCIL_MEETING,
} from "../../src/simulation/living-world/local-council-meetings";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";

const seed = "a157-no-scheduled-meeting";
const place = drawRandomPlace(seed);

describe(`civic attendance source (${place.displayName}, seed ${seed})`, () => {
  it("records no attendance when no meeting is scheduled or held", () => {
    const fixture = smallWorld({ place: place.key, seed, people: 8 });
    let world = fixture.world;
    const before = world.history.events.filter(
      (row) => row.type === CIVIC_ACTION_EVENTS.attended,
    );
    world = withWorldIntegrityDeferred(() => {
      let next = world;
      for (let quarter = 1; quarter <= 4; quarter++) {
        const date = addDays(fixture.world.currentDate, quarter * 91);
        next = {
          ...next,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(next.currentMoment, date),
        };
        next = reviewTownCivicActions(
          next,
          fixture.jurisdictionId,
          fixture.personId,
          `a157-source:${quarter}`,
        );
      }
      return next;
    });
    expect(
      world.history.events.filter(
        (row) => row.type === CIVIC_ACTION_EVENTS.attended,
      ),
    ).toEqual(before);
  });

  it("no attendance is written for a scheduled meeting before its producer has held it", () => {
    const fixture = smallWorld({ place: place.key, seed, people: 8 });
    const seated = ensureLocalGovernmentSeats(fixture.world, fixture.personId);
    const scheduled = ensureLocalCouncilMeetings(seated, fixture.personId);
    const due = scheduled.history.futureDueItems.find(
      (row) =>
        row.transitionKey === LOCAL_COUNCIL_MEETING &&
        row.jurisdictionId === fixture.jurisdictionId,
    );
    expect(due).toBeDefined();
    // Isolated reader cutoff, not a claim that the clock ran or council met.
    const dated = { ...scheduled, currentDate: due!.dueAt };
    const reviewed = withWorldIntegrityDeferred(() =>
      reviewTownCivicActions(
        dated,
        fixture.jurisdictionId,
        fixture.personId,
        "a157-unheld",
      ),
    );
    expect(
      reviewed.history.events.some(
        (row) => row.type === CIVIC_ACTION_EVENTS.attended,
      ),
    ).toBe(false);
  });

  it("attendance names a meeting the real producer held and stays unique after Continue", () => {
    const fixture = smallWorld({
      place: place.key,
      seed: `${seed}:held`,
      people: 8,
    });
    let world = ensureLocalCouncilMeetings(
      ensureLocalGovernmentSeats(fixture.world, fixture.personId),
      fixture.personId,
    );
    let provedAttendance = false;
    // Bounded actual meetings, not fabricated due items or held events.
    for (
      let meetingNumber = 0;
      meetingNumber < 26 && !provedAttendance;
      meetingNumber++
    ) {
      const due = world.history.futureDueItems
        .filter(
          (row) =>
            row.transitionKey === LOCAL_COUNCIL_MEETING &&
            row.jurisdictionId === fixture.jurisdictionId &&
            row.dueAt > world.currentDate,
        )
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
      expect(due).toBeDefined();
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, due!.dueAt),
        composeWorldTimeHandlers(),
      );
      const held = world.history.events.find(
        (row) =>
          row.stableKey === `${due!.stableKey}:held` &&
          row.type === "local.council-meeting-held" &&
          row.occurredAt === due!.dueAt,
      );
      const reviewed = reviewTownCivicActions(
        world,
        fixture.jurisdictionId,
        fixture.personId,
        `a157-held:${meetingNumber}`,
      );
      const attendance = reviewed.history.events.filter(
        (row) =>
          row.type === CIVIC_ACTION_EVENTS.attended &&
          row.occurredAt === due!.dueAt,
      );
      if (!held) {
        expect(attendance).toEqual([]); // preserve an actual cancellation
        world = reviewed;
        continue;
      }
      for (const event of attendance) {
        expect(event.involvedEntityIds).toContain(due!.id);
        expect(event.tags).toContain(`held-event:${held.id}`);
        expect(event.tags).toContain(`meeting:${due!.id}`);
      }
      const again = reviewTownCivicActions(
        reviewed,
        fixture.jurisdictionId,
        fixture.personId,
        `a157-repeat:${meetingNumber}`,
      );
      expect(
        again.history.events.filter(
          (row) => row.type === CIVIC_ACTION_EVENTS.attended,
        ),
      ).toEqual(
        reviewed.history.events.filter(
          (row) => row.type === CIVIC_ACTION_EVENTS.attended,
        ),
      );
      const restored = deserializeWorld(serializeWorld(again));
      const continued = reviewTownCivicActions(
        restored,
        fixture.jurisdictionId,
        fixture.personId,
        `a157-continue:${meetingNumber}`,
      );
      expect(
        continued.history.events.filter(
          (row) => row.type === CIVIC_ACTION_EVENTS.attended,
        ),
      ).toEqual(
        again.history.events.filter(
          (row) => row.type === CIVIC_ACTION_EVENTS.attended,
        ),
      );
      provedAttendance = attendance.length > 0;
      world = continued;
    }
    expect(
      provedAttendance,
      "real meeting plus resident attendance must both occur; no empty proof",
    ).toBe(true);
  });
  it.todo(
    "annual attendance-rate checks run through actual local meeting dates, retaining contact/age/player assertions",
  );
});
