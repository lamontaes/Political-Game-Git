import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addSimulationMinutes } from "./dates";
import { recordWorkRole, recordWorkStatus } from "./life";
import { workRoleAt, workStatusAt } from "./life-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";
import {
  advanceWorldMinutes,
  createScheduledActivity,
  createWorkItem,
  workItemState,
} from "./time-work";
import {
  ensurePressMediaOpening,
  mediaOutlets,
  reporterRoles,
} from "./press/outlets";

const places = Array.from({ length: 5 }, (_, index) => {
  const seed = `team8-a154-daily-work-all56:${index}`;
  return { seed, place: drawRandomPlace(seed) };
});

describe.each(places)(
  "daily staff allowance in $place.displayName ($seed)",
  ({ seed, place }) => {
    function fixture() {
      const small = smallWorld({ place: place.key, seed });
      let world = ensurePressMediaOpening(small.world, small.personId);
      const reporter = reporterRoles(world, mediaOutlets(world)[0]!.id)[0]!;
      const role = workRoleAt(world, reporter.workRelationshipId)!;
      world = recordWorkRole(world, {
        stableKey: `${seed}:ten-hours-weekly`,
        workRelationshipId: reporter.workRelationshipId,
        effectiveAt: world.currentDate,
        title: role.title,
        occupationClassification: role.occupationClassification,
        locationJurisdictionId: role.locationJurisdictionId,
        timeDemand: {
          ...role.timeDemand,
          expectedWeekly: { minimumHours: 10, maximumHours: 15 },
        },
        provenance: {
          kind: "authored",
          note: "Controlled saved job-hours range for accounting proof.",
        },
        supersedesRoleId: role.id,
      });
      // Start controlled labor at a canonical date boundary, not the opening's
      // midmorning clock. This makes two complete calendar days unambiguous.
      world = advanceWorldMinutes(
        world,
        1440 - world.currentMoment.minuteOfDay,
      );
      return { ...small, world, reporter };
    }

    function task(
      world: World,
      personId: EntityId,
      engagementId: EntityId,
      key: string,
      requiredMinutes = 5000,
    ) {
      const next = createWorkItem(world, {
        stableKey: `${seed}:${key}`,
        title: "Recorded staff task",
        summary: "Controlled effort for canonical daily allowance proof.",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        sourceEntityIds: [engagementId],
        focus: {
          kind: "other",
          targetKey: "fixture:daily-staff-work",
          sourceEntityId: engagementId,
        },
        effort: { kind: "authored-duration", requiredMinutes },
        access: { kind: "private", personIds: [personId] },
        assignedPersonIds: [personId],
        playerRequirement: "none",
        waitingOnPersonIds: [],
        blocker: null,
        scheduledActivityId: null,
      });
      return { world: next, id: next.history.workItems.at(-1)!.id };
    }

    it("shares one saved job allowance across two tasks and short advances", () => {
      const f = fixture();
      const first = task(
        f.world,
        f.reporter.personId,
        f.reporter.workRelationshipId,
        "first",
        90,
      );
      const second = task(
        first.world,
        f.reporter.personId,
        f.reporter.workRelationshipId,
        "second",
      );
      let world = advanceWorldMinutes(second.world, 60);
      expect(workItemState(world, first.id).completedEffortMinutes).toBe(60);
      world = advanceWorldMinutes(world, 60);
      expect(workItemState(world, first.id).completedEffortMinutes).toBe(90);
      expect(workItemState(world, second.id).completedEffortMinutes).toBe(30);
      world = advanceWorldMinutes(world, 60);
      expect(workItemState(world, second.id).completedEffortMinutes).toBe(30);
    });

    it("retains spent minutes through canonical save and continue", () => {
      const f = fixture();
      const created = task(
        f.world,
        f.reporter.personId,
        f.reporter.workRelationshipId,
        "reload",
      );
      const partial = advanceWorldMinutes(created.world, 75);
      const loaded = deserializeWorld(serializeWorld(partial));
      const finished = advanceWorldMinutes(loaded, 120);
      expect(workItemState(finished, created.id).completedEffortMinutes).toBe(
        120,
      );
      expect(
        workItemState(advanceWorldMinutes(finished, 60), created.id)
          .completedEffortMinutes,
      ).toBe(120);
    });

    it("checkpoints each date and matches short-advance effort after reload", () => {
      const f = fixture();
      const created = task(
        f.world,
        f.reporter.personId,
        f.reporter.workRelationshipId,
        "multi-date",
      );
      const long = advanceWorldMinutes(created.world, 2880);
      let short = created.world;
      for (let index = 0; index < 48; index += 1)
        short = advanceWorldMinutes(short, 60);
      expect(workItemState(long, created.id).completedEffortMinutes).toBe(240);
      expect(workItemState(short, created.id).completedEffortMinutes).toBe(240);
      const checkpoints = long.history.workItemStates.filter(
        (state) =>
          state.workItemId === created.id && state.completedEffortMinutes > 0,
      );
      expect(checkpoints.map((state) => state.completedEffortMinutes)).toEqual([
        120, 240,
      ]);
      expect(
        checkpoints.every((state) => state.recordedAt.minuteOfDay === 0),
      ).toBe(true);
      expect(checkpoints[0]!.recordedAt.date).not.toBe(
        checkpoints[1]!.recordedAt.date,
      );
      const continued = advanceWorldMinutes(
        deserializeWorld(serializeWorld(long)),
        60,
      );
      expect(workItemState(continued, created.id).completedEffortMinutes).toBe(
        300,
      );
    });

    it("preserves saved scheduled unavailability without spending unavailable minutes", () => {
      const f = fixture();
      const created = task(
        f.world,
        f.reporter.personId,
        f.reporter.workRelationshipId,
        "unavailable",
      );
      const start = created.world.currentMoment;
      const booked = createScheduledActivity(created.world, {
        stableKey: `${seed}:recorded-booking`,
        title: "Existing appointment",
        summary: "Controlled recorded conflict.",
        kind: "confirmed",
        start,
        end: addSimulationMinutes(start, 60),
        participantPersonIds: [f.reporter.personId],
        responsiblePersonId: f.reporter.personId,
        location: {
          jurisdictionId: f.jurisdictionId,
          label: "Recorded appointment",
          locationKey: "fixture:appointment",
        },
        sourceEntityIds: [f.reporter.workRelationshipId],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [f.reporter.personId] },
      });
      const world = advanceWorldMinutes(booked, 90);
      expect(workItemState(world, created.id).completedEffortMinutes).toBe(30);
      expect(
        workItemState(advanceWorldMinutes(world, 120), created.id)
          .completedEffortMinutes,
      ).toBe(120);
    });

    it("uses the saved role for each actual date rather than borrowing later hours", () => {
      const f = fixture();
      const created = task(
        f.world,
        f.reporter.personId,
        f.reporter.workRelationshipId,
        "role-change",
      );
      let world = advanceWorldMinutes(created.world, 1440);
      expect(workItemState(world, created.id).completedEffortMinutes).toBe(120);
      const role = workRoleAt(world, f.reporter.workRelationshipId)!;
      world = recordWorkRole(world, {
        stableKey: `${seed}:five-hours-weekly`,
        workRelationshipId: f.reporter.workRelationshipId,
        effectiveAt: world.currentDate,
        title: role.title,
        occupationClassification: role.occupationClassification,
        locationJurisdictionId: role.locationJurisdictionId,
        timeDemand: {
          ...role.timeDemand,
          expectedWeekly: { minimumHours: 5, maximumHours: 10 },
        },
        provenance: {
          kind: "authored",
          note: "Controlled later saved role change.",
        },
        supersedesRoleId: role.id,
      });
      world = advanceWorldMinutes(
        deserializeWorld(serializeWorld(world)),
        1440,
      );
      expect(workItemState(world, created.id).completedEffortMinutes).toBe(180);
    });

    it("does not credit labor after a recorded employment end", () => {
      const f = fixture();
      const created = task(
        f.world,
        f.reporter.personId,
        f.reporter.workRelationshipId,
        "ended-job",
      );
      const previous = workStatusAt(
        created.world,
        f.reporter.workRelationshipId,
      )!;
      const ended = recordWorkStatus(created.world, {
        stableKey: `${seed}:actual-job-end`,
        workRelationshipId: f.reporter.workRelationshipId,
        effectiveAt: created.world.currentDate,
        status: "ended",
        reason: "Controlled recorded employment end.",
        provenance: {
          kind: "authored",
          note: "Actual saved end for negative accounting proof.",
        },
        supersedesStatusId: previous.id,
      });
      expect(
        workItemState(advanceWorldMinutes(ended, 1440), created.id)
          .completedEffortMinutes,
      ).toBe(0);
    });

    it("records completion at the actual minute after a daily boundary", () => {
      const f = fixture();
      const created = task(
        f.world,
        f.reporter.personId,
        f.reporter.workRelationshipId,
        "dated-completion",
        180,
      );
      const world = advanceWorldMinutes(created.world, 1500);
      const state = workItemState(world, created.id);
      expect(state.status).toBe("ready-for-review");
      expect(state.completedEffortMinutes).toBe(180);
      expect(state.recordedAt.date).not.toBe(created.world.currentDate);
      expect(state.recordedAt.minuteOfDay).toBe(60);
      const next = task(
        deserializeWorld(serializeWorld(world)),
        f.reporter.personId,
        f.reporter.workRelationshipId,
        "after-completion",
      );
      expect(
        workItemState(advanceWorldMinutes(next.world, 120), next.id)
          .completedEffortMinutes,
      ).toBe(60);
    });

    it("keeps legacy unbound tasks on the existing minute-reservation path", () => {
      const f = fixture();
      const world = createWorkItem(f.world, {
        stableKey: `${seed}:legacy-unbound`,
        title: "Existing unbound task",
        summary: "Controlled legacy scope without an employment source.",
        jurisdictionId: f.jurisdictionId,
        sourceEntityIds: [f.personId],
        focus: {
          kind: "other",
          targetKey: "fixture:legacy-work",
          sourceEntityId: f.personId,
        },
        effort: { kind: "authored-duration", requiredMinutes: 300 },
        access: { kind: "private", personIds: [f.reporter.personId] },
        assignedPersonIds: [f.reporter.personId],
        playerRequirement: "none",
        waitingOnPersonIds: [],
        blocker: null,
        scheduledActivityId: null,
      });
      const id = world.history.workItems.at(-1)!.id;
      expect(
        workItemState(advanceWorldMinutes(world, 200), id)
          .completedEffortMinutes,
      ).toBe(200);
    });
  },
);
