import { describe, expect, it } from "vitest";
import { createLightweightPerson } from "../../src/simulation/people";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { makeIsoDate, addDays } from "../../src/simulation/dates";
import {
  createWorld,
  createWorldId,
  assertWorldIntegrityFully,
} from "../../src/simulation/world";
import { createWorkRelationship } from "../../src/simulation/life";
import {
  enterLifePath,
  scheduleLifePathSession,
  performLifePathSession,
} from "../../src/simulation/life-paths2";
import {
  createResourceFlow,
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceFlowTerms,
  recordResourceTransferOutcome,
  recordResourceTransferOutcomes,
  resourceTransferTermsCutoff,
  resolveWorkCompensationPeriod,
  type RecordResourceTransferOutcomeInput,
} from "../../src/simulation/resources";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
} from "../../src/simulation/resource-queries";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { nationalPlacePlan, watchedIdentity } from "./places";
import { settleTownCompensations } from "../../src/simulation/living-world/town-pay";
import type { World } from "../../src/simulation/types";

// Amounts are explicitly authored test terms, not researched wages or a law size.
const EARNED_MINOR = 10_000;
const LATER_MINOR = 20_000;
const provenance = {
  kind: "authored" as const,
  note: "C5 controlled saved work/pay test inputs; no economic forecast.",
};
function fixture() {
  const selected = nationalPlacePlan("c5-earned-work-terms-20261001", 1)
    .watched[0]!;
  const place = lifePlaceByKey(selected.placeKey)!;
  const date = makeIsoDate("2026-01-05");
  const people = [1, 2].map((index) =>
    createLightweightPerson({
      worldId: createWorldId(selected.seed),
      worldSeed: selected.seed,
      index,
      currentDate: date,
      homeJurisdictionId: place.context.jurisdiction.id,
    }),
  );
  const personId = people[0]!.id,
    otherPersonId = people[1]!.id;
  let world = createWorld({
    seed: selected.seed,
    currentDate: date,
    jurisdictions: [place.context.jurisdiction],
    people,
    control: { kind: "person", personId },
  });
  const entered = enterLifePath(world, "shop-assistant");
  expect(entered.ok, entered.message).toBe(true);
  world = entered.world;
  const work = world.history.workRelationships.find(
    (row) =>
      row.personId === personId &&
      row.kind === "employment:life-paths2-shop-assistant",
  );
  if (!work?.organizationId)
    throw new Error("Canonical work entry supplied no saved employer/work");
  const flow = world.history.resourceFlows.find(
    (row) =>
      row.basisReference.kind === "work" &&
      row.basisReference.workRelationshipId === work.id,
  );
  if (!flow)
    throw new Error("Canonical work entry supplied no compensation flow");
  world = createResourcePosition(world, {
    stableKey: "earned:funded-employer",
    owner: { kind: "organization", organizationId: work.organizationId },
    openedAt: date,
    openingBalance: money(100_000, "USD"),
    provenance,
  });
  world = createResourcePosition(world, {
    stableKey: "earned:worker-account",
    owner: { kind: "person", personId },
    openedAt: date,
    openingBalance: money(0, "USD"),
    provenance,
  });
  const initial = resourceFlowTermsAt(world, flow.id)!;
  world = recordResourceFlowTerms(world, {
    stableKey: "earned:earlier-terms",
    resourceFlowId: flow.id,
    effectiveAt: date,
    status: "active",
    amount: money(EARNED_MINOR, "USD"),
    cadenceKind: initial.cadenceKind,
    reason: "Authored terms in force before the actual completed session.",
    supersedesTermsId: initial.id,
    provenance,
  });
  const earlierTerms = resourceFlowTermsAt(world, flow.id)!;
  const existingRole = world.history.workRoles.find(
    (role) => role.workRelationshipId === work.id,
  );
  if (!existingRole) throw new Error("Canonical worker role missing");
  // Actual different saved worker and flow, already present before completion.
  world = createWorkRelationship(world, {
    stableKey: "earned:other-worker",
    personId: otherPersonId,
    organizationId: work.organizationId,
    startedAt: date,
    kind: "employment:fixture-paid-work",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Controlled second worker",
      occupationClassification: existingRole.occupationClassification,
      locationJurisdictionId: place.context.jurisdiction.id,
      timeDemand: existingRole.timeDemand,
    },
  });
  const otherWorkId = world.history.workRelationships.at(-1)!.id;
  world = createWorkCompensation(world, {
    stableKey: "earned:other-pay",
    workRelationshipId: otherWorkId,
    startsAt: date,
    amount: money(EARNED_MINOR, "USD"),
    cadenceKind: initial.cadenceKind,
    restrictionKind: null,
    jurisdictionId: place.context.jurisdiction.id,
    provenance,
  });
  const otherFlowId = world.history.resourceFlows.at(-1)!.id;
  world = createResourceFlow(world, {
    stableKey: "earned:general-flow",
    source: { kind: "organization", organizationId: work.organizationId },
    recipient: { kind: "person", personId },
    startsAt: date,
    amount: money(EARNED_MINOR, "USD"),
    cadenceKind: initial.cadenceKind,
    basisKind: "custom:fixture-transfer",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: place.context.jurisdiction.id,
    provenance,
  });
  const generalFlowId = world.history.resourceFlows.at(-1)!.id;
  const scheduled = scheduleLifePathSession(world, work.id);
  expect(scheduled.ok, scheduled.message).toBe(true);
  const activity = scheduled.world.history.scheduledActivities.at(-1)!;
  const completed = performLifePathSession(scheduled.world, activity.id);
  expect(completed.ok, completed.message).toBe(true);
  world = completed.world;
  const event = world.history.events.find(
    (row) =>
      row.type === "life-paths2.work-session" &&
      row.involvedEntityIds.includes(work.id),
  );
  if (!event)
    throw new Error("Native completed session produced no saved work event");
  expect(event.occurredAt).toBe(date);
  expect(event.involvedEntityIds).toContain(personId);
  expect(event.involvedEntityIds).toContain(activity.id);
  expect(earlierTerms.sequence).toBeLessThan(event.sequence);
  for (const id of [flow.id, otherFlowId, generalFlowId]) {
    const previous = resourceFlowTermsAt(world, id)!;
    world = recordResourceFlowTerms(world, {
      stableKey: `earned:later-terms:${id}`,
      resourceFlowId: id,
      effectiveAt: date,
      status: "active",
      amount: money(LATER_MINOR, "USD"),
      cadenceKind: previous.cadenceKind,
      reason:
        "Same legal date, appended after the actual completed work event.",
      supersedesTermsId: previous.id,
      provenance,
    });
  }
  expect(resourceFlowTermsAt(world, flow.id)!.sequence).toBeGreaterThan(
    event.sequence,
  );
  expect(resourceFlowTermsAt(world, flow.id)!.amount.minorUnits).toBe(
    LATER_MINOR,
  );
  const input: RecordResourceTransferOutcomeInput = {
    stableKey: "earned:actual-payment",
    resourceFlowId: flow.id,
    periodStartsAt: date,
    periodEndsAt: date,
    occurredAt: date,
    status: "completed",
    attemptedAmount: money(EARNED_MINOR, "USD"),
    transferredAmount: money(EARNED_MINOR, "USD"),
    reasonKind: null,
    note: "Pay for the actual saved completed work session.",
    provenance: { kind: "simulated-event", eventId: event.id },
  };
  return {
    world,
    input,
    event,
    activityId: activity.id,
    flow,
    earlierTerms,
    personId,
    otherPersonId,
    work,
    otherFlowId,
    generalFlowId,
    placeKey: selected.placeKey,
  };
}
const modes = ["single", "batch"] as const;
function write(
  world: World,
  input: RecordResourceTransferOutcomeInput,
  mode: (typeof modes)[number],
) {
  return mode === "single"
    ? recordResourceTransferOutcome(world, input)
    : recordResourceTransferOutcomes(world, [input]);
}

