import { describe, expect, it } from "vitest";
import { createWorkRelationship, recordWorkStatus } from "../simulation/life";
import { recordWorldEvent } from "../simulation/world";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { buildTraceIndex } from "./trace-index";
import { createCausalTraceFixture } from "./trace-fixture";
import { walkTrace } from "./trace-walk";

describe("live Observer trace adapters", () => {
  it("follows a saved outcome's explicit decision tag and work provenance after reload", () => {
    const fixture = createCausalTraceFixture(
      "normal",
      "observer-live-adapters",
    );
    let world = fixture.world;
    const decision = world.history.decisionTraces.at(-1)!;
    expect(decision).toBeDefined();
    world = recordWorldEvent(world, {
      stableKey: "observer-live-adapters:outcome",
      type: "test.decision-outcome",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [decision.context.actorPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [`decision-trace:${decision.id}`],
      summary: decision.context.options.find(
        (option) => option.key === decision.selectedOptionKey,
      )!.label,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1)!;
    world = createWorkRelationship(world, {
      stableKey: "observer-live-adapters:work",
      personId: decision.context.actorPersonId,
      organizationId: null,
      startedAt: world.currentDate,
      kind: "independent:test-work",
      compensation: "paid",
      authority: "self-directed",
      dependency: "independent",
      economicRisk: "person-borne",
      provenance: { kind: "simulated-event", eventId: event.id },
      initialRole: {
        title: "Survey researcher",
        occupationClassification: "custom:onet-19-3022-00",
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 35, maximumHours: 45 },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: null,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    world = recordWorkStatus(world, {
      stableKey: "observer-live-adapters:ended",
      workRelationshipId: work.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "The recorded engagement ended.",
      provenance: { kind: "simulated-event", eventId: event.id },
      supersedesStatusId: world.history.workStatuses.at(-1)!.id,
    });
    const root = world.history.workStatuses.at(-1)!.id;
    const restored = deserializeWorld(serializeWorld(world));
    const before = serializeWorld(restored);
    const index = buildTraceIndex(restored);
    const walk = walkTrace(index, {
      rootId: root,
      direction: "upstream",
      maxDepth: 8,
    });
    expect(walk.steps.map((step) => step.nodeId)).toEqual(
      expect.arrayContaining([root, work.id, event.id, decision.id]),
    );
    expect(index.byId.get(event.id)?.links).toContainEqual({
      kind: "causal-parent",
      role: "tags.decision-trace",
      targetId: decision.id,
    });
    expect(serializeWorld(restored)).toBe(before);
  });
});
