import { applyFindingReferral } from "./finding-referral";
import { referForProsecution } from "./prosecution";
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
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import {
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  recordWorldEvent,
} from "../world";
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
  prior = false,
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
  if (prior) {
    const priorProceeding = appendPressRecord(world, "matter-proceeding", {
      stableKey: "fixture:prior-proceeding",
      matterId: matter.record.id,
      procedureKey: proceeding.record.procedureKey,
      institutionLabel: proceeding.record.institutionLabel,
      complainantPersonId: null,
      respondentPersonIds: [person.id],
      openedAt: date,
      openingEventId: event.id,
      confidentialWhilePending: true,
      simulatedDisclosure: null,
    });
    world = priorProceeding.world;
    world = appendPressRecord(world, "proceeding-step", {
      stableKey: "fixture:prior-finding",
      proceedingId: priorProceeding.record.id,
      step: "controlled-prior-finding",
      at: date,
      eventId: event.id,
      nextDueAt: null,
      nextDueBasis: null,
      outcome: "finding",
      closes: true,
      publicStep: true,
      evidenceArtifactIds: [],
    }).world;
  }
  const step = appendPressRecord(world, "proceeding-step", {
    stableKey: "fixture:closed-step",
    proceedingId: proceeding.record.id,
    step: "controlled-current-finding",
    at: date,
    eventId: event.id,
    nextDueAt: closed ? null : addDays(date, 30),
    nextDueBasis: closed ? null : "authored",
    outcome: "finding",
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

function canonicalExpected(f: ReturnType<typeof fixture>) {
  return referForProsecution(f.world, {
    stableKey: `${f.step.stableKey}:${f.person.id}`,
    subjectPersonId: f.person.id,
    jurisdictionId: f.person.homeJurisdictionId,
    offenseKey: "campaign-funds-personal-use",
    referredBy: {
      kind: "regulator",
      label: f.proceeding.institutionLabel,
      personId: null,
    },
    basisEventIds: [f.event.id],
    evidence: "documentary",
    standingFindings: 2,
  }).world;
}

describe("A152 finding referral ownership", () => {
  // Controlled saved findings exercise the extracted boundary; they are not
  // evidence of a natural investigation or newly seated regulator.
  it.each(places)(
    "preserves the canonical repeated-finding referral in %s",
    (usps) => {
      const f = fixture(usps, "both", true, true);
      const after = applyFindingReferral(
        f.world,
        f.proceeding,
        f.person.id,
        f.step,
        f.event,
      );
      expect(serializeWorld(after)).toBe(serializeWorld(canonicalExpected(f)));
      expect(after.history.events).toHaveLength(
        f.world.history.events.length + 1,
      );
      const referral = after.history.events.at(-1)!;
      expect(referral.summary).toContain(personName(f.person));
      expect(referral.tags).toContain(`justice.basis-event:${f.event.id}`);
      expect(referral.tags).toContain("justice.standing-findings:2");
      assertWorldIntegrity(after);
      const loaded = deserializeWorld(serializeWorld(after));
      expect(
        applyFindingReferral(
          loaded,
          f.proceeding,
          f.person.id,
          f.step,
          f.event,
        ),
      ).toBe(loaded);
    },
  );
  it.each(places)(
    "leaves a first undenied finding without referral in %s",
    (usps) => {
      const f = fixture(usps);
      expect(
        applyFindingReferral(
          f.world,
          f.proceeding,
          f.person.id,
          f.step,
          f.event,
        ),
      ).toBe(f.world);
    },
  );
  it("does not create a prosecution referral from the press-only entrypoint", () => {
    const f = fixture(places[0]!, "both", true, true);
    const after = applyPressConsequences(
      f.world,
      f.proceeding,
      f.step,
      f.event,
    );
    expect(after.history.events).toBe(f.world.history.events);
    expect(serializeWorld(after)).toBe(serializeWorld(f.world));
  });
  it("uses the supplied canonical referral once in the existing consequence slot", () => {
    const f = fixture(places[0]!, "both", true, true);
    const after = applyPressConsequences(
      f.world,
      f.proceeding,
      f.step,
      f.event,
      undefined,
      applyFindingReferral,
    );
    expect(serializeWorld(after)).toBe(serializeWorld(canonicalExpected(f)));
    const loaded = deserializeWorld(serializeWorld(after));
    const repeated = applyPressConsequences(
      loaded,
      f.proceeding,
      f.step,
      f.event,
      undefined,
      applyFindingReferral,
    );
    expect(serializeWorld(repeated)).toBe(serializeWorld(loaded));
  });
});
