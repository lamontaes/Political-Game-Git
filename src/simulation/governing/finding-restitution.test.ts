import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { createStableId } from "../ids";
import { createOrganization } from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson, personName } from "../people";
import {
  createResourceFlow,
  createResourcePosition,
  makeCurrencyCode,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { outstandingDebtAt, resourceFlowTermsAt } from "../resource-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import {
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  recordWorldEvent,
} from "../world";
import { applyFindingRestitution } from "./finding-restitution";
import { advanceProceeding } from "../press/procedures";
import { appendPressRecord } from "../press/store";
import { applyFindingConsequences as applyPressConsequences } from "../press/finding-consequences";

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
  closed = true,
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
    nextDueAt: closed ? null : addDays(date, 30),
    nextDueBasis: closed ? null : "authored",
    outcome: "conciliation",
    closes: closed,
    publicStep: closed,
    evidenceArtifactIds: [],
  });
  world = step.world;
  if (!closed) {
    const currentDate = addDays(date, 30);
    world = {
      ...world,
      currentDate,
      currentMoment: simulationMomentOnLocalDate(
        world.currentMoment,
        currentDate,
      ),
    };
  }
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
describe("A152 mechanically extracted adjudicated restitution", () => {
  it("does not issue a restitution order from the press-only entrypoint", () => {
    const f = fixture(places[0]!);
    const after = applyPressConsequences(
      f.world,
      f.proceeding,
      f.step,
      f.event,
    );
    expect(
      after.history.events.filter(
        (row) => row.type === "matter.restitution-ordered",
      ),
    ).toHaveLength(0);
    expect(after.history.resourceFlows).toBe(f.world.history.resourceFlows);
    expect(after.history.resourceTransferOutcomes).toBe(
      f.world.history.resourceTransferOutcomes,
    );
    expect(after.history.resourceObligations).toBe(
      f.world.history.resourceObligations,
    );
  });
  it.each(["both", "missing-payer", "missing-recipient"] as const)(
    "uses the saved institutional path once with %s",
    (accounts) => {
      const f = fixture(places[0]!, accounts, false);
      expect(personName(f.person)).toBe("Reese Shaffer");
      const result = advanceProceeding(f.world, f.proceeding.id);
      expect(result.step?.step).toBe("file-released");
      expect(result.step?.closes).toBe(true);
      const after = result.world;
      const orders = after.history.events.filter(
        (row) => row.type === "matter.restitution-ordered",
      );
      expect(orders).toHaveLength(accounts === "missing-recipient" ? 0 : 1);
      if (orders.length) {
        expect(orders[0]!.sequence).toBeGreaterThan(result.step!.sequence);
        expect(orders[0]!.summary).toContain(personName(f.person));
        const flow = after.history.resourceFlows.find(
          (row) => row.basisKind === "custom:ethics-restitution",
        )!;
        expect(flow.source).toEqual({ kind: "person", personId: f.person.id });
        expect(flow.recipient).toEqual({
          kind: "organization",
          organizationId: f.government!.id,
        });
        expect(resourceFlowTermsAt(after, flow.id)!.amount).toEqual(
          money(25000, USD),
        );
        process.stdout.write(
          "A152 institutional receipt " +
            JSON.stringify({
              personId: f.person.id,
              name: personName(f.person),
              proceedingId: f.proceeding.id,
              stepId: result.step!.id,
              orderEventId: orders[0]!.id,
              flowId: flow.id,
              accounts,
            }) +
            "\n",
        );
        if (accounts === "missing-payer") {
          expect(after.history.resourcePositions).toBe(
            f.world.history.resourcePositions,
          );
          expect(after.history.resourceTransferOutcomes).toBe(
            f.world.history.resourceTransferOutcomes,
          );
          const obligation = after.history.resourceObligations.find(
            (row) => row.resourceFlowId === flow.id,
          )!;
          expect(outstandingDebtAt(after, obligation.id)!.minorUnits).toBe(
            25000,
          );
        } else {
          expect(
            after.history.resourceTransferOutcomes.filter(
              (row) => row.resourceFlowId === flow.id,
            ),
          ).toHaveLength(1);
        }
      }
      assertWorldIntegrity(after);
      const loaded = deserializeWorld(serializeWorld(after));
      expect(advanceProceeding(loaded, f.proceeding.id).world).toBe(loaded);
    },
  );
  it.each(places)(
    "retains the existing full-save restitution result in %s",
    (usps) => {
      const f = fixture(usps);
      const after = applyFindingRestitution(
        f.world,
        f.proceeding,
        f.person.id,
        f.step,
      );
      assertWorldIntegrity(after);
      const expected = {
        AS: "2e7324d18c3d4abdfe386d5f69da2c19861f04fe117896da19166a6ab6881aba",
        AR: "45a1a441aa143796209a053ccef3f4226c477e23c164d1d9a5a9e8a3feae02b4",
        AZ: "3b63f22a12172f9ff185b4fe6d03d2594d18bc7eafa5c7e20ae56855f59dc4cb",
        AK: "c4ef759eba36004bc7738ea86c760982522e6b2dcfd08a52f86baf4ad42e0cf9",
        AL: "f2263dc6b998467aa220893a87ea3a6f0df6a5bf15d1f373581a2061278a65e2",
      };
      const payload = serializeWorld(after);
      expect(createHash("sha256").update(payload).digest("hex")).toBe(
        expected[usps as keyof typeof expected],
      );
      const loaded = deserializeWorld(payload);
      expect(serializeWorld(loaded)).toBe(payload);
      // Replay safety remains the authoritative proceeding guard, not a new payment guard.
      expect(advanceProceeding(loaded, f.proceeding.id).world).toBe(loaded);
    },
  );
  it("retains actual liability without inventing missing payer cash", () => {
    const f = fixture(places[0]!, "missing-payer");
    const after = applyFindingRestitution(
      f.world,
      f.proceeding,
      f.person.id,
      f.step,
    );
    expect(after.history.resourcePositions).toBe(
      f.world.history.resourcePositions,
    );
    expect(after.history.resourceTransferOutcomes).toBe(
      f.world.history.resourceTransferOutcomes,
    );
    const flow = after.history.resourceFlows.find(
      (row) => row.basisKind === "custom:ethics-restitution",
    )!;
    expect(flow.source).toEqual({ kind: "person", personId: f.person.id });
    expect(flow.recipient).toEqual({
      kind: "organization",
      organizationId: f.government!.id,
    });
    const obligation = after.history.resourceObligations.find(
      (row) => row.resourceFlowId === flow.id,
    )!;
    expect(outstandingDebtAt(after, obligation.id)!.minorUnits).toBe(25000);
    assertWorldIntegrity(deserializeWorld(serializeWorld(after)));
  });
  it("does not create a missing creditor or payment authority", () => {
    const f = fixture(places[0]!, "missing-recipient");
    expect(
      applyFindingRestitution(f.world, f.proceeding, f.person.id, f.step),
    ).toBe(f.world);
  });
});
