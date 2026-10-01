import { beforeAll, describe, expect, it } from "vitest";
import { createWorld, assertWorldIntegrity } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  createLegislativeScenario,
  type LegislativeScenario,
} from "../legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
} from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { stateJurisdictionForKey } from "../life-places";
import { createFormationContext, recordPrinciples } from "../politics";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  budgetCandidates,
  openGovernmentBudget,
} from "../public-budgets/opening";
import { PUBLIC_BUDGETS_VERSION } from "../public-budgets/store";

import {
  readFinalEnactedLawTerm,
  sponsorRequestedLawTerm,
  recordSponsorRequestedLawTerm,
  type SponsorLawTermRequest,
} from "./automatic-legislation";
import { lawInForce } from "./law-in-force";
import type { EntityId, World } from "../types";

// Every numeric value and vote here is a fictional fixture input, not a legal estimate.
const questionKey =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";
const termKey = "covered-offense-minimum-months";
let scenario: LegislativeScenario;
let world: World;
let baselineId: EntityId;
let requestId: EntityId;
let questionId: EntityId;
let jurisdictionId: EntityId;

function file(
  start: World,
  key: string,
  value?: number,
): { world: World; measureId: EntityId } {
  let next = introduceMeasure(start, {
    stableKey: key,
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: `HB ${1 + (start.history.legislativeMeasures?.length ?? 0)}`,
    shortTitle: "Controlled covered-offense rule",
    summary: "A fictional numeric term used to test the lawmaking mechanism.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: scenario.playerPersonId,
    originChamberKey: "house",
    propositionIds: [questionId],
    propositionAnswers: [{ propositionId: questionId, answer: "yes" }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  if (value !== undefined)
    next = recordFiledProvision(next, {
      stableKey: `${key}:term`,
      measureId,
      provisionKey: "covered-offense-term",
      sectionNumber: 1,
      heading: "Covered-offense minimum",
      text: `For the fictional covered offense the minimum is ${value} months.`,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "the fictional covered offense",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
      lawTerms: [{ questionKey, key: termKey, value, unit: "months" }],
    });
  return { world: next, measureId };
}

function enact(start: World, measureId: EntityId): World {
  let next = start;
  const context = {
    ...scenario,
    measureId,
    governorAction: "signed" as const,
    governorRationale: "Explicit favorable decision in a controlled test.",
  };
  for (let guard = 0; guard < 40; guard += 1) {
    if (measurePosition(next, measureId).phase === "awaiting-enactment")
      return recordEnactment(next, {
        stableKey: `${measureId}:law`,
        measureId,
        effectiveAt: next.currentDate,
      });
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `No canonical next step at ${measurePosition(next, measureId).phase}`,
      );
    next = applyLegislativeStep(context, next, step).world;
  }
  throw new Error("Controlled bill did not reach enactment.");
}

function strength(start: World, amount: number, oppose = false): World {
  return recordPrinciples(
    start,
    world.policyCatalog.propositions[questionId]!.principles!.map(
      (bearing) => ({
        stableKey: `term-proof:${amount}:${oppose}:${bearing.principleId}`,
        personId: scenario.playerPersonId,
        principleId: bearing.principleId,
        formedAt: start.currentDate,
        stance:
          (bearing.bearing === "consistent-with") !== oppose
            ? "endorses"
            : "rejects",
        strength: amount,
        conviction: "settled",
        flexibility: "firm",
        qualification: null,
        formation: createFormationContext("experience:life", {
          note: "Explicit saved principle inputs in the controlled request test.",
        }),
        supersedesPrincipleRecordId: null,
      }),
    ),
  );
}
function request(measureId = requestId): SponsorLawTermRequest {
  return {
    measureId,
    questionKey,
    termKey,
    unit: "months",
    supportDirection: "raise",
    basis: "term",
  };
}
function writerInput(measureId = requestId) {
  return {
    ...request(measureId),
    provision: {
      stableKey: `${measureId}:requested-rule`,
      provisionKey: "requested-rule",
      sectionNumber: 1,
      heading: "Requested covered-offense minimum",
      beneficiary: {
        kind: "general-application" as const,
        appliesToLabel: "the fictional covered offense",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
    },
    renderText: (term: { value: number }) =>
      `For the fictional covered offense the minimum is ${term.value} months.`,
  };
}

beforeAll(() => {
  scenario = createLegislativeScenario("kentucky");
  const state = stateJurisdictionForKey("US-KY")!;
  jurisdictionId = state.id;
  const catalog = createProductionPolicyCatalog();
  questionId = catalog.propositionOrder.find(
    (id) => catalog.propositions[id]!.stableKey === questionKey,
  )!;
  expect(questionId).toBeDefined();
  const jurisdictions = new Map(
    scenario.world.jurisdictionOrder.map((id) => [
      id,
      scenario.world.jurisdictions[id]!,
    ]),
  );
  jurisdictions.set(state.id, state);
  world = createWorld({
    seed: scenario.world.seed,
    currentDate: scenario.world.currentDate,
    currentMoment: scenario.world.currentMoment,
    people: scenario.world.personOrder.map((id) => scenario.world.people[id]!),
    jurisdictions: [...jurisdictions.values()],
    policyCatalog: catalog,
  });
  const baseline = file(world, "term-proof:baseline", 60);
  baselineId = baseline.measureId;
  world = enact(baseline.world, baselineId);
  for (const value of [24, 36, 48, 72, 84, 120, 144])
    world = file(world, `term-proof:reference:${value}`, value).world;
  const pending = file(world, "term-proof:requested");
  world = pending.world;
  requestId = pending.measureId;
}, 30000);

describe("final enacted terms and sponsor requests", () => {
  it("stronger saved principles select a further real reference; opposition mirrors it", () => {
    expect(
      sponsorRequestedLawTerm(strength(world, 0.25), request())?.value,
    ).toBe(72);
    expect(sponsorRequestedLawTerm(strength(world, 1), request())?.value).toBe(
      144,
    );
    expect(
      sponsorRequestedLawTerm(strength(world, 1, true), request())?.value,
    ).toBe(24);
    expect(sponsorRequestedLawTerm(world, request())).toBeNull();
  });

  it("writes the requested number and reasons, and repeats losslessly after Save/Continue", () => {
    const start = strength(world, 1);
    const result = recordSponsorRequestedLawTerm(start, writerInput());
    expect(result.provision?.lawTerms).toEqual([
      { questionKey, key: termKey, value: 144, unit: "months" },
    ]);
    const event = result.world.history.events.find(
      (row) =>
        row.stableKey ===
        `${writerInput().provision.stableKey}:requested-term-reason`,
    )!;
    expect(event.participants[0]!.personId).toBe(scenario.playerPersonId);
    expect(
      event.tags.some((tag) => tag.startsWith("source-record:principle_")),
    ).toBe(true);
    assertWorldIntegrity(result.world);
    const saved = serializeWorld(result.world);
    const loaded = deserializeWorld(saved);
    expect(serializeWorld(loaded)).toBe(saved);
    expect(recordSponsorRequestedLawTerm(loaded, writerInput()).world).toBe(
      loaded,
    );
    const enacted = enact(loaded, requestId);
    const law = lawInForce(enacted, jurisdictionId, questionId)!;
    expect(readFinalEnactedLawTerm(enacted, law, request())?.value).toBe(144);
    expect(recordSponsorRequestedLawTerm(enacted, writerInput()).world).toBe(
      enacted,
    );
    expect(() =>
      recordSponsorRequestedLawTerm(enacted, {
        ...writerInput(),
        provision: { ...writerInput().provision, stableKey: "late:new-term" },
      }),
    ).toThrow(/terminal measure/);
  });

  it("scales appropriation references only against a recorded government population", () => {
    const candidate = budgetCandidates(world).candidates.find(
      (row) => row.jurisdictionId === jurisdictionId,
    )!;
    expect(candidate).toBeDefined();
    const government = openGovernmentBudget(
      world,
      candidate,
      world.currentDate,
    );
    if (typeof government === "string") throw new Error(government);
    expect(government.population).toBeGreaterThan(0);
    const numericWorld: World = {
      ...world,
      publicBudgets: {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [government],
        adjustments: [],
        unknown: [],
      },
      history: {
        ...world.history,
        legislativeProvisions: world.history.legislativeProvisions!.map(
          (row) => ({
            ...row,
            lawTerms: row.lawTerms!.map((term) => ({
              ...term,
              unit: "minor" as const,
            })),
          }),
        ),
      },
    };
    const result = recordSponsorRequestedLawTerm(strength(numericWorld, 1), {
      ...writerInput(),
      unit: "minor",
      basis: "appropriation-per-resident",
    });
    // These references all use the same government's recorded population, so scaling preserves 144.
    expect(result.provision?.lawTerms?.[0]?.value).toBe(144);
    expect(result.provision?.lawTerms?.[0]?.unit).toBe("minor");
    assertWorldIntegrity(result.world);
    expect(serializeWorld(deserializeWorld(serializeWorld(result.world)))).toBe(
      serializeWorld(result.world),
    );
  });

  it("ignores conflicting reference sections instead of picking one", () => {
    const lastReference = world.history.legislativeMeasures!.find(
      (row) => row.stableKey === "term-proof:reference:144",
    )!;
    const conflicted = recordFiledProvision(world, {
      ...writerInput().provision,
      measureId: lastReference.id,
      stableKey: "term-proof:conflict",
      provisionKey: "other-term",
      sectionNumber: 2,
      text: "A contradictory fictional term.",
      lawTerms: [{ questionKey, key: termKey, value: 200, unit: "months" }],
    });
    expect(
      sponsorRequestedLawTerm(strength(conflicted, 1), request())?.value,
    ).toBe(120);
  });

  it("never substitutes a missing field, unit, baseline or reference", () => {
    const law = lawInForce(world, jurisdictionId, questionId)!;
    expect(
      readFinalEnactedLawTerm(world, law, { ...request(), unit: "years" }),
    ).toBeNull();
    expect(
      readFinalEnactedLawTerm(
        world,
        { ...law, origin: "in-force-at-start" },
        request(),
      ),
    ).toBeNull();
    expect(
      sponsorRequestedLawTerm(strength(world, 1), {
        ...request(),
        termKey: "unrecorded-term",
      }),
    ).toBeNull();
    const noNumbers: World = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: world.history.legislativeProvisions!.map(
          (row) => {
            const { lawTerms, ...legacy } = row;
            void lawTerms;
            return legacy;
          },
        ),
      },
    };
    expect(
      recordSponsorRequestedLawTerm(strength(noNumbers, 1), writerInput())
        .world,
    ).toEqual(strength(noNumbers, 1));
    expect(
      sponsorRequestedLawTerm(strength(world, 1), {
        ...request(),
        basis: "appropriation-per-resident",
        unit: "minor",
      }),
    ).toBeNull();
  });
});
