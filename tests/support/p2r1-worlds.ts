import {
  createWorkItem,
  createDemoWorld,
  recordKinship,
  createDwelling,
  createHousingTenure,
  createResourceFlow,
  createResourceObligation,
  money,
  createWorld,
  createIncidentCatalog,
  createIncidentDefinition,
  createExactQuantity,
  evaluateIncident,
  occurIncident,
} from "../../src/simulation";

const authored = {
  kind: "authored" as const,
  note: "P2R1 minimal premise fixture",
};
export function fixture() {
  let world = createDemoWorld("p2r1-minimal-premises");
  const personId = world.personOrder[1]!;
  world = recordKinship(world, {
    stableKey: "p2r1:kin",
    personIds: [personId, world.personOrder[3]!],
    establishedAt: world.currentDate,
    kind: "collateral:sibling",
    provenance: authored,
  });
  for (const stableKey of [
    "ordinary-life:household-errands",
    "ordinary-life:public-meeting",
  ]) {
    world = createWorkItem(world, {
      stableKey,
      title:
        stableKey === "ordinary-life:household-errands"
          ? "The week's errands"
          : "Whether to go to the meeting",
      summary:
        stableKey === "ordinary-life:household-errands"
          ? "The shopping and the two appointments after it still have to be covered by somebody."
          : "The agenda is posted.",
      jurisdictionId: world.jurisdictionOrder[0]!,
      sourceEntityIds: [world.history.events[0]!.id],
      focus: { kind: "person", personId },
      effort: { kind: "authored-duration", requiredMinutes: 150 },
      access: { kind: "private", personIds: [personId] },
      assignedPersonIds: [personId],
      playerRequirement: "none",
      waitingOnPersonIds: [],
      blocker: null,
      scheduledActivityId: null,
    });
  }
  return { world, personId };
}
export function housingFixture() {
  const base = fixture();
  let world = base.world;
  const { personId } = base;
  world = createDwelling(world, {
    stableKey: "p2r1:dwelling",
    establishedAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0]!,
    locationLabel: "Fixture residence",
    classification: "residential:apartment",
    provenance: authored,
  });
  world = createHousingTenure(world, {
    stableKey: "p2r1:tenure",
    holder: { kind: "person", personId },
    dwellingId: world.history.dwellings.at(-1)!.id,
    startedAt: world.currentDate,
    kind: "lease:residential",
    context: "One unchanged lease",
    provenance: authored,
  });
  world = createResourceFlow(world, {
    stableKey: "p2r1:rent",
    source: { kind: "person", personId },
    recipient: { kind: "person", personId: world.personOrder[2]! },
    startsAt: world.currentDate,
    amount: money(60000, "USD"),
    cadenceKind: "schedule:monthly",
    basisKind: "housing:rent",
    basisReference: { kind: "general" },
    restrictionKind: "purpose:housing",
    jurisdictionId: world.jurisdictionOrder[0]!,
    provenance: authored,
  });
  world = createResourceObligation(world, {
    stableKey: "p2r1:obligation",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    establishedAt: world.currentDate,
    basisKind: "housing:rent",
    principal: null,
    careResponsibilityId: null,
    housingTenureId: world.history.housingTenures.at(-1)!.id,
    provenance: authored,
  });
  return { world, personId };
}
export function incidentFixture() {
  const template = createDemoWorld("p2r1-active-incident");
  const hazard = createIncidentDefinition({
    stableKey: "incident.p2r1",
    label: "Fixture incident",
    description: "No recovery or personal knowledge recorded",
    incidentKind: "incident:natural-hazard",
    occurrenceMode: "probabilistic",
    baseLikelihood: createExactQuantity(1, 1, "rate:share"),
    prerequisites: [],
    blockers: [],
    likelihoodModifiers: [],
    tags: [],
  });
  let world = createWorld({
    seed: "p2r1-active-incident",
    currentDate: template.currentDate,
    jurisdictions: template.jurisdictionOrder.map(
      (id) => template.jurisdictions[id]!,
    ),
    people: template.personOrder.map((id) => template.people[id]!),
    incidentCatalog: createIncidentCatalog({ definitions: [hazard] }),
  });
  const evaluation = evaluateIncident(world, {
    definitionId: hazard.id,
    evaluationKey: "p2r1:incident-evaluation",
    scope: { jurisdictionId: world.jurisdictionOrder[0]!, segmentKey: null },
    evaluatedAt: world.currentDate,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    exposure: createExactQuantity(1, 1, "rate:share"),
    vulnerability: createExactQuantity(1, 1, "rate:share"),
    resilience: createExactQuantity(0, 1, "rate:share"),
    consequences: [],
  });
  world = occurIncident(world, {
    stableKey: "p2r1:incident",
    evaluation,
    summary: "An incident started.",
    visibility: "public",
  });
  return { world, personId: world.personOrder[0]! };
}
