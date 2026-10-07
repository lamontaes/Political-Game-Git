import { afterEach, describe, expect, it, vi } from "vitest";
import * as decisions from "../decisions";
import { createScenarioWorld } from "../demo";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createOrganization, createWorkRelationship } from "../life";
import { recordEventKnowledge } from "../records";
import { recordWorldEvent } from "../world";
import {
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  mediaOutlets,
} from "./outlets";
import {
  assignStory,
  latestDisposition,
  pressStoryStepHandler,
  recordStoryLead,
  PRESS_STORY_STEP_TRANSITION_KEY,
} from "./desk";
import { openMatter, recordAllegation } from "./matters";
import { produceMatterResponses } from "./responses";
import { pressRecordsOfKind } from "./store";
const evaluate = decisions.evaluateDecision;
type EvaluationArgs = Parameters<typeof evaluate>;
function forceTie() {
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation(
      (
        world: EvaluationArgs[0],
        input: EvaluationArgs[1],
      ): ReturnType<typeof evaluate> => {
        const result = evaluate(world, input);
        return {
          ...result,
          outcomeKind: "undecided",
          selectedOptionKey: null,
          optionEvaluations: result.optionEvaluations.map((option) => ({
            ...option,
            preference: "mixed",
            randomContribution: "none",
            finalRank: null,
          })),
        };
      },
    );
}
function fixture() {
  let world = createScenarioWorld("a125-press-pending", KENTUCKY_CONTEXT, {
    peopleCount: 7,
  });
  const subject = world.personOrder[0]!;
  const actor = world.personOrder[1]!;
  world = ensurePressMediaOpening(world, subject);
  world = ensurePressStateCoverage(world, KENTUCKY_CONTEXT.jurisdiction.id);
  world = recordWorldEvent(world, {
    stableKey: "a125:source",
    type: "fixture.press-source",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    involvedEntityIds: [subject, actor],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "A recorded source for the press decision fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const opened = openMatter(world, {
    stableKey: "a125:matter",
    family: "M1",
    subjectPersonIds: [subject],
    occurrenceId: null,
    originEventId: world.history.events.at(-1)!.id,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
  });
  const alleged = recordAllegation(opened.world, {
    stableKey: "a125:allegation",
    matterId: opened.matter.id,
    allegerPersonId: actor,
    statement: "The payment was personal spending.",
    publicAllegation: true,
    basisEventIds: [],
  });
  const outlet = mediaOutlets(alleged.world).find(
    (row) => row.scope === "state",
  )!;
  const lead = recordStoryLead(alleged.world, {
    stableKey: "a125:lead",
    outletId: outlet.id,
    family: "allegation",
    route: "public-record",
    basisEventIds: [alleged.eventId],
    subjectPersonIds: [subject],
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    matterId: opened.matter.id,
    followsPublicationId: null,
  });
  return {
    world: lead.world,
    leadId: lead.lead.id,
    matterId: opened.matter.id,
    eventId: alleged.eventId,
    subject,
    actor,
  };
}
afterEach(() => vi.restoreAllMocks());
describe("A125 press callers preserve a tied decision", () => {
  it("leaves a lead available for assignment after a tie and Continue", () => {
    const f = fixture();
    const spy = forceTie();
    const tied = assignStory(f.world, f.leadId);
    expect(spy).toHaveBeenCalled();
    expect(latestDisposition(tied, f.leadId)).toBeNull();
    expect(serializeWorld(tied)).toBe(serializeWorld(f.world));
    expect(
      serializeWorld(
        assignStory(deserializeWorld(serializeWorld(tied)), f.leadId),
      ),
    ).toBe(serializeWorld(tied));
  });
  it("keeps subject response and publication pending without writing a reply, decline or publication", () => {
    const f = fixture();
    const assigned = assignStory(f.world, f.leadId);
    expect(latestDisposition(assigned, f.leadId)?.decision).toBe(
      "response-requested",
    );
    const due = assigned.history.futureDueItems.find(
      (row) => row.transitionKey === PRESS_STORY_STEP_TRANSITION_KEY,
    )!;
    expect(due).toBeDefined();
    const spy = forceTie();
    const result = pressStoryStepHandler(assigned, due);
    expect(
      spy.mock.calls.map(([, context]: EvaluationArgs) => context.decisionType),
    ).toContain("press.subject-response");
    expect(
      spy.mock.calls.map(([, context]: EvaluationArgs) => context.decisionType),
    ).toContain("press.editorial-disposition");
    expect(result.status).toBe("blocked");
    expect(result.outcomeEventId).toBeNull();
    expect(serializeWorld(result.world)).toBe(serializeWorld(assigned));
    const loaded = deserializeWorld(serializeWorld(result.world));
    const repeated = pressStoryStepHandler(loaded, due);
    expect(repeated.status).toBe("blocked");
    expect(serializeWorld(repeated.world)).toBe(serializeWorld(loaded));
  });
  it("does not turn a colleague's tied matter decision into a recorded no-action response", () => {
    const f = fixture();
    const provenance = {
      kind: "authored" as const,
      note: "Recorded colleagues for the pending-response fixture.",
    };
    let world = createOrganization(f.world, {
      stableKey: "a125:employer",
      formedAt: f.world.currentDate,
      provenance,
      initialProfile: {
        name: "Fixture employer",
        classification: "custom:fixture",
        locationJurisdictionId: null,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    for (const personId of [f.subject, f.actor])
      world = createWorkRelationship(world, {
        stableKey: `a125:work:${personId}`,
        personId,
        organizationId,
        startedAt: world.currentDate,
        kind: "employment:shop-assistant",
        compensation: "paid",
        authority: "directed",
        dependency: "partly-dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title: "Colleague",
          occupationClassification: null,
          locationJurisdictionId: null,
          timeDemand: {
            expectedWeekly: { minimumHours: 10, maximumHours: 10 },
            attention: "low",
            concurrency: "partly-concurrent",
            scheduleRigidity: "mixed",
            interruptibility: "limited",
            locationJurisdictionId: null,
          },
        },
      });
    const event = world.history.events.find((row) => row.id === f.eventId)!;
    world = recordEventKnowledge(world, {
      stableKey: "a125:known",
      personId: f.actor,
      eventId: event.id,
      learnedAt: world.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const spy = forceTie();
    const result = produceMatterResponses(world, f.matterId, event);
    expect(
      spy.mock.calls.some(
        ([, context]: EvaluationArgs) =>
          context.decisionType === "press.staff-matter-response",
      ),
    ).toBe(true);
    expect(pressRecordsOfKind(result, "matter-response")).toEqual(
      pressRecordsOfKind(world, "matter-response"),
    );
    expect(serializeWorld(result)).toBe(serializeWorld(world));
    const reopened = deserializeWorld(serializeWorld(result));
    expect(
      serializeWorld(produceMatterResponses(reopened, f.matterId, event)),
    ).toBe(serializeWorld(reopened));
  });
});
