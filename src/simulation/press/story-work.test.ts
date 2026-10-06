import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createWorkRelationship,
  recordWorkRole,
  recordWorkStatus,
} from "../life";
import { answerPressRequest, negotiateGroundRules } from "./sources";
import { pressAnswerStance, projectPressDesk } from "./views";
import { addDays } from "../dates";
import { activeWorkRelationshipsAt, workStatusAt } from "../life-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  advanceWorldMinutes,
  createWorkItem,
  workItemState,
} from "../time-work";
import { recordWorldEvent } from "../world";
import {
  assignedReporter,
  assignStory,
  latestDisposition,
  pressStoryStepHandler,
  PRESS_STORY_STEP_TRANSITION_KEY,
  recordStoryLead,
} from "./desk";
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
  storyEffortEstimate,
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

    it("keeps an actual assignment pending until its canonical reporting work finishes", () => {
      const f = fixture();
      const assigned = assignStory(f.world, f.lead.id);
      const reporterId = assignedReporter(assigned, f.lead.id);
      expect(reporterId).not.toBeNull();
      const reporter = reporterRoles(assigned, f.lead.outletId).find(
        (role) => role.personId === reporterId,
      )!;
      const world = assigned;
      const reportingItem = storyWorkItem(world, f.lead.id)!;
      expect(reportingItem).not.toBeNull();
      expect(reportingItem.summary).toContain("CTO-admitted estimate");
      expect(
        workItemState(world, reportingItem.id).assignedPersonIds,
      ).toContain(reporter.personId);
      const requiredMinutes = reportingItem.effort!.requiredMinutes;
      const due = world.history.futureDueItems.find(
        (item) => item.transitionKey === PRESS_STORY_STEP_TRANSITION_KEY,
      )!;
      expect(due).toBeDefined();
      const result = pressStoryStepHandler(world, due);
      expect(result.status).toBe("blocked");
      expect(result.reasonKey).toBe("press:reporting-work-incomplete");
      expect(result.outcomeEventId).toBeNull();
      expect(serializeWorld(result.world)).toBe(serializeWorld(world));
      const loaded = deserializeWorld(serializeWorld(world));
      expect(serializeWorld(pressStoryStepHandler(loaded, due).world)).toBe(
        serializeWorld(loaded),
      );
      const advanced = advanceWorldMinutes(loaded, requiredMinutes);
      const item = storyWorkItem(advanced, f.lead.id)!;
      expect(workItemState(advanced, item.id).status).toBe("ready-for-review");
      expect(workItemState(advanced, item.id).completedEffortMinutes).toBe(
        requiredMinutes,
      );
      expect(pressStoryStepHandler(advanced, due).reasonKey).not.toBe(
        "press:reporting-work-incomplete",
      );
    });

    it("carries a recorded press contact through save, reporter choice, and response queue", () => {
      const f = fixture();
      const outlet = mediaOutlets(f.world).find((candidate) => {
        const eligible = reporterRoles(f.world, candidate.id).filter((role) =>
          role.beats.includes("general-assignment"),
        );
        return eligible.length > 1;
      });
      if (!outlet)
        throw new Error("No opening outlet has two general reporters.");
      const familiar = reporterRoles(f.world, outlet.id).find((role) =>
        role.beats.includes("general-assignment"),
      )!;
      const terms = negotiateGroundRules(f.world, {
        stableKey: `${seed}:recorded-contact`,
        outletId: outlet.id,
        reporterPersonId: familiar.personId,
        sourcePersonId: f.personId,
        leadId: null,
        terms: "on-record",
        attributionLabel: null,
      });
      expect(terms.accepted).toBe(true);
      const contact = terms.world.history.relationshipInteractions.at(-1)!;
      expect(contact.tags).toContain("press.contact");

      const reloaded = deserializeWorld(serializeWorld(terms.world));
      const recorded = recordStoryLead(reloaded, {
        stableKey: `${seed}:contact-story`,
        outletId: outlet.id,
        family: "scheduled-beat",
        route: "public-record",
        basisEventIds: [f.source.id],
        subjectPersonIds: [f.personId],
        jurisdictionId: f.jurisdictionId,
        matterId: null,
        followsPublicationId: null,
      });
      const assigned = assignStory(recorded.world, recorded.lead.id);
      expect(assignedReporter(assigned, recorded.lead.id)).toBe(
        familiar.personId,
      );
      expect(latestDisposition(assigned, recorded.lead.id)?.decision).toBe(
        "response-requested",
      );
      const responseRequest = assigned.history.events.find(
        (event) =>
          event.stableKey === `${recorded.lead.stableKey}:response-request`,
      );
      expect(responseRequest).toBeDefined();
      expect(responseRequest!.involvedEntityIds).toContain(familiar.personId);
      const playerRequest = projectPressDesk(
        assigned,
        f.personId,
      ).incomingRequests.find((request) => request.leadId === recorded.lead.id);
      expect(playerRequest).toMatchObject({
        leadId: recorded.lead.id,
        reporterPersonId: familiar.personId,
      });
      expect(playerRequest!.answerOptions.length).toBeGreaterThan(0);
      const chosenAnswer = playerRequest!.answerOptions[0]!;
      const stance = pressAnswerStance(
        assigned,
        recorded.lead.id,
        f.personId,
        chosenAnswer.choice,
      );
      const answered = answerPressRequest(assigned, {
        leadId: recorded.lead.id,
        ...stance,
      });
      const response = answered.history.events.find(
        (event) =>
          event.stableKey ===
          `${recorded.lead.stableKey}:response:${f.personId}`,
      );
      expect(response).toBeDefined();
      expect(response!.involvedEntityIds).toContain(familiar.personId);
      expect(latestDisposition(answered, recorded.lead.id)?.decision).toBe(
        "subject-responded",
      );
      expect(
        answered.history.relationshipInteractions.some(
          (interaction) =>
            interaction.eventId === response!.id &&
            interaction.personIds.includes(familiar.personId) &&
            interaction.personIds.includes(f.personId) &&
            interaction.tags.includes("press.call.answered"),
        ),
      ).toBe(true);
      expect(storyWorkItem(assigned, recorded.lead.id)).not.toBeNull();
      expect(
        assigned.history.futureDueItems.some(
          (item) => item.transitionKey === PRESS_STORY_STEP_TRANSITION_KEY,
        ),
      ).toBe(true);
      console.info(
        `WATCHED PRESS JOURNEY — ${place.displayName}: recorded contact ${contact.id} survived save/reload; the familiar reporter ${familiar.personId} received lead ${recorded.lead.id}; source event ${f.source.id} led to response request ${responseRequest!.id} and queued story work; the press desk offered ${chosenAnswer.choice}, which the player recorded as response event ${response!.id}.`,
      );
    });

    it("queues a new story when recorded open tasks reserve every reporter's hours", () => {
      const f = fixture();
      let world = f.world;
      for (const reporter of reporterRoles(world, f.lead.outletId)) {
        const budget = reporterWorkBudget(world, reporter)!;
        world = createWorkItem(world, {
          stableKey: `${seed}:reserved:${reporter.id}`,
          title: "Recorded existing task",
          summary: "Controlled open task reserves the saved weekly job hours.",
          jurisdictionId: f.jurisdictionId,
          sourceEntityIds: [f.source.id, reporter.workRelationshipId],
          focus: {
            kind: "other",
            targetKey: "fixture:existing-work",
            sourceEntityId: f.source.id,
          },
          effort: {
            kind: "authored-duration",
            requiredMinutes: budget.availableMinutes.minimum,
          },
          access: { kind: "private", personIds: [reporter.personId] },
          assignedPersonIds: [reporter.personId],
          playerRequirement: "none",
          waitingOnPersonIds: [],
          blocker: null,
          scheduledActivityId: null,
        });
      }
      const next = assignStory(world, f.lead.id);
      expect(
        reporterRoles(next, f.lead.outletId).some(
          (role) => role.personId === assignedReporter(next, f.lead.id),
        ),
      ).toBe(true);
      expect(next.history.pressRecords?.at(-1)).toMatchObject({
        decision: "queued",
      });
      expect(storyWorkItem(next, f.lead.id)).toBeNull();
      expect(
        outletReportingWorkBudget(next, f.lead.outletId)?.availableMinutes
          .minimum,
      ).toBe(0);
      expect(serializeWorld(assignStory(next, f.lead.id))).toBe(
        serializeWorld(next),
      );
    });

    it("excludes gaps and later non-journalism roles from the recorded experience estimate", () => {
      const f = fixture();
      const current = activeWorkRelationshipsAt(
        f.world,
        f.reporter.personId,
      ).find(
        ({ relationship }) => relationship.id === f.reporter.workRelationshipId,
      )!;
      const start = addDays(f.world.currentDate, -4000);
      const end = addDays(start, 365);
      const provenance = {
        kind: "authored" as const,
        note: "Controlled recorded journalism spell and subsequent role change.",
      };
      let world = createWorkRelationship(f.world, {
        stableKey: `${seed}:earlier-work`,
        personId: f.reporter.personId,
        organizationId: null,
        startedAt: start,
        kind: "employment:fixture-news",
        compensation: "paid",
        authority: "self-directed",
        dependency: "partly-dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title: "Earlier recorded reporting",
          occupationClassification: "profession:journalism",
          locationJurisdictionId: f.jurisdictionId,
          timeDemand: current.role.timeDemand,
        },
      });
      const relationship = world.history.workRelationships.at(-1)!;
      const earlierRole = world.history.workRoles.at(-1)!;
      world = recordWorkRole(world, {
        stableKey: `${seed}:non-journalism`,
        workRelationshipId: relationship.id,
        effectiveAt: end,
        title: "Later recorded work",
        occupationClassification: null,
        locationJurisdictionId: f.jurisdictionId,
        timeDemand: current.role.timeDemand,
        provenance,
        supersedesRoleId: earlierRole.id,
      });
      expect(
        storyEffortEstimate(world, f.lead, f.reporter)?.requiredMinutes,
      ).toBe(312);
      expect(
        storyEffortEstimate(world, f.lead, f.reporter)?.description,
      ).toContain("experience multiplier 1.3");
      expect(
        storyEffortEstimate(
          deserializeWorld(serializeWorld(world)),
          f.lead,
          f.reporter,
        ),
      ).toEqual(storyEffortEstimate(world, f.lead, f.reporter));
    });

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
        workdayMinutes: {
          minimum: sum((budget) => budget.workdayMinutes.minimum),
          maximum: sum((budget) => budget.workdayMinutes.maximum),
        },
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
