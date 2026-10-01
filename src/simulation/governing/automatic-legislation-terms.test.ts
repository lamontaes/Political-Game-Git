import { beforeAll, describe, expect, it } from "vitest";
import { createWorld, assertWorldIntegrity } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  createLegislativeScenario,
  bodyForChamber,
  dispositionsFromCounts,
  type LegislativeScenario,
} from "../legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
  offerFloorAmendment,
  measureAmendments,
} from "../legislation";
import {
  recordFiledProvision,
  adoptProvisionRevision,
} from "../legislative-politics";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { stateJurisdictionForKey } from "../life-places";
import { createFormationContext, recordPrinciples } from "../politics";
import { serializeWorld, deserializeWorld } from "../serialization";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import {
  readFinalEnactedLawTerm,
  sponsorRequestedLawTerm,
  recordSponsorRequestedLawTerm,
  type SponsorLawTermRequest,
} from "./automatic-legislation";
import { lawInForce } from "./law-in-force";
import type { EntityId, LegislativeProvisionRecord, World } from "../types";

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
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "reads the same adopted term for an observer in %s",
    (code) => {
      const observer = world.personOrder[1]!;
      const state = stateJurisdictionForKey(`US-${code}`)!;
      const start: World = {
        ...world,
        people: {
          ...world.people,
          [observer]: {
            ...world.people[observer]!,
            homeJurisdictionId: state.id,
          },
        },
      };
      const law = lawInForce(start, jurisdictionId, questionId)!;
      expect(law.measureId).toBe(baselineId);
      expect(readFinalEnactedLawTerm(start, law, request())).toMatchObject({
        value: 60,
        unit: "months",
        measureId: baselineId,
      });
    },
  );

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
  });

  it.each([84, undefined])(
    "uses the adopted revision %s rather than the filed number",
    (revisedValue) => {
      const pending = file(world, "term-proof:revised", 72);
      const context = { ...scenario, measureId: pending.measureId };
      let next = pending.world;
      for (const step of [
        "request-referral",
        "request-committee-hearing",
        "move-committee-report",
        "request-calendar-placement",
      ] as const)
        next = applyLegislativeStep(context, next, step).world;
      const body = bodyForChamber(context, "house");
      next = offerFloorAmendment(next, {
        stableKey: "term-proof:revision-vote",
        measureId: pending.measureId,
        description: "Replace the fictional term.",
        offeredByPersonId: scenario.playerPersonId,
        offeredByLabel: "Test member",
        dispositions: dispositionsFromCounts(body.members, {
          yea: body.members.length,
          nay: 0,
        }),
        electedMembers: body.members.length,
        presentMembers: body.members.length,
        provenance: {
          method: "authored-fixture",
          sourceEntityIds: [],
          note: "Controlled adopted revision.",
        },
      });
      const amendment = measureAmendments(next, pending.measureId).at(-1)!;
      const original = next.history.legislativeProvisions!.find(
        (row) => row.measureId === pending.measureId,
      )!;
      next = adoptProvisionRevision(next, {
        stableKey: "term-proof:revision",
        measureId: pending.measureId,
        amendmentId: amendment.id,
        supersedesProvisionId: original.id,
        provisionKey: original.provisionKey,
        sectionNumber: original.sectionNumber,
        heading: original.heading,
        text:
          revisedValue === undefined
            ? "The fictional numeric requirement is removed."
            : `The fictional minimum is ${revisedValue} months.`,
        beneficiary: original.beneficiary,
        applicationScope: original.applicationScope,
        ...(revisedValue === undefined
          ? {}
          : {
              lawTerms: [
                {
                  questionKey,
                  key: termKey,
                  value: revisedValue,
                  unit: "months" as const,
                },
              ],
            }),
      });
      next = enact(next, pending.measureId);
      const law = lawInForce(next, jurisdictionId, questionId)!;
      expect(law.measureId).toBe(pending.measureId);
      const term = readFinalEnactedLawTerm(next, law, request());
      if (revisedValue === undefined) expect(term).toBeNull();
      else expect(term).toMatchObject({ value: revisedValue });
      assertWorldIntegrity(next);
    },
  );

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

  it("rejects malformed terms at the writer and on Save/Continue", () => {
    const original = world.history.legislativeProvisions![0]!;
    const poisoned: World = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: [
          {
            ...original,
            lawTerms: [
              { questionKey, key: termKey, value: NaN, unit: "months" },
            ],
          },
          ...world.history.legislativeProvisions!.slice(1),
        ],
      },
    };
    expect(() => assertWorldIntegrity(poisoned)).toThrow(/Non-finite number/);
    const corrupted = JSON.parse(serializeWorld(world));
    corrupted.world.history.legislativeProvisions[0].lawTerms[0].value = null;
    expect(() => deserializeWorld(JSON.stringify(corrupted))).toThrow(
      /finite value/,
    );
    const invalid: LegislativeProvisionRecord["lawTerms"] = [
      { questionKey, key: termKey, value: 1, unit: "months" },
      { questionKey, key: termKey, value: 2, unit: "months" },
    ];
    expect(() =>
      recordFiledProvision(world, {
        ...writerInput().provision,
        measureId: requestId,
        text: "Invalid duplicate terms.",
        lawTerms: invalid,
      }),
    ).toThrow(/repeat a law term/);
  });
});