describe("earned work keeps its actual saved terms", () => {
  it("the shared pay writer saves the actual completion provenance and cannot reprice or repay it", () => {
    const f = fixture();
    const period = {
      stableKey: "earned:shared-pay-writer",
      payFlowId: f.flow.id,
      activityId: f.work.id,
      periodStartsAt: f.event.occurredAt,
      periodEndsAt: f.event.occurredAt,
      onDate: f.event.occurredAt,
      completedShift: {
        eventId: f.event.id,
        termsId: f.earlierTerms.id,
        amount: money(EARNED_MINOR, "USD"),
      },
      provenance,
    };
    const paid = settleTownCompensations(f.world, [period]);
    const outcomes = paid.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === f.flow.id,
    );
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.attemptedAmount).toEqual(money(EARNED_MINOR, "USD"));
    expect(outcomes[0]!.transferredAmount).toEqual(money(EARNED_MINOR, "USD"));
    expect(outcomes[0]!.provenance).toEqual({
      kind: "simulated-event",
      eventId: f.event.id,
    });
    assertWorldIntegrityFully(paid);
    const saved = serializeWorld(paid);
    for (const world of [paid, deserializeWorld(saved)]) {
      expect(serializeWorld(settleTownCompensations(world, [period]))).toBe(
        saved,
      );
    }
  });

  it.each(modes)(
    "%s writer accepts earned terms and survives strict Save/Continue without paying twice",
    (mode) => {
      const f = fixture();
      const before = serializeWorld(f.world);
      const paid = write(f.world, f.input, mode);
      assertWorldIntegrityFully(paid);
      expect(serializeWorld(f.world)).toBe(before);
      const outcome = paid.history.resourceTransferOutcomes.at(-1)!;
      expect(outcome.attemptedAmount.minorUnits).toBe(EARNED_MINOR);
      expect(outcome.transferredAmount.minorUnits).toBe(EARNED_MINOR);
      expect(outcome.provenance).toEqual({
        kind: "simulated-event",
        eventId: f.event.id,
      });
      expect(
        resourcePositionAt(
          paid,
          { kind: "person", personId: f.personId },
          money(0, "USD").currency,
        )?.liquidBalance.minorUnits,
      ).toBe(EARNED_MINOR);
      const saved = serializeWorld(paid);
      const continued = deserializeWorld(saved);
      assertWorldIntegrityFully(continued);
      expect(serializeWorld(continued)).toBe(saved);
      expect(continued.history.resourceTransferOutcomes).toEqual(
        paid.history.resourceTransferOutcomes,
      );
      const priorHistory = continued.history;
      expect(() => write(continued, f.input, mode)).toThrow(/overlap|stable/i);
      expect(continued.history).toBe(priorHistory);
      expect(serializeWorld(continued)).toBe(saved);
      process.stdout.write(
        JSON.stringify({
          kind: "earned-work-payment",
          mode,
          identity: watchedIdentity(paid, f.personId, f.placeKey),
          workId: f.work.id,
          flowId: f.flow.id,
          completedEventId: f.event.id,
          completedSequence: f.event.sequence,
          earnedTermsId: f.earlierTerms.id,
          earnedMinor: EARNED_MINOR,
          laterMinor: LATER_MINOR,
          outcomeId: outcome.id,
        }) + "\n",
      );
    },
  );

  it.each(modes)(
    "%s writer rejects later-rate substitution and unauthorized lookback without mutation",
    (mode) => {
      const f = fixture();
      const before = serializeWorld(f.world);
      const unrelated = f.world.history.events.find(
        (event) =>
          event.type === "schedule.activity-completed" &&
          event.involvedEntityIds.includes(f.activityId),
      );
      if (!unrelated)
        throw new Error("Actual scheduled completion event missing");
      const invalid: RecordResourceTransferOutcomeInput[] = [
        {
          ...f.input,
          attemptedAmount: money(LATER_MINOR, "USD"),
          transferredAmount: money(LATER_MINOR, "USD"),
        },
        { ...f.input, resourceFlowId: f.otherFlowId },
        { ...f.input, resourceFlowId: f.generalFlowId },
        { ...f.input, provenance },
        {
          ...f.input,
          provenance: { kind: "simulated-event", eventId: unrelated.id },
        },
        { ...f.input, periodEndsAt: addDays(f.event.occurredAt, 1) },
      ];
      for (const input of invalid) {
        expect(() => write(f.world, input, mode)).toThrow();
        expect(serializeWorld(f.world)).toBe(before);
      }
      // Wrong-date binding is checked directly as well; it must not be hidden
      // merely by the transfer writer's independent chronology validation.
      expect(() =>
        resourceTransferTermsCutoff(
          f.world,
          f.flow,
          f.event.occurredAt,
          addDays(f.event.occurredAt, 1),
          f.input.provenance,
        ),
      ).toThrow(/bind.*completed work/i);
    },
  );

  it("batch rejects the whole attempted batch when a second payment substitutes the later rate", () => {
    const f = fixture();
    const before = serializeWorld(f.world);
    expect(() =>
      recordResourceTransferOutcomes(f.world, [
        f.input,
        {
          ...f.input,
          stableKey: "earned:bad-second",
          resourceFlowId: f.otherFlowId,
          attemptedAmount: money(LATER_MINOR, "USD"),
          transferredAmount: money(LATER_MINOR, "USD"),
        },
      ]),
    ).toThrow();
    expect(serializeWorld(f.world)).toBe(before);
  });

  it("work compensation period resolution uses the same completed-event provenance", () => {
    const f = fixture();
    const paid = resolveWorkCompensationPeriod(f.world, {
      stableKey: "earned:period-payment",
      workRelationshipId: f.work.id,
      periodStartsAt: f.event.occurredAt,
      periodEndsAt: f.event.occurredAt,
      occurredAt: f.event.occurredAt,
      status: "completed",
      reasonKind: null,
      note: "Canonical period-resolution earned payment.",
      provenance: f.input.provenance,
    });
    assertWorldIntegrityFully(paid);
    expect(
      paid.history.resourceTransferOutcomes.at(-1)!.attemptedAmount.minorUnits,
    ).toBe(EARNED_MINOR);
    expect(
      paid.history.resourceTransferOutcomes.at(-1)!.transferredAmount
        .minorUnits,
    ).toBe(EARNED_MINOR);
  });
});
