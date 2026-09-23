import { describe, expect, it } from "vitest";

import {
  addDays,
  createScheduledActivity,
  homePartyChapters,
  simulationMomentAtLocalTime,
} from "../simulation";
import type { IsoDate } from "../simulation";
import { requestPartyWork } from "./campaign-life-actions";
import { projectPartyAndCommunityWork } from "./campaign-life-surface";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * Two of 180 test lives (Georgia and Colorado) were offered a phone shift to
 * ask for, and pressing it answered that no shared free evening existed. The
 * surface now asks the writer's own planning first and shows it unavailable,
 * with that reason, instead of offering a press that can only be refused.
 */

// A Georgia place (Census 1321240): not the Kentucky scenario.
const GEORGIA_PLACE = "1321240";

describe(
  "asking for party work with no shared free evening",
  { timeout: 600_000 },
  () => {
    it("shows the phone shift unavailable with the writer's reason", () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: "party-request-no-evening",
          startAge: 34,
          placeKey: GEORGIA_PLACE,
        }),
      ).game!;
      const personId = game.playerPersonId;
      const chapter = homePartyChapters(game.world)[0]!;
      const option = (world: typeof game.world) =>
        projectPartyAndCommunityWork(world, personId).requestable.find(
          (candidate) =>
            candidate.form === "phone-shift" &&
            candidate.hostOrganizationId === chapter.organizationId,
        )!;
      expect(option(game.world).unavailableReason).toBeNull();

      // The organizer is booked every evening for the whole request window.
      const at = (days: number, minute: number) =>
        simulationMomentAtLocalTime({
          date: addDays(game.world.currentDate, days) as IsoDate,
          minuteOfDay: minute,
          timeZone: game.world.currentMoment.timeZone,
          preferredUtcOffsetMinutes: game.world.currentMoment.utcOffsetMinutes,
        });
      const booked = createScheduledActivity(game.world, {
        stableKey: "request-evening-test:organizer-away",
        title: "Out of town",
        summary: "The organizer is away.",
        kind: "confirmed",
        start: at(0, 23 * 60),
        end: at(20, 23 * 60),
        participantPersonIds: [chapter.organizerPersonId!],
        responsiblePersonId: chapter.organizerPersonId!,
        location: {
          locationKey: "request-evening-test:away",
          label: "Out of town",
          jurisdictionId: null,
        },
        sourceEntityIds: [game.world.history.events[0]!.id],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [chapter.organizerPersonId!] },
      });

      const reason = option(booked).unavailableReason;
      expect(reason).toMatch(/shared free evening in the next two weeks/);
      expect(reason).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      // The writer still refuses with the same sentence if reached anyway.
      expect(() =>
        requestPartyWork(
          booked,
          personId,
          "phone-shift",
          chapter.organizationId,
        ),
      ).toThrow(reason!);
    });
  },
);
