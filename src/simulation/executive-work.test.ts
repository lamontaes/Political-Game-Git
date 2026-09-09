import { activeLifePathWorkers } from "./life-paths2-workers";
import {
  createLegislativeScenario,
  bodyForChamber,
  committeeMembers,
  dispositionsFromCounts,
  type LegislativeScenario,
} from "./legislation-scenarios";
import {
  introduceMeasure,
  referMeasure,
  scheduleCommitteeHearing,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  takeFloorVote,
  transmitMeasure,
  enrollMeasure,
  presentMeasureToExecutive,
  measurePosition,
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
} from "./legislation";
import { chamberByKey } from "./legislature-rules";
import { daysBetween } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Existing synthetic institutional proof inputs.",
  sourceEntityIds: [],
};
const hearingRegistry = composeExecutiveWorkHandlers(
  createFutureTransitionHandlerRegistry([
    [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
  ]),
);
import {
  workItemState,
  advanceWorldMinutes,
  scheduledActivityState,
} from "./time-work";
import { describe, it, expect } from "vitest";
import { createDemoWorld } from "./demo";
import { LEXINGTON_DEMO_CONTEXT } from "./demo-jurisdiction-context";
import { stateJurisdictionForKey } from "./life-places";
import { initializeExecutiveOfficePremiseForReview } from "./executive-work-entry";
import {
  resolveExecutiveOffice,
  bindExecutiveWork,
} from "./executive-work-context";
import {
  executiveNextStep,
  receiveExecutiveWork,
  actOnExecutiveWork,
  composeExecutiveWorkHandlers,
} from "./executive-work";
import { EXECUTIVE_AUTHORITY_RULE_PACKS } from "./executive-authority-rule-packs";
import { serializeWorld, deserializeWorld } from "./serialization";
import { advanceWorld, recordWorldEvent } from "./world";
import { recordEvidenceArtifact, recordEvidenceDiscovery } from "./evidence";
import {
  createWorkRelationship,
  recordWorkStatus,
  createPartnership,
} from "./life";
import { EXECUTIVE_GOVERNING_KERNELS } from "./executive-governing-kernel-bank";
import { addDays } from "./dates";
import type { World } from "./types";

function officeWorld(jurisdictionKey = "US-KY", seed = "exec-work2") {
  const jurisdiction = stateJurisdictionForKey(jurisdictionKey)!;
  let world = createDemoWorld(seed, {
    context: {
      ...LEXINGTON_DEMO_CONTEXT,
      jurisdiction,
      initialMoment: {
        date: "2026-01-05" as World["currentDate"],
        minuteOfDay: 550,
        timeZone: "America/New_York",
        utcOffsetMinutes: -300,
      },
      creationSummary: "Executive consumer test world.",
    },
  });
  world = {
    ...world,
    control: { kind: "person", personId: world.personOrder[0]! },
  };
  return initializeExecutiveOfficePremiseForReview(
    world,
    EXECUTIVE_AUTHORITY_RULE_PACKS.find(
      (p) => p.jurisdictionKey === jurisdictionKey,
    )!.packId,
    "2026-02-05",
  );
}
function incoming(world: World) {
  const office = resolveExecutiveOffice(world)!;
  const existing = world.history.events.find((e) => e.stableKey === "incoming");
  if (!existing)
    world = recordWorldEvent(world, {
      ...office.entry,
      stableKey: "incoming",
      type: "executive.incoming",
      summary: "Review the recorded office work.",
    });
  return receiveExecutiveWork(
    world,
    world.history.events.find((e) => e.stableKey === "incoming")!.id,
    "Office work",
    "Review the recorded office work.",
  );
}
function facts(world: World, keys: readonly string[]) {
  const office = resolveExecutiveOffice(world)!;
  const item = world.history.workItems.at(-1)!;
  for (const key of keys) {
    world = recordEvidenceArtifact(world, {
      stableKey: `fact:${key}`,
      evidenceKind: `executive-fact:${key}`,
      createdAt: world.currentDate,
      recordedAt: world.currentDate,
      relatedEntityIds: [
        item.focus.kind === "other" ||
        item.focus.kind === "legislative-material"
          ? item.focus.sourceEntityId
          : office.entry.id,
      ],
      access: "private",
      description: `Authored test fact for ${key}.`,
      provenance: {
        kind: "authored",
        note: "Synthetic binding proof, not production content or legal authority.",
      },
    });
    const evidence = world.history.evidenceArtifacts.at(-1)!;
    world = recordEvidenceDiscovery(world, {
      stableKey: `read:${key}`,
      personId: office.personId,
      evidenceArtifactId: evidence.id,
      discoveredAt: world.currentDate,
      recordedAt: world.currentDate,
      methodKey: "executive-work:test",
      provenance: { kind: "authored", note: "Synthetic receipt." },
    });
  }
  return { world, item };
}
describe("EXEC-WORK2 canonical binding", () => {
  it.each(["US-KY", "US-NE", "US-AK"])(
    "binds a distinct office in %s and survives reload",
    (key) => {
      const world = officeWorld(key);
      expect(resolveExecutiveOffice(world)?.pack.jurisdictionKey).toBe(key);
      expect(serializeWorld(deserializeWorld(serializeWorld(world)))).toBe(
        serializeWorld(world),
      );
    },
  );
  it("refuses observer, expired and stale office actions without writes", () => {
    const world = incoming(officeWorld());
    const item = world.history.workItems.at(-1)!;
    const observer = { ...world, control: { kind: "observer" as const } };
    expect(
      actOnExecutiveWork(observer, item.id, "92H-K-212", "continue").world,
    ).toBe(observer);
    const ended = advanceWorld(world, 31, composeExecutiveWorkHandlers());
    expect(resolveExecutiveOffice(ended)).toBeNull();
    expect(
      actOnExecutiveWork(ended, item.id, "92H-K-212", "continue").world,
    ).toBe(ended);
    expect(ended.history.events.slice(0, world.history.events.length)).toEqual(
      world.history.events,
    );
  });
  it("does not manufacture missing facts or staff", () => {
    const world = incoming(officeWorld());
    const item = world.history.workItems.at(-1)!;
    const before = serializeWorld(world);
    expect(bindExecutiveWork(world, item.id, "92H-K-001").ok).toBe(false);
    expect(serializeWorld(world)).toBe(before);
  });
  it("routes the same incoming event only once", () => {
    const world = incoming(officeWorld());
    expect(incoming(world)).toBe(world);
  });
});

function staff(world: World) {
  const office = resolveExecutiveOffice(world)!;
  const roles = [
    ...new Set(EXECUTIVE_GOVERNING_KERNELS.flatMap((k) => k.roles)),
  ].filter((k) => k !== "principal" && k !== "family-member");
  for (const [i, role] of roles.entries())
    world = createWorkRelationship(world, {
      stableKey: `staff:${role}`,
      personId: world.personOrder[1 + (i % 5)]!,
      organizationId: office.organizationId,
      startedAt: world.currentDate,
      kind: "employment:executive-staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: {
        kind: "authored",
        note: "Synthetic employed staff with explicit roles.",
      },
      initialRole: {
        title: role,
        occupationClassification: `service:executive-${role}`,
        locationJurisdictionId: office.jurisdictionId,
        timeDemand: office.role.timeDemand,
      },
    });
  return world;
}
it.each(
  EXECUTIVE_GOVERNING_KERNELS.filter(
    (k) => k.authority.kind === "none" && !k.roles.includes("family-member"),
  ),
)("binds all generic supported contexts: $row.id", (definition) => {
  let world = incoming(staff(officeWorld()));
  const seeded = facts(world, definition.requiredFactKeys);
  world = seeded.world;
  const result = bindExecutiveWork(world, seeded.item.id, definition.row.id);
  expect(result, result.ok ? "" : result.reason).toMatchObject({ ok: true });
});

