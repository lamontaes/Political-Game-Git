import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { createOrganization } from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson } from "../people";
import {
  createResourceFlow,
  createResourcePosition,
  makeCurrencyCode,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { outstandingDebtAt, resourcePositionAt } from "../resource-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import {
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  recordWorldEvent,
} from "../world";
import { applyFindingConsequences as applyPressConsequences } from "./finding-consequences";
import { applyFindingRestitution } from "../governing/finding-restitution";
import { advanceProceeding } from "./procedures";
import { appendPressRecord } from "./store";

// Controlled institutional invocation retains every original assertion.
const applyFindingConsequences = (
  ...args: Parameters<typeof applyPressConsequences>
) =>
  applyPressConsequences(
    args[0],
    args[1],
    args[2],
    args[3],
    applyFindingRestitution,
  );

const USD = makeCurrencyCode("USD");
const seed = "team8-n3-finding-replay-all56";
const places = Object.keys(STATES)
  .sort((a, b) =>
    createStableId("decision", `${seed}:${a}`).localeCompare(
      createStableId("decision", `${seed}:${b}`),
    ),
  )
  .slice(0, 5);
function fixture(
  usps: string,
  accounts: "both" | "missing-payer" | "missing-recipient" = "both",
) {
  const state = stateJurisdictionForKey(`US-${usps}`)!;
  const date = makeIsoDate("2026-01-05");
  const person = createLightweightPerson({
    worldId: createWorldId(`${seed}:${usps}`),
    worldSeed: `${seed}:${usps}`,
    index: 0,
    currentDate: date,
    homeJurisdictionId: state.id,
  });
  let world = createWorld({
    seed: `${seed}:${usps}`,
    currentDate: date,
    jurisdictions: [state],
    people: [person],
  });
  world = createOrganization(world, {
    stableKey: "fixture:committee",
    formedAt: date,
    provenance: {
      kind: "authored",
      note: "Controlled actual committee record.",
    },
    initialProfile: {
      name: "Recorded fixture committee",
      classification: "custom:campaign-committee",
      locationJurisdictionId: state.id,
    },
  });
  const committee = world.history.organizations.at(-1)!;
  let government: (typeof world.history.organizations)[number] | undefined;
  if (accounts !== "missing-recipient") {
    world = createOrganization(world, {
      stableKey: "public-government:united-states:treasury",
      formedAt: date,
      provenance: {
        kind: "authored",
        note: "Controlled existing recipient, not generated treasury cash.",
      },
      initialProfile: {
        name: "United States Treasury",
        classification: "sector:government",
        locationJurisdictionId: null,
      },
    });
    government = world.history.organizations.at(-1)!;
  }
  if (accounts !== "missing-payer")
    world = createResourcePosition(world, {
      stableKey: "fixture:payer-cash",
      owner: { kind: "person", personId: person.id },
      openedAt: date,
      openingBalance: money(50_000, USD),
      provenance: { kind: "authored", note: "Explicit test cash." },
    });
  if (government)
    world = createResourcePosition(world, {
      stableKey: "fixture:recipient-cash",
      owner: { kind: "organization", organizationId: government.id },
      openedAt: date,
      openingBalance: money(0, USD),
      provenance: { kind: "authored", note: "Explicit test recipient cash." },
    });
  const eventInput = {
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: state.id,
    involvedEntityIds: [person.id, committee.id],
    participants: [
      {
        personId: person.id,
        role: "agency:actor" as const,
        detail: "Controlled saved occurrence.",
      },
    ],
    personFactConstraints: [],
    tags: ["fixture:explicit-case"],
    summary: "Controlled saved case evidence.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  };
  world = recordWorldEvent(world, {
    ...eventInput,
    stableKey: "fixture:occurrence-event",
    type: "fixture.recorded-misuse",
    visibility: "private",
  });
  const occurrenceEvent = world.history.events.at(-1)!;
  const flows = [];
  for (const [key, amount, completed] of [
    ["linked", 25_000, true],
    ["blocked", 5_000, false],
    ["unlinked", 10_000, true],
  ] as const) {
    world = createResourceFlow(world, {
      stableKey: `fixture:${key}`,
      source: { kind: "organization", organizationId: committee.id },
      recipient: { kind: "person", personId: person.id },
      startsAt: date,
      amount: money(amount, USD),
      cadenceKind: "schedule:one-time",
      basisKind: "custom:recorded-campaign-payment",
      basisReference: { kind: "general" },
      jurisdictionId: state.id,
      restrictionKind: null,
      provenance: { kind: "simulated-event", eventId: occurrenceEvent.id },
    });
    const flow = world.history.resourceFlows.at(-1)!;
    world = recordResourceTransferOutcome(world, {
      stableKey: `fixture:${key}:outcome`,
      resourceFlowId: flow.id,
      periodStartsAt: date,
      periodEndsAt: date,
      occurredAt: date,
      status: completed ? "completed" : "blocked",
      attemptedAmount: money(amount, USD),
      transferredAmount: money(completed ? amount : 0, USD),
      reasonKind: completed ? null : "capacity:fixture-unavailable",
      note: "Actual controlled saved payment evidence.",
      provenance: { kind: "simulated-event", eventId: occurrenceEvent.id },
    });
    flows.push(flow);
  }
  const occurrence = appendPressRecord(world, "financial-occurrence", {
    stableKey: "fixture:misuse",
    family: "M1",
    actorPersonIds: [person.id],
    occurrenceEventId: occurrenceEvent.id,
    resourceFlowIds: [flows[0]!.id, flows[1]!.id],
    recordEvidenceArtifactIds: [],
    dutyReference: null,
    intentional: false,
    occurredAt: date,
    jurisdictionId: state.id,
  });
  world = occurrence.world;
  world = appendPressRecord(world, "financial-occurrence", {
    stableKey: "fixture:other-payment",
    family: "M1",
    actorPersonIds: [person.id],
    occurrenceEventId: occurrenceEvent.id,
    resourceFlowIds: [flows[2]!.id],
    recordEvidenceArtifactIds: [],
    dutyReference: null,
    intentional: false,
    occurredAt: date,
    jurisdictionId: state.id,
  }).world;
  world = recordWorldEvent(world, {
    ...eventInput,
    stableKey: "fixture:public-case",
    type: "fixture.public-case",
    visibility: "public",
  });
  const event = world.history.events.at(-1)!;
  const matter = appendPressRecord(world, "matter", {
    stableKey: "fixture:matter",
    family: "M1",
    subjectPersonIds: [person.id],
    occurrenceId: occurrence.record.id,
    openedAt: date,
    originEventId: event.id,
    jurisdictionId: state.id,
  });
  world = matter.world;
  const proceeding = appendPressRecord(world, "matter-proceeding", {
    stableKey: "fixture:proceeding",
    matterId: matter.record.id,
    procedureKey: "fec-enforcement",
    institutionLabel: "Federal Election Commission",
    complainantPersonId: null,
    respondentPersonIds: [person.id],
    openedAt: date,
    openingEventId: event.id,
    confidentialWhilePending: true,
    simulatedDisclosure: null,
  });
  world = proceeding.world;
  const step = appendPressRecord(world, "proceeding-step", {
    stableKey: "fixture:closed-step",
    proceedingId: proceeding.record.id,
    step: "conciliation",
    at: date,
    eventId: event.id,
    nextDueAt: null,
    nextDueBasis: null,
    outcome: "conciliation",
    closes: true,
    publicStep: true,
    evidenceArtifactIds: [],
  });
  world = step.world;
  assertWorldIntegrity(world);
  return {
    world,
    person,
    government,
    proceeding: proceeding.record,
    step: step.record,
    event,
  };
}
describe("finding consequences use saved payments and authoritative closed guard", () => {
  it.each(places)(
    "preserves linked actual restitution and closed replay in %s",
    (usps) => {
      const f = fixture(usps);
      const after = applyFindingConsequences(
        f.world,
        f.proceeding,
        f.step,
        f.event,
      );
      assertWorldIntegrity(after);
      const restitution = after.history.resourceFlows.filter(
        (row) => row.basisKind === "custom:ethics-restitution",
      );
      expect(restitution).toHaveLength(1);
      const flow = restitution[0]!;
      expect(flow.source).toEqual({ kind: "person", personId: f.person.id });
      expect(flow.recipient).toEqual({
        kind: "organization",
        organizationId: f.government!.id,
      });
      const outcome = after.history.resourceTransferOutcomes.find(
        (row) => row.resourceFlowId === flow.id,
      )!;
      expect(outcome).toMatchObject({
        status: "completed",
        transferredAmount: money(25_000, USD),
      });
      expect(
        resourcePositionAt(
          after,
          { kind: "person", personId: f.person.id },
          USD,
        )?.liquidBalance.minorUnits,
      ).toBe(60_000);
      expect(
        resourcePositionAt(
          after,
          { kind: "organization", organizationId: f.government!.id },
          USD,
        )?.liquidBalance.minorUnits,
      ).toBe(25_000);
      const payload = serializeWorld(after);
      expect(advanceProceeding(after, f.proceeding.id)).toEqual({
        world: after,
        step: null,
      });
      const loaded = deserializeWorld(payload);
      expect(advanceProceeding(loaded, f.proceeding.id).world).toBe(loaded);
      expect(serializeWorld(loaded)).toBe(payload);
      // Baseline #1409 and extracted writer have identical full saves on main b84750d91.
      const before = {
        AS: "0ca48563fdbba300e79542d10a25a660aa97a1ddab3de0477e8eaef2e37b82c3",
        AR: "f08652c3731d8eefb7dfbd7d798b5e88a4b157c70e134abd7975b5223b2fb26e",
        AZ: "a01362c1829b7119cb27ce58216174cf1004af1d44c24f4aab2f62fc3dfb706d",
        AK: "00d4623b2faae28169f2b04b6bf05aff911ec3da4bbeea78004f3635ef74a920",
        AL: "c5165e2e626ed40e9bc62df9e88d9c696931def1b75be3dfbf20aa5cc71465d2",
      };
      expect(createHash("sha256").update(payload).digest("hex")).toBe(
        before[usps as keyof typeof before],
      );
    },
  );
  it("keeps a missing actual creditor unsupported", () => {
    const f = fixture(places[0]!, "missing-recipient");
    const after = applyFindingConsequences(
      f.world,
      f.proceeding,
      f.step,
      f.event,
    );
    expect(after.history.organizations).toEqual(f.world.history.organizations);
    expect(after.history.resourcePositions).toEqual(
      f.world.history.resourcePositions,
    );
    expect(after.history.resourceFlows).toEqual(f.world.history.resourceFlows);
    expect(after.history.resourceTransferOutcomes).toEqual(
      f.world.history.resourceTransferOutcomes,
    );
    expect(
      after.history.events.filter(
        (row) => row.type === "matter.restitution-ordered",
      ),
    ).toHaveLength(0);
    assertWorldIntegrity(after);
  });
  it.each(["missing", "insufficient"] as const)(
    "retains the adjudicated obligation when payer cash is %s",
    (cash) => {
      const f = fixture(places[0]!, "missing-payer");
      let before = f.world;
      if (cash === "insufficient")
        before = createResourcePosition(before, {
          stableKey: "fixture:known-empty-cash",
          owner: { kind: "person", personId: f.person.id },
          openedAt: before.currentDate,
          openingBalance: money(0, USD),
          provenance: {
            kind: "authored",
            note: "Explicit controlled cash record.",
          },
        });
      const after = applyFindingConsequences(
        before,
        f.proceeding,
        f.step,
        f.event,
      );
      const flows = after.history.resourceFlows.filter(
        (row) => row.basisKind === "custom:ethics-restitution",
      );
      expect(flows).toHaveLength(1);
      const flow = flows[0]!;
      expect(flow.source).toEqual({ kind: "person", personId: f.person.id });
      expect(flow.recipient).toEqual({
        kind: "organization",
        organizationId: f.government!.id,
      });
      const obligations = after.history.resourceObligations.filter(
        (row) => row.resourceFlowId === flow.id,
      );
      expect(obligations).toHaveLength(1);
      const obligation = obligations[0]!;
      expect(obligation.principal).toEqual(money(25_000, USD));
      expect(outstandingDebtAt(after, obligation.id)).toEqual(
        money(25_000, USD),
      );
      const order = after.history.events.find(
        (row) => row.type === "matter.restitution-ordered",
      )!;
      expect(obligation.provenance).toEqual({
        kind: "simulated-event",
        eventId: order.id,
      });
      expect(order.summary).toContain("the debt stands unpaid");
      expect(order.summary).not.toContain("did not have it");
      const outcomes = after.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === flow.id,
      );
      expect(outcomes).toHaveLength(cash === "missing" ? 0 : 1);
      if (cash === "insufficient")
        expect(outcomes[0]).toMatchObject({
          status: "blocked",
          transferredAmount: money(0, USD),
        });
      expect(after.history.resourcePositions).toEqual(
        before.history.resourcePositions,
      );
      expect(after.history.organizations).toEqual(before.history.organizations);
      assertWorldIntegrity(after);
      const loaded = deserializeWorld(serializeWorld(after));
      expect(outstandingDebtAt(loaded, obligation.id)).toEqual(
        money(25_000, USD),
      );
      expect(advanceProceeding(loaded, f.proceeding.id).world).toBe(loaded);
      expect(serializeWorld(loaded)).toBe(serializeWorld(after));
    },
  );
  it.each([10_000, 25_000])(
    "reduces only the same outstanding obligation by the recorded later payment of %s cents",
    (paid) => {
      const f = fixture(places[0]!, "missing-payer");
      let world = applyFindingConsequences(
        f.world,
        f.proceeding,
        f.step,
        f.event,
      );
      const flow = world.history.resourceFlows.find(
        (row) => row.basisKind === "custom:ethics-restitution",
      )!;
      const obligation = world.history.resourceObligations.find(
        (row) => row.resourceFlowId === flow.id,
      )!;
      const order = world.history.events.find(
        (row) => row.type === "matter.restitution-ordered",
      )!;
      world = createResourcePosition(world, {
        stableKey: "fixture:subsequently-recorded-cash",
        owner: { kind: "person", personId: f.person.id },
        openedAt: world.currentDate,
        openingBalance: money(25_000, USD),
        provenance: {
          kind: "authored",
          note: "Explicit controlled subsequently recorded cash, not inferred from liability.",
        },
      });
      world = recordResourceTransferOutcome(world, {
        stableKey: "fixture:subsequent-order-payment",
        resourceFlowId: flow.id,
        periodStartsAt: world.currentDate,
        periodEndsAt: world.currentDate,
        occurredAt: world.currentDate,
        attemptedAmount: money(25_000, USD),
        transferredAmount: money(paid, USD),
        status: paid === 25_000 ? "completed" : "partial",
        reasonKind: paid === 25_000 ? null : "capacity:fixture-partial-payment",
        note: "Actual controlled payment against the original order.",
        provenance: { kind: "simulated-event", eventId: order.id },
      });
      expect(outstandingDebtAt(world, obligation.id)).toEqual(
        money(25_000 - paid, USD),
      );
      expect(
        resourcePositionAt(
          world,
          { kind: "person", personId: f.person.id },
          USD,
        )?.liquidBalance,
      ).toEqual(money(25_000 - paid, USD));
      expect(
        resourcePositionAt(
          world,
          { kind: "organization", organizationId: f.government!.id },
          USD,
        )?.liquidBalance,
      ).toEqual(money(paid, USD));
      expect(
        world.history.resourceObligations.filter(
          (row) => row.resourceFlowId === flow.id,
        ),
      ).toHaveLength(1);
      assertWorldIntegrity(world);
      const loaded = deserializeWorld(serializeWorld(world));
      expect(outstandingDebtAt(loaded, obligation.id)).toEqual(
        money(25_000 - paid, USD),
      );
      expect(advanceProceeding(loaded, f.proceeding.id).world).toBe(loaded);
    },
  );
});
