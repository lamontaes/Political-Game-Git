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
import { resourcePositionAt } from "../resource-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import {
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  recordWorldEvent,
} from "../world";
import { applyFindingConsequences } from "./finding-consequences";
import { advanceProceeding } from "./procedures";
import { appendPressRecord } from "./store";

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
      const before = {
        AS: "2e7324d18c3d4abdfe386d5f69da2c19861f04fe117896da19166a6ab6881aba",
        AR: "45a1a441aa143796209a053ccef3f4226c477e23c164d1d9a5a9e8a3feae02b4",
        AZ: "3b63f22a12172f9ff185b4fe6d03d2594d18bc7eafa5c7e20ae56855f59dc4cb",
        AK: "c4ef759eba36004bc7738ea86c760982522e6b2dcfd08a52f86baf4ad42e0cf9",
        AL: "f2263dc6b998467aa220893a87ea3a6f0df6a5bf15d1f373581a2061278a65e2",
      };
      expect(createHash("sha256").update(payload).digest("hex")).toBe(
        before[usps as keyof typeof before],
      );
    },
  );
  it.each(["missing-payer", "missing-recipient"] as const)(
    "keeps missing financial records unsupported: %s",
    (accounts) => {
      const f = fixture(places[0]!, accounts);
      const after = applyFindingConsequences(
        f.world,
        f.proceeding,
        f.step,
        f.event,
      );
      expect(after.history.organizations).toEqual(
        f.world.history.organizations,
      );
      expect(after.history.resourcePositions).toEqual(
        f.world.history.resourcePositions,
      );
      expect(after.history.resourceFlows).toEqual(
        f.world.history.resourceFlows,
      );
      expect(after.history.resourceTransferOutcomes).toEqual(
        f.world.history.resourceTransferOutcomes,
      );
      expect(
        after.history.events.filter(
          (row) => row.type === "matter.restitution-ordered",
        ),
      ).toHaveLength(0);
      assertWorldIntegrity(after);
    },
  );
});