it.each(["92H-K-001", "92H-K-003", "92H-K-160", "92H-K-171"] as const)(
  "performs successive canonical work and meetings for %s",
  (kernelId) => {
    const definition = EXECUTIVE_GOVERNING_KERNELS.find(
      (k) => k.row.id === kernelId,
    )!;
    let world = incoming(staff(officeWorld()));
    const seeded = facts(world, definition.requiredFactKeys);
    world = seeded.world;
    for (let i = 0; i < 40; i++) {
      const next = executiveNextStep(world, seeded.item.id, kernelId);
      expect(next, next.ok ? "" : next.reason).toMatchObject({ ok: true });
      if (!next.ok || !next.step) break;
      const step = next.step;
      if (step.kind === "work-item") {
        const created = world.history.workItems.find(
          (w) => w.stableKey === step.input.stableKey,
        );
        if (
          created &&
          workItemState(world, created.id).status === "active" &&
          step.input.playerRequirement === "none"
        )
          world = advanceWorldMinutes(
            world,
            30,
            composeExecutiveWorkHandlers(),
          );
      }
      const result = actOnExecutiveWork(
        world,
        seeded.item.id,
        kernelId,
        "continue",
        undefined,
        "Recorded test instruction.",
      );
      expect(result, result.ok ? "" : result.reason).toMatchObject({
        ok: true,
      });
      if (!result.ok) break;
      if (result.world === world)
        expect(
          executiveNextStep(world, seeded.item.id, kernelId),
        ).toMatchObject({ ok: true, step: null });
      world = result.world;
    }
    const final = executiveNextStep(world, seeded.item.id, kernelId);
    expect(final).toMatchObject({ ok: true, step: null });
    expect(serializeWorld(deserializeWorld(serializeWorld(world)))).toBe(
      serializeWorld(world),
    );
  },
);

