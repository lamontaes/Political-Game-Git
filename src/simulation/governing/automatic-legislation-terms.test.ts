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
import { ensureStateExecutiveIncumbent } from "../nationwide-world/state-executives";
import {
  governorOfficeForJurisdiction,
  governingMatters,
  decideGoverningMatter,
} from "./state-governing";
import { BILL_SIGN } from "./governor-bill-decision";

import { serializeWorld, deserializeWorld } from "../serialization";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { readFinalEnactedLawTerm } from "./automatic-legislation";
import { lawInForce } from "./law-in-force";
import type { EntityId, LegislativeProvisionRecord, World } from "../types";

// Every numeric value and vote here is a fictional fixture input, not a legal estimate.
const questionKey =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";
const termKey = "covered-offense-minimum-months";
let scenario: LegislativeScenario;
let world: World;
let baselineId: EntityId;
let beforeOfficeWorld: World;

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
  const context = { ...scenario, measureId };
  for (let guard = 0; guard < 40; guard += 1) {
    if (measurePosition(next, measureId).phase === "awaiting-enactment")
      return recordEnactment(next, {
        stableKey: `${measureId}:law`,
        measureId,
        effectiveAt: next.currentDate,
      });
    if (measurePosition(next, measureId).phase === "awaiting-executive") {
      const office = governorOfficeForJurisdiction(
        next,
        scenario.pack.jurisdictionKey,
      );
      expect(
        office,
        "A real recorded office is required for the controlled signature",
      ).not.toBeNull();
      next = applyLegislativeStep(
        context,
        next,
        "await-executive-decision",
      ).world;
      const matter = governingMatters(next, office!.officeKey).find(
        (row) => row.measureId === measureId && row.status === "open",
      );
      expect(matter).toBeDefined();
      const priorControl = next.control;
      const decision = decideGoverningMatter(
        {
          ...next,
          control: { kind: "person", personId: office!.holderPersonId },
        },
        matter!.id,
        BILL_SIGN,
      );
      expect(decision.ok, decision.ok ? "" : decision.reason).toBe(true);
      next = { ...decision.world, control: priorControl };
      expect(measurePosition(next, measureId).phase).toBe("awaiting-enactment");
      continue;
    }
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

function request() {
  return { questionKey, termKey, unit: "months" as const };
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
  beforeOfficeWorld = world;
  world = ensureStateExecutiveIncumbent(
    world,
    scenario.playerPersonId,
    scenario.pack.jurisdictionKey.slice(3),
  );
  expect(
    governorOfficeForJurisdiction(world, scenario.pack.jurisdictionKey),
  ).not.toBeNull();
  const baseline = file(world, "term-proof:baseline", 60);
  baselineId = baseline.measureId;
  world = enact(baseline.world, baselineId);
}, 30000);

describe("final enacted terms and sponsor requests", () => {
  it("keeps a vacant executive desk pending despite the scenario's authored ending", () => {
    const filed = file(beforeOfficeWorld, "term-proof:vacant-desk", 60);
    const context = {
      ...scenario,
      measureId: filed.measureId,
      governorAction: "signed" as const,
      governorRationale: "An authored scenario is not an actual governor.",
    };
    let next = filed.world;
    for (
      let guard = 0;
      guard < 40 &&
      measurePosition(next, filed.measureId).phase !== "awaiting-executive";
      guard += 1
    ) {
      const step = availableMeasureSteps(next, filed.measureId).find(
        (key) => key !== "offer-amendment",
      );
      expect(step).toBeDefined();
      next = applyLegislativeStep(context, next, step!).world;
    }
    expect(measurePosition(next, filed.measureId).phase).toBe(
      "awaiting-executive",
    );
    expect(
      governorOfficeForJurisdiction(next, scenario.pack.jurisdictionKey),
    ).toBeNull();
    expect(
      applyLegislativeStep(context, next, "await-executive-decision").world,
    ).toBe(next);
    expect(next.history.executiveDispositions ?? []).toHaveLength(0);
    assertWorldIntegrity(next);
  });
  it("records the actual officeholder's controlled decision before enactment", () => {
    const office = governorOfficeForJurisdiction(
      world,
      scenario.pack.jurisdictionKey,
    )!;
    const matter = governingMatters(world, office.officeKey).find(
      (row) => row.measureId === baselineId,
    )!;
    expect(matter.status).toBe("decided");
    const decided = world.history.events.find(
      (event) =>
        event.tags.includes(`matter:${matter.id}`) &&
        event.tags.includes(`choice:${BILL_SIGN}`),
    )!;
    expect(
      decided.participants.some(
        (participant) =>
          participant.personId === office.holderPersonId &&
          participant.role === "agency:decider",
      ),
    ).toBe(true);
    expect(
      world.history.executiveDispositions!.find(
        (row) => row.measureId === baselineId,
      )!.action,
    ).toBe("signed");
    assertWorldIntegrity(world);
  });
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
      const term = readFinalEnactedLawTerm(start, law, request())!;
      const enactment = start.history.legislativeEnactments!.find(
        (row) => row.measureId === baselineId,
      )!;
      expect(term.sourceRecordIds).toEqual([
        baselineId,
        enactment.id,
        term.provisionId,
      ]);
    },
  );

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

  it("does not infer a missing term, unit or starting-law value", () => {
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
      readFinalEnactedLawTerm(world, law, {
        ...request(),
        termKey: "unrecorded-term",
      }),
    ).toBeNull();
    const legacy: World = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: world.history.legislativeProvisions!.map(
          (row) => {
            const { lawTerms, ...rest } = row;
            void lawTerms;
            return rest;
          },
        ),
      },
    };
    const loaded = deserializeWorld(serializeWorld(legacy));
    expect(readFinalEnactedLawTerm(loaded, law, request())).toBeNull();
  });
  it("preserves the adopted term and exact source identities through Save/Continue", () => {
    const law = lawInForce(world, jurisdictionId, questionId)!;
    const before = readFinalEnactedLawTerm(world, law, request());
    const saved = serializeWorld(world);
    const loaded = deserializeWorld(saved);
    expect(serializeWorld(loaded)).toBe(saved);
    expect(readFinalEnactedLawTerm(loaded, law, request())).toEqual(before);
    expect(readFinalEnactedLawTerm(loaded, law, request())).toEqual(before);
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
    const pending = file(world, "term-proof:invalid-bill");
    const invalid: LegislativeProvisionRecord["lawTerms"] = [
      { questionKey, key: termKey, value: 1, unit: "months" },
      { questionKey, key: termKey, value: 2, unit: "months" },
    ];
    expect(() =>
      recordFiledProvision(pending.world, {
        stableKey: "term-proof:invalid",
        provisionKey: "invalid",
        sectionNumber: 1,
        heading: "Invalid term",
        beneficiary: {
          kind: "general-application",
          appliesToLabel: "the fictional covered offense",
        },
        applicationScope: { jurisdictionId, segmentKey: null },
        measureId: pending.measureId,
        text: "Invalid duplicate terms.",
        lawTerms: invalid,
      }),
    ).toThrow(/repeat a law term/);
  });
});
