import process from "node:process";
import { LOCAL_COUNCIL_MEETING } from "../../src/simulation/living-world/local-council-meetings";
import {
  cancelFutureDueItem,
  scheduleFutureDueItem,
} from "../../src/simulation/future-transitions";
import { describe, expect, it } from "vitest";
import { passOrdinaryDays } from "../../src/presentation/ordinary-life";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";

import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import {
  addDays,
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  CIVIC_ACTION_EVENTS,
  CIVIC_ACTIONS_VERSION,
  reviewTownCivicActions,
} from "../../src/simulation/living-world/civic-actions";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { World } from "../../src/simulation";
import { drawRandomPlace } from "../support/random-place";

const SEED = "civic-actions";
const PLACE = drawRandomPlace(SEED);

describe(
  `residents contact officials and attend meetings in ${PLACE.displayName} (${PLACE.key}, seed ${SEED})`,
  { timeout: 300_000 },
  () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: PLACE.key,
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const personId = game.playerPersonId;
    const town = game.world.people[personId]!.homeJurisdictionId;
    let world: World = game.world;
    let events: World["history"]["events"] = [];
    const quarters: World[] = [];
    function observeYear(): void {
      if (quarters.length === 4) return;
      for (let round = 0; round < 4; round += 1) {
        const date = addDays(world.currentDate, 91);
        world = passOrdinaryDays(world, 91);
        expect(world.currentDate).toBe(date);
        quarters.push(world);
      }
      events = world.history.events.filter((event) =>
        event.stableKey.startsWith(`${CIVIC_ACTIONS_VERSION}:${town}:`),
      );
    }
    const adults = game.world.personOrder.filter(
      (id) =>
        id !== personId &&
        game.world.people[id]!.homeJurisdictionId === town &&
        ageOnDate(game.world.people[id]!.birthDate, game.world.currentDate) >=
          18,
    ).length;

    it("about 23 and 29 percent of adults act in a year, and never the player", () => {
      observeYear();
      const share = (type: string) =>
        new Set(
          events
            .filter((event) => event.type === type)
            .map(
              (event) =>
                event.participants.find((row) => row.role === "focus:subject")!
                  .personId,
            ),
        ).size / adults;
      expect(adults).toBeGreaterThan(40);
      expect(share(CIVIC_ACTION_EVENTS.contacted)).toBeGreaterThan(0.15);
      expect(share(CIVIC_ACTION_EVENTS.contacted)).toBeLessThan(0.31);
      expect(share(CIVIC_ACTION_EVENTS.attended)).toBeGreaterThan(0.2);
      expect(share(CIVIC_ACTION_EVENTS.attended)).toBeLessThan(0.38);
      expect(
        events.some((event) =>
          event.participants.some((row) => row.personId === personId),
        ),
      ).toBe(false);
    });

    it("residents with more years at stake act more often than young adults", () => {
      observeYear();
      const acted = new Set(
        events.map(
          (event) =>
            event.participants.find((row) => row.role === "focus:subject")!
              .personId,
        ),
      );
      const shareAged = (low: number, high: number) => {
        const group = game.world.personOrder.filter((id) => {
          const person = game.world.people[id]!;
          const age = ageOnDate(person.birthDate, game.world.currentDate);
          return (
            id !== personId &&
            person.homeJurisdictionId === town &&
            age >= low &&
            age < high
          );
        });
        return group.filter((id) => acted.has(id)).length / group.length;
      };
      expect(shareAged(50, 120)).toBeGreaterThan(shareAged(18, 30));
    });

    it("attendance names its saved meeting record from the real quarter calendar", () => {
      observeYear();
      const attendance = events.filter(
        (event) => event.type === CIVIC_ACTION_EVENTS.attended,
      );
      expect(attendance.length).toBeGreaterThan(0);
      for (const event of attendance) {
        const meeting = world.history.futureDueItems.find(
          (item) =>
            item.transitionKey === LOCAL_COUNCIL_MEETING &&
            item.jurisdictionId === town &&
            event.tags.includes(`meeting:${item.id}`),
        )!;
        expect(meeting).toBeDefined();
        expect(event.involvedEntityIds).toContain(meeting.id);
        const held = world.history.events.find(
          (entry) => entry.stableKey === `${meeting.stableKey}:held`,
        )!;
        expect(held).toBeDefined();
        expect(event.occurredAt).toBe(held.occurredAt);
        expect(event.occurredAt > addDays(event.recordedAt, -91)).toBe(true);
        expect(event.occurredAt <= event.recordedAt).toBe(true);
      }
      const firstQuarter = quarters[0]!;
      expect(
        firstQuarter.history.futureDueItems.some(
          (item) =>
            item.transitionKey === LOCAL_COUNCIL_MEETING &&
            item.jurisdictionId === town &&
            item.dueAt === firstQuarter.currentDate,
        ),
      ).toBe(false);
      expect(
        attendance.filter(
          (event) => event.recordedAt === firstQuarter.currentDate,
        ).length,
      ).toBeGreaterThan(0);
      for (const quarter of quarters) {
        const atReview = quarter.history.events.filter(
          (event) =>
            event.type === CIVIC_ACTION_EVENTS.attended &&
            event.recordedAt === quarter.currentDate,
        );
        for (const event of atReview) {
          const latestDate = quarter.history.events
            .filter(
              (entry) =>
                entry.type === "local.council-meeting-held" &&
                entry.jurisdictionId === town &&
                entry.occurredAt > addDays(quarter.currentDate, -91) &&
                entry.occurredAt <= quarter.currentDate,
            )
            .map((entry) => entry.occurredAt)
            .sort()
            .at(-1);
          expect(event.occurredAt).toBe(latestDate);
        }
      }
      const reloaded = deserializeWorld(serializeWorld(world));
      expect(serializeWorld(reloaded)).toBe(serializeWorld(world));
      expect(
        serializeWorld(
          withWorldIntegrityDeferred(() =>
            reviewTownCivicActions(reloaded, town, personId, "3"),
          ),
        ),
      ).toBe(serializeWorld(reloaded));
      process.stdout.write(
        `${JSON.stringify({ receipt: "A157 real-calendar production year", seed: SEED, place: PLACE.displayName, placeKey: PLACE.key, worldId: game.world.id, currentDate: world.currentDate, firstQuarterAttendance: attendance.filter((event) => event.recordedAt === firstQuarter.currentDate).length, attendance: attendance.length })}\n`,
      );
    });

    it("no meeting is scheduled in the quarter means no attendance, including canceled, future and past unheld meetings", () => {
      observeYear();
      const date = addDays(world.currentDate, 92);
      let withoutMeetings = {
        ...world,
        currentDate: date,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
      };
      for (const [key, dueAt] of [
        ["past-unheld", addDays(date, -7)],
        ["future", addDays(date, 1)],
        ["cancelled", date],
      ] as const) {
        withoutMeetings = withWorldIntegrityDeferred(() =>
          scheduleFutureDueItem(withoutMeetings, {
            stableKey: `${SEED}:${key}`,
            dueAt,
            transitionKey: LOCAL_COUNCIL_MEETING,
            entityIds: [town, personId],
            jurisdictionId: town,
            provenance: {
              kind: "authored",
              note: "Controlled invalid meeting eligibility input; outside the production year proof.",
            },
          }),
        );
      }
      const cancelledMeeting = withoutMeetings.history.futureDueItems.find(
        (item) => item.stableKey === `${SEED}:cancelled`,
      )!;
      withoutMeetings = withWorldIntegrityDeferred(() =>
        cancelFutureDueItem(withoutMeetings, {
          stableKey: `${SEED}:cancel-meeting`,
          dueItemId: cancelledMeeting.id,
          effectiveAt: date,
          reasonKey: "civic:test-meeting-cancelled",
          context: "Controlled calendar cancellation.",
        }),
      );
      const reviewed = withWorldIntegrityDeferred(() =>
        reviewTownCivicActions(
          withoutMeetings,
          town,
          personId,
          "no-eligible-quarter-meeting",
        ),
      );
      expect(
        reviewed.history.events
          .slice(withoutMeetings.history.events.length)
          .some((event) => event.type === CIVIC_ACTION_EVENTS.attended),
      ).toBe(false);
    });

    it("a contact names a real official, dated on its review", () => {
      observeYear();
      expect(
        events.filter((event) => event.type === CIVIC_ACTION_EVENTS.contacted)
          .length,
      ).toBeGreaterThan(0);
      for (const event of events.filter(
        (row) => row.type === CIVIC_ACTION_EVENTS.contacted,
      )) {
        const official = event.participants.find(
          (row) => row.role === "focus:object",
        )!.personId!;
        expect(world.people[official]).toBeDefined();
        expect(event.occurredAt).toBe(event.recordedAt);
        expect(official).not.toBe(
          event.participants.find((row) => row.role === "focus:subject")!
            .personId,
        );
      }
    });
  },
);