function measureOnTheDesk(scenario: LegislativeScenario): World {
  let world = scenario.world;
  for (const chamberKey of scenario.pack.chamberOrder) {
    const chamber = chamberByKey(scenario.pack, chamberKey);
    const committee = chamber.committees[0]!;
    const body = bodyForChamber(scenario, chamberKey);
    world = referMeasure(world, {
      stableKey: `${chamberKey}:referral`,
      measureId: scenario.measureId,
      committeeKey: committee.committeeKey,
    });
    const mustHear = chamber.referral.everyMeasureMustBeHeard;
    if (mustHear.kind === "known" && mustHear.value) {
      world = scheduleCommitteeHearing(world, {
        stableKey: `${chamberKey}:hearing`,
        measureId: scenario.measureId,
        hearingDate: addDays(world.currentDate, 7),
      });
      world = advanceWorld(world, 7, hearingRegistry);
    }
    world = recordCommitteeDisposition(world, {
      stableKey: `${chamberKey}:committee`,
      measureId: scenario.measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers, nay: 0 },
      ),
      rationale: "The committee backed the bill after taking testimony.",
      provenance: AUTHORED,
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: `${chamberKey}:calendar`,
      measureId: scenario.measureId,
    });
    for (const stage of chamber.floorStages) {
      const until = measurePosition(
        world,
        scenario.measureId,
      ).earliestNextFloorDate;
      if (until && world.currentDate < until) {
        world = advanceWorld(
          world,
          daysBetween(world.currentDate, until),
          createFutureTransitionHandlerRegistry([]),
        );
      }
      world = takeFloorVote(world, {
        stableKey: `${chamberKey}:${stage.stageKey}`,
        measureId: scenario.measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: body.members.length,
          nay: 0,
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance: AUTHORED,
      });
    }
    if (
      measurePosition(world, scenario.measureId).phase ===
      "awaiting-transmittal"
    ) {
      world = transmitMeasure(world, {
        stableKey: `${chamberKey}:transmit`,
        measureId: scenario.measureId,
      });
    }
  }
  world = enrollMeasure(world, {
    stableKey: "enroll",
    measureId: scenario.measureId,
  });
  return presentMeasureToExecutive(world, {
    stableKey: "present",
    measureId: scenario.measureId,
  });
}

