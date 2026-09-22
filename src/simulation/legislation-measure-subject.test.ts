import { describe, expect, it } from "vitest";

import {
  KENTUCKY_CONTEXT,
  assertWorldIntegrity,
  createLegislativeScenario,
  createPolicyDomainDefinition,
  createPolicyIssueDefinition,
  createPolicyPropositionDefinition,
  introduceMeasure,
  measurePropositions,
} from "./index";
import type { EntityId, World } from "./index";

const JURISDICTION = KENTUCKY_CONTEXT.jurisdiction.id;

/** The measure a stable key names, as `legislation.test.ts` reads one. */
function measureByKey(world: World, stableKey: string) {
  const record = (world.history.legislativeMeasures ?? []).find(
    (candidate) => candidate.stableKey === stableKey,
  );
  expect(record, `measure ${stableKey}`).toBeDefined();
  return record!;
}

/**
 * A world whose catalogue holds one question, which is what a loaded policy
 * pack will put there. Spliced rather than loaded, because what is under test
 * is the measure's link and not the loader.
 */
function withOneProposition(world: World): {
  readonly world: World;
  readonly propositionId: EntityId;
} {
  const domain = createPolicyDomainDefinition(
    "test:transport",
    "Transport",
    "How people move.",
  );
  const issue = createPolicyIssueDefinition(
    "test:rural-transit",
    domain.id,
    "Rural transit",
    "Service where density does not pay for it.",
  );
  const proposition = createPolicyPropositionDefinition(
    "test:fund-rural-transit",
    issue.id,
    "Fund rural transit",
    "Should the state pay for bus service where fares cannot?",
  );
  return {
    world: {
      ...world,
      policyCatalog: {
        ...world.policyCatalog,
        domains: { ...world.policyCatalog.domains, [domain.id]: domain },
        domainOrder: [...world.policyCatalog.domainOrder, domain.id],
        issues: { ...world.policyCatalog.issues, [issue.id]: issue },
        issueOrder: [...world.policyCatalog.issueOrder, issue.id],
        propositions: {
          ...world.policyCatalog.propositions,
          [proposition.id]: proposition,
        },
        propositionOrder: [
          ...world.policyCatalog.propositionOrder,
          proposition.id,
        ],
      },
    },
    propositionId: proposition.id,
  };
}

function introduce(
  world: World,
  stableKey: string,
  propositionIds?: readonly EntityId[],
): World {
  return introduceMeasure(world, {
    stableKey,
    jurisdictionId: JURISDICTION,
    rulePackId: "us-ky-general-assembly-v1",
    designation: stableKey,
    shortTitle: "A measure about something",
    summary: "Written to exercise what a bill says it is about.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    propositionIds,
  });
}

describe("what a bill says it is about", () => {
  it("says nothing, for a bill nobody linked", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = introduce(scenario.world, "unlinked");
    expect(
      measurePropositions(world, measureByKey(world, "unlinked").id),
    ).toEqual([]);
  });

  it("names the question, for a bill that was linked", () => {
    const scenario = createLegislativeScenario("kentucky");
    const { world: base, propositionId } = withOneProposition(scenario.world);
    const world = introduce(base, "linked", [propositionId]);
    const about = measurePropositions(world, measureByKey(world, "linked").id);
    expect(about.map((p) => p.name)).toEqual(["Fund rural transit"]);
  });

  it("refuses a question this world's catalogue does not hold", () => {
    const scenario = createLegislativeScenario("kentucky");
    expect(() =>
      introduce(scenario.world, "invented", [
        "proposition_nonexistent" as EntityId,
      ]),
    ).toThrow(/does not hold/);
  });

  it("keeps a linked measure passing world integrity", () => {
    const scenario = createLegislativeScenario("kentucky");
    const { world: base, propositionId } = withOneProposition(scenario.world);
    const world = introduce(base, "checked", [propositionId]);
    expect(() => assertWorldIntegrity(world)).not.toThrow();
  });

  it("reads a save written before measures could say as saying nothing", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = introduce(scenario.world, "older");
    const measureId = measureByKey(world, "older").id;
    // The shape of an older snapshot: the field is simply absent, which is
    // what every measure in every save written so far looks like.
    const older: World = {
      ...world,
      history: {
        ...world.history,
        legislativeMeasures: (world.history.legislativeMeasures ?? []).map(
          (measure) => {
            const rest: Record<string, unknown> = { ...measure };
            delete rest.propositionIds;
            return rest as unknown as typeof measure;
          },
        ),
      },
    };
    expect(measurePropositions(older, measureId)).toEqual([]);
    expect(() => assertWorldIntegrity(older)).not.toThrow();
  });
});
