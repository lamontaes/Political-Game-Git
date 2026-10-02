import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { recordWorkStatus } from "../life";
import { activeWorkRelationshipsAt, workStatusAt } from "../life-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createWorkItem, workItemState } from "../time-work";
import { recordWorldEvent } from "../world";
import { recordStoryLead } from "./desk";
import {
  ensurePressMediaOpening,
  mediaOutlets,
  reporterRoles,
} from "./outlets";
import {
  createStoryWorkItem,
  outletReportingWorkBudget,
  reporterWorkBudget,
  storyWorkItem,
} from "./story-work";

// Unfiltered draws from the existing all-56 jurisdiction sampler.
const samples = Array.from({ length: 5 }, (_, index) => {
  const seed = `team8-a154-story-work-all56:${index}`;
  return { seed, place: drawRandomPlace(seed) };
});
// Supplied controlled effort, not a researched production duration estimate.
const estimate = {
  requiredMinutes: 120,
  description: "Authored fixture reporting effort estimate.",
};

describe.each(samples)(
  "saved reporting work in $place.displayName ($seed)",
  ({ seed, place }) => {
    function fixture() {
      const small = smallWorld({ place: place.key, seed });
      let world = ensurePressMediaOpening(small.world, small.personId);
      const outlet = mediaOutlets(world)[0]!;
      const reporter = reporterRoles(world, outlet.id)[0]!;
      if (!outlet || !reporter)
        throw new Error("No saved opening outlet/reporter.");
      world = recordWorldEvent(world, {
        stableKey: `${seed}:public-source`,
        type: "fixture.public-reporting-source",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: small.jurisdictionId,
        involvedEntityIds: [small.personId],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: ["fixture"],
        summary: "Controlled public event for a recorded reporting lead.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const source = world.history.events.at(-1)!;
      const recorded = recordStoryLead(world, {
        stableKey: `${seed}:lead`,
        outletId: outlet.id,
        family: "scheduled-beat",
        route: "public-record",
        basisEventIds: [source.id],
        subjectPersonIds: [small.personId],
        jurisdictionId: small.jurisdictionId,
        matterId: null,
        followsPublicationId: null,
      });
      return {
        ...small,
        world: recorded.world,
        reporter,
        lead: recorded.lead,
        source,
      };
    }

    it("projects outlet minutes from its actual current reporters", () => {
      const f = fixture();
      const budgets = reporterRoles(f.world, f.lead.outletId).map((reporter) =>
        reporterWorkBudget(f.world, reporter),
      );
      expect(budgets.every((budget) => budget !== null)).toBe(true);
      const sum = (
        read: (budget: NonNullable<(typeof budgets)[number]>) => number,
      ) => budgets.reduce((total, budget) => total + read(budget!), 0);
      expect(outletReportingWorkBudget(f.world, f.lead.outletId)).toEqual({
        weeklyMinutes: {
          minimum: sum((budget) => budget.weeklyMinutes.minimum),
          maximum: sum((budget) => budget.weeklyMinutes.maximum),
        },
        reservedMinutes: sum((budget) => budget.reservedMinutes),
        availableMinutes: {
          minimum: sum((budget) => budget.availableMinutes.minimum),
          maximum: sum((budget) => budget.availableMinutes.maximum),
        },
      });
    });

    it("reads actual weekly hours and subtracts canonical assigned effort", () => {
      const f = fixture();
      const employment = activeWorkRelationshipsAt(
        f.world,
        f.reporter.personId,
      ).find(
        (active) => active.relationship.id === f.reporter.workRelationshipId,
      )!;
      expect(employment).toBeDefined();
      const weekly = {
        minimum: employment.role.timeDemand.expectedWeekly.minimumHours * 60,
        maximum: employment.role.timeDemand.expectedWeekly.maximumHours * 60,
      };
      const before = reporterWorkBudget(f.world, f.reporter)!;
      expect(before).not.toBeNull();
      expect(before.weeklyMinutes).toEqual(weekly);
      const world = createStoryWorkItem(f.world, f.lead, f.reporter, estimate);
      const item = storyWorkItem(world, f.lead.id)!;
      expect(item).not.toBeNull();
      expect(item.effort).toEqual({
        kind: "authored-duration",
        requiredMinutes: estimate.requiredMinutes,
      });
      const state = workItemState(world, item.id)!;
      expect(state.assignedPersonIds).toContain(f.reporter.personId);
      const remaining = estimate.requiredMinutes - state.completedEffortMinutes;
      const after = reporterWorkBudget(world, f.reporter)!;
      expect(after.reservedMinutes).toBe(before.reservedMinutes + remaining);
      expect(after.availableMinutes).toEqual({
        minimum: Math.max(0, weekly.minimum - after.reservedMinutes),
        maximum: Math.max(0, weekly.maximum - after.reservedMinutes),
      });
    });

    it("uses saved work IDs and preserves canonical reload/repeat without creating staff", () => {
      const f = fixture();
      const original = serializeWorld(f.world);
      const world = createStoryWorkItem(f.world, f.lead, f.reporter, estimate);
      const item = storyWorkItem(world, f.lead.id)!;
      expect(item.sourceEntityIds).toEqual(
        expect.arrayContaining([
          f.lead.id,
          f.reporter.id,
          f.reporter.workRelationshipId,
        ]),
      );
      expect(item.summary).toContain(estimate.description);
      expect(world.people).toEqual(f.world.people);
      expect(world.history.organizations).toEqual(
        f.world.history.organizations,
      );
      expect(world.history.workRelationships).toEqual(
        f.world.history.workRelationships,
      );
      expect(serializeWorld(f.world)).toBe(original);
      const loaded = deserializeWorld(serializeWorld(world));
      expect(storyWorkItem(loaded, f.lead.id)).toEqual(item);
      const repeated = createStoryWorkItem(
        loaded,
        f.lead,
        f.reporter,
        estimate,
      );
      expect(serializeWorld(repeated)).toBe(serializeWorld(loaded));
      expect(storyWorkItem(repeated, f.lead.id)?.id).toBe(item.id);
    });

    it("leaves an unknown open task effort unsupported", () => {
      const f = fixture();
      const world = createWorkItem(f.world, {
        stableKey: `${seed}:unknown-effort`,
        title: "Controlled task with unrecorded effort",
        summary: "No fixture duration was supplied.",
        jurisdictionId: f.jurisdictionId,
        sourceEntityIds: [f.source.id],
        focus: {
          kind: "other",
          targetKey: "fixture:reporting",
          sourceEntityId: f.source.id,
        },
        effort: null,
        access: { kind: "private", personIds: [f.reporter.personId] },
        assignedPersonIds: [f.reporter.personId],
        playerRequirement: "none",
        waitingOnPersonIds: [],
        blocker: null,
        scheduledActivityId: null,
      });
      expect(reporterWorkBudget(world, f.reporter)).toBeNull();
      expect(outletReportingWorkBudget(world, f.lead.outletId)).toBeNull();
    });

    it("supplies no budget for absent staff or a canonically ended job", () => {
      const f = fixture();
      expect(reporterWorkBudget(f.world, null)).toBeNull();
      const prior = workStatusAt(f.world, f.reporter.workRelationshipId)!;
      const ended = recordWorkStatus(f.world, {
        stableKey: `${seed}:ended`,
        workRelationshipId: f.reporter.workRelationshipId,
        effectiveAt: f.world.currentDate,
        status: "ended",
        reason: "Controlled recorded job ending.",
        provenance: {
          kind: "authored",
          note: "A154 work-budget boundary fixture.",
        },
        supersedesStatusId: prior.id,
      });
      expect(reporterWorkBudget(ended, f.reporter)).toBeNull();
    });
  },
);