it.each(["sign", "veto-with-message"] as const)(
  "preserves the presented bill history through %s",
  (action) => {
    const scenario = createLegislativeScenario("nebraska");
    let world = officeWorld("US-NE", scenario.world.seed);
    const office = resolveExecutiveOffice(world)!;
    const original = scenario.world.history.legislativeMeasures![0]!;
    world = introduceMeasure(world, {
      ...original,
      stableKey: "exec-proof-bill",
      jurisdictionId: office.jurisdictionId,
      sponsorPersonId: null,
      policyAlternativeIds: [],
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    const bodies = scenario.bodies.map((body) => ({
      ...body,
      members: body.members.map((member) => ({
        ...member,
        personId: member.personId
          ? world.personOrder[
              scenario.world.personOrder.indexOf(member.personId)
            ]!
          : null,
      })),
    }));
    world = measureOnTheDesk({ ...scenario, world, measureId, bodies });
    world = staff(world);
    const event = world.history.legislativeActions!.find(
      (a) => a.measureId === measureId && a.kind === "presented-to-executive",
    )!;
    world = receiveExecutiveWork(
      world,
      event.eventId,
      original.designation,
      original.summary,
      measureId,
    );
    const seeded = facts(
      world,
      EXECUTIVE_GOVERNING_KERNELS.find((k) => k.row.id === "92H-K-030")!
        .requiredFactKeys,
    );
    world = seeded.world;
    const prior = world.history.legislativeActions!;
    for (let i = 0; i < 30; i++) {
      const step = executiveNextStep(
        world,
        seeded.item.id,
        "92H-K-030",
        action === "sign" ? "sign" : "veto-with-message",
      );
      expect(step, step.ok ? "" : step.reason).toMatchObject({ ok: true });
      if (!step.ok || !step.step) break;
      if (step.step.kind === "work-item") {
        const root = world.history.workItems.find(
          (w) => w.stableKey === step.step!.input.stableKey,
        );
        if (
          root &&
          workItemState(world, root.id).status === "active" &&
          step.step.input.playerRequirement === "none"
        )
          world = advanceWorldMinutes(
            world,
            30,
            composeExecutiveWorkHandlers(),
          );
      }
      const refreshed = executiveNextStep(world, seeded.item.id, "92H-K-030");
      if (!refreshed.ok) throw new Error(refreshed.reason);
      const result = actOnExecutiveWork(
        world,
        seeded.item.id,
        "92H-K-030",
        refreshed.step?.kind === "executive-disposition" ? action : "continue",
        undefined,
        "Authored test response.",
      );
      expect(result, result.ok ? "" : result.reason).toMatchObject({
        ok: true,
      });
      world = result.world;
      if (world.history.executiveDispositions?.length) break;
    }
    expect(world.history.executiveDispositions).toHaveLength(1);
    expect(world.history.legislativeActions!.slice(0, prior.length)).toEqual(
      prior,
    );
    expect(
      actOnExecutiveWork(world, seeded.item.id, "92H-K-030", action).world,
    ).toBe(world);
    expect(serializeWorld(deserializeWorld(serializeWorld(world)))).toBe(
      serializeWorld(world),
    );
  },
);

it("produces a periodic follow-up once and preserves unhandled future work", () => {
  const definition = EXECUTIVE_GOVERNING_KERNELS.find(
    (k) => k.row.id === "92H-K-003",
  )!;
  let world = incoming(staff(officeWorld()));
  const seeded = facts(world, definition.requiredFactKeys);
  world = seeded.world;
  for (let i = 0; i < 25; i++) {
    const bound = executiveNextStep(world, seeded.item.id, definition.row.id);
    if (!bound.ok) throw new Error(bound.reason);
    if (!bound.step) break;
    if (bound.step.kind === "work-item") {
      const key = bound.step.input.stableKey;
      const root = world.history.workItems.find((w) => w.stableKey === key);
      if (
        root &&
        workItemState(world, root.id).status === "active" &&
        bound.step.input.playerRequirement === "none"
      )
        world = advanceWorldMinutes(world, 30, composeExecutiveWorkHandlers());
    }
    const result = actOnExecutiveWork(
      world,
      seeded.item.id,
      definition.row.id,
      "continue",
      undefined,
      "Record the test review.",
    );
    if (!result.ok) throw new Error(result.reason);
    world = result.world;
  }
  const due = world.history.futureDueItems.find(
    (d) => d.transitionKey === "executive-governing:recurring-office-cycle",
  )!;
  expect(due).toBeDefined();
  const before = world.history.workItems.length;
  world = advanceWorld(
    world,
    daysBetween(world.currentDate, due.dueAt),
    composeExecutiveWorkHandlers(),
  );
  expect(world.history.workItems).toHaveLength(before + 1);
  const restored = deserializeWorld(serializeWorld(world));
  const later = advanceWorld(restored, 1, composeExecutiveWorkHandlers());
  expect(later.history.workItems).toHaveLength(before + 1);
  expect(
    later.history.futureDueItemStates.filter(
      (s) => s.dueItemId === due.id && s.status === "resolved",
    ),
  ).toHaveLength(1);
  expect(
    later.history.futureDueItems.filter(
      (d) => d.transitionKey === "executive-work:term-end",
    ),
  ).toEqual(
    world.history.futureDueItems.filter(
      (d) => d.transitionKey === "executive-work:term-end",
    ),
  );
});

it("stops canonical staff progress after that engagement ends", () => {
  let world = incoming(staff(officeWorld()));
  const seeded = facts(
    world,
    EXECUTIVE_GOVERNING_KERNELS.find((k) => k.row.id === "92H-K-001")!
      .requiredFactKeys,
  );
  world = seeded.world;
  const action = actOnExecutiveWork(
    world,
    seeded.item.id,
    "92H-K-001",
    "continue",
  );
  expect(action.ok).toBe(true);
  world = action.world;
  const work = world.history.workItems.at(-1)!;
  const personId = workItemState(world, work.id).assignedPersonIds[0]!;
  const worker = activeLifePathWorkers(
    world,
    resolveExecutiveOffice(world)!.organizationId,
  ).find(
    (w) =>
      w.personId === personId &&
      w.relationship.kind === "employment:executive-staff",
  )!;
  world = recordWorkStatus(world, {
    stableKey: "staff-left",
    workRelationshipId: worker.relationship.id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason: "Synthetic departure proof.",
    provenance: { kind: "authored", note: "Synthetic departure." },
    supersedesStatusId: worker.status.id,
  });
  const advanced = advanceWorldMinutes(
    world,
    30,
    composeExecutiveWorkHandlers(),
  );
  expect(workItemState(advanced, work.id).completedEffortMinutes).toBe(0);
});

it.each(["return-for-work", "defer"] as const)(
  "records %s as real pending work before a decision",
  (action) => {
    const definition = EXECUTIVE_GOVERNING_KERNELS.find(
      (k) => k.row.id === "92H-K-003",
    )!;
    const seeded = facts(
      incoming(staff(officeWorld())),
      definition.requiredFactKeys,
    );
    let world = seeded.world;
    for (let i = 0; i < 30; i++) {
      const next = executiveNextStep(world, seeded.item.id, definition.row.id);
      expect(next.ok).toBe(true);
      if (!next.ok || !next.step) throw new Error("Decision not reached");
      if (
        next.step.kind === "work-item" &&
        next.step.input.playerRequirement !== "none"
      )
        break;
      const result = actOnExecutiveWork(
        world,
        seeded.item.id,
        definition.row.id,
        "continue",
      );
      expect(result.ok).toBe(true);
      if (result.ok) world = result.world;
      world = advanceWorldMinutes(world, 30, composeExecutiveWorkHandlers());
    }
    const result = actOnExecutiveWork(
      world,
      seeded.item.id,
      definition.row.id,
      action,
      undefined,
      "Review the supplied record.",
    );
    expect(result, result.ok ? "" : result.reason).toMatchObject({ ok: true });
    if (!result.ok) return;
    const again = actOnExecutiveWork(
      result.world,
      seeded.item.id,
      definition.row.id,
      action,
    );
    expect(again).toMatchObject({ ok: false, world: result.world });
    expect(serializeWorld(deserializeWorld(serializeWorld(result.world)))).toBe(
      serializeWorld(result.world),
    );
    if (action === "defer")
      expect(
        scheduledActivityState(
          result.world,
          result.world.history.scheduledActivities.at(-1)!.id,
        ).start.date,
      ).toBe(addDays(world.currentDate, 7));
    else {
      const followup = result.world.history.workItems.at(-1)!;
      expect(followup.title).toBe("Further staff review");
      expect(
        workItemState(result.world, followup.id).assignedPersonIds.length,
      ).toBe(1);
      expect(
        actOnExecutiveWork(
          result.world,
          seeded.item.id,
          definition.row.id,
          "continue",
          undefined,
          "Proceed.",
        ),
      ).toMatchObject({ ok: false });
    }
  },
);

it.each(
  EXECUTIVE_GOVERNING_KERNELS.filter((k) => k.roles.includes("family-member")),
)("binds family practice to an actual partnership: $row.id", (definition) => {
  let world = staff(officeWorld());
  const office = resolveExecutiveOffice(world)!;
  world = createPartnership(world, {
    stableKey: "executive-family-proof",
    personIds: [office.personId, world.personOrder[5]!].sort() as [
      typeof office.personId,
      typeof office.personId,
    ],
    startedAt: world.currentDate,
    kind: "legal:marriage",
    provenance: {
      kind: "authored",
      note: "Synthetic relationship for binding proof.",
    },
  });
  const seeded = facts(incoming(world), definition.requiredFactKeys);
  const result = bindExecutiveWork(
    seeded.world,
    seeded.item.id,
    definition.row.id,
  );
  expect(result, result.ok ? "" : result.reason).toMatchObject({ ok: true });
});
