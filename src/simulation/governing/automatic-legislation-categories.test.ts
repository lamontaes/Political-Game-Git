import { enactThroughDesk } from "../../../tests/fixtures/enact-through-desk";
import { ensureStateExecutiveIncumbent } from "../nationwide-world/state-executives";
import { governorOfficeForJurisdiction } from "./state-governing";
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
  offerFloorAmendment,
  measureAmendments,
} from "../legislation";
import {
  recordFiledProvision,
  adoptProvisionRevision,
  assertProvisionLawCategories,
} from "../legislative-politics";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { stateJurisdictionForKey } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { serializeWorld, deserializeWorld } from "../serialization";
import { clonePolicyCatalog, assertPolicyCatalogIntegrity } from "../policy";
import { readFinalEnactedLawCategories } from "./automatic-legislation";
import { lawInForce } from "./law-in-force";
import type { EntityId, World } from "../types";
import type { CrimeOffense } from "../crime/contract";

// Explicit declaration and coverage fixtures; this file does not install a production policy.
const questionKey =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";
const termKey = "coverage";
const allowedValues: readonly CrimeOffense[] = [
  "assault",
  "robbery",
  "burglary",
  "vandalism",
];
let scenario: LegislativeScenario;
let world: World;
let baselineId: EntityId;
let questionId: EntityId;
let jurisdictionId: EntityId;
const request = () => ({ questionKey, termKey });
function file(start: World, key: string, values?: readonly string[]) {
  let next = introduceMeasure(start, {
    stableKey: key,
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: `HB ${1 + (start.history.legislativeMeasures?.length ?? 0)}`,
    shortTitle: "Controlled offense coverage",
    summary: "Explicit categories used to test final legislative text.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: scenario.playerPersonId,
    originChamberKey: "house",
    propositionIds: [questionId],
    propositionAnswers: [{ propositionId: questionId, answer: "yes" }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  if (values !== undefined)
    next = recordFiledProvision(next, {
      stableKey: `${key}:coverage`,
      measureId,
      provisionKey: "covered-offenses",
      sectionNumber: 1,
      heading: "Covered offenses",
      text: `The controlled rule covers ${values.join(", ") || "no offenses"}.`,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "the declared modeled offenses",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
      lawCategories: [{ questionKey, key: termKey, values }],
    });
  return { world: next, measureId };
}
function enact(start: World, measureId: EntityId): World {
  const office = governorOfficeForJurisdiction(
    start,
    scenario.pack.jurisdictionKey,
  )!;
  return enactThroughDesk(
    { ...start, control: { kind: "person", personId: office.holderPersonId } },
    measureId,
    { context: scenario },
  );
}

beforeAll(() => {
  scenario = createLegislativeScenario("kentucky");
  const state = stateJurisdictionForKey("US-KY")!;
  jurisdictionId = state.id;
  const catalog = createProductionPolicyCatalog();
  questionId = catalog.propositionOrder.find(
    (id) => catalog.propositions[id]!.stableKey === questionKey,
  )!;
  const question = catalog.propositions[questionId]!;
  const declaredCatalog = {
    ...catalog,
    propositions: {
      ...catalog.propositions,
      [questionId]: {
        ...question,
        parameters: question.parameters.map((parameter) =>
          parameter.key === termKey
            ? { ...parameter, allowedValues }
            : parameter,
        ),
      },
    },
  };
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
    policyCatalog: declaredCatalog,
  });
  world = ensureStateExecutiveIncumbent(
    world,
    scenario.playerPersonId,
    scenario.pack.jurisdictionKey.slice(3),
  );
  const baseline = file(world, "category-proof:baseline", ["robbery"]);
  baselineId = baseline.measureId;
  world = enact(baseline.world, baselineId);
}, 30000);

function catalogWithoutCoverageDeclaration() {
  const catalog = createProductionPolicyCatalog();
  const question = catalog.propositions[questionId]!;
  return {
    ...catalog,
    propositions: {
      ...catalog.propositions,
      [questionId]: {
        ...question,
        parameters: question.parameters.map((parameter) => {
          if (parameter.key !== termKey) return parameter;
          const { allowedValues, ...withoutDeclaration } = parameter;
          void allowedValues;
          return withoutDeclaration;
        }),
      },
    },
  };
}

describe("final enacted categorical terms", () => {
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "reads explicit final coverage for an observer in %s",
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
      const result = readFinalEnactedLawCategories(start, law, request());
      expect(result).toMatchObject({
        values: ["robbery"],
        measureId: baselineId,
      });
      expect(result!.sourceRecordIds).toContain(result!.provisionId);
    },
  );
  it.each([{ values: ["assault"] }, { values: undefined }, { values: [] }])(
    "uses adopted revision $values and never revives filed coverage",
    ({ values }) => {
      const pending = file(world, "category-proof:revised", ["robbery"]);
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
        stableKey: "category-proof:revision-vote",
        measureId: pending.measureId,
        description: "Replace controlled coverage.",
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
          note: "Controlled adopted category revision.",
        },
      });
      const amendment = measureAmendments(next, pending.measureId).at(-1)!;
      const original = next.history.legislativeProvisions!.find(
        (row) => row.measureId === pending.measureId,
      )!;
      next = adoptProvisionRevision(next, {
        stableKey: "category-proof:revision",
        measureId: pending.measureId,
        amendmentId: amendment.id,
        supersedesProvisionId: original.id,
        provisionKey: original.provisionKey,
        sectionNumber: original.sectionNumber,
        heading: original.heading,
        text: "The adopted controlled category rule.",
        beneficiary: original.beneficiary,
        applicationScope: original.applicationScope,
        ...(values === undefined
          ? {}
          : { lawCategories: [{ questionKey, key: termKey, values }] }),
      });
      next = enact(next, pending.measureId);
      const law = lawInForce(next, jurisdictionId, questionId)!;
      const result = readFinalEnactedLawCategories(next, law, request());
      if (values === undefined) expect(result).toBeNull();
      else expect(result).toMatchObject({ values });
      assertWorldIntegrity(next);
      const saved = serializeWorld(next);
      const loaded = deserializeWorld(saved);
      expect(serializeWorld(loaded)).toBe(saved);
      expect(readFinalEnactedLawCategories(loaded, law, request())).toEqual(
        result,
      );
    },
  );
  it("does not infer categories from labels, a missing field, a starting law or a future effective date", () => {
    const law = lawInForce(world, jurisdictionId, questionId)!;
    expect(
      readFinalEnactedLawCategories(
        world,
        { ...law, origin: "in-force-at-start" },
        request(),
      ),
    ).toBeNull();
    expect(
      readFinalEnactedLawCategories(
        world,
        { ...law, operativeAt: "2099-01-01" as typeof law.operativeAt },
        request(),
      ),
    ).toBeNull();
    expect(
      readFinalEnactedLawCategories(world, law, {
        ...request(),
        termKey: "missing-key",
      }),
    ).toBeNull();
    const noDeclaration: World = {
      ...world,
      policyCatalog: catalogWithoutCoverageDeclaration(),
    };
    expect(
      readFinalEnactedLawCategories(noDeclaration, law, request()),
    ).toBeNull();
    const noCategories: World = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: world.history.legislativeProvisions!.map(
          (row) => {
            const { lawCategories, ...legacy } = row;
            void lawCategories;
            return legacy;
          },
        ),
      },
    };
    expect(
      readFinalEnactedLawCategories(noCategories, law, request()),
    ).toBeNull();
    assertWorldIntegrity(noCategories);
  });
  it.each([
    {
      categories: [{ questionKey, key: termKey, values: ["crime:robbery"] }],
      message: /undeclared value/,
    },
    {
      categories: [
        { questionKey, key: termKey, values: ["robbery", "robbery"] },
      ],
      message: /repeat a value/,
    },
    {
      categories: [{ questionKey, key: "missing", values: ["robbery"] }],
      message: /declared catalog allowed values/,
    },
    {
      categories: [
        { questionKey, key: termKey, values: ["robbery"] },
        { questionKey, key: termKey, values: ["assault"] },
      ],
      message: /repeat a law category/,
    },
  ])(
    "rejects undeclared or duplicate categorical input $categories",
    ({ categories, message }) => {
      expect(() => assertProvisionLawCategories(world, categories)).toThrow(
        message,
      );
    },
  );
  it("the writer rejects missing allowed values and Save/Continue rejects corrupted coverage", () => {
    const pending = file(world, "category-proof:invalid");
    expect(() =>
      recordFiledProvision(
        {
          ...pending.world,
          policyCatalog: catalogWithoutCoverageDeclaration(),
        },
        {
          stableKey: "category-proof:unsupported",
          measureId: pending.measureId,
          provisionKey: "covered-offenses",
          sectionNumber: 1,
          heading: "Covered offenses",
          text: "No untyped label may act as coverage.",
          beneficiary: {
            kind: "general-application",
            appliesToLabel: "modeled offenses",
          },
          applicationScope: { jurisdictionId, segmentKey: null },
          lawCategories: [{ questionKey, key: termKey, values: ["robbery"] }],
        },
      ),
    ).toThrow(/declared catalog allowed values/);
    const corrupted = JSON.parse(serializeWorld(world));
    corrupted.world.history.legislativeProvisions[0].lawCategories[0].values = [
      "unmodeled-offense",
    ];
    expect(() => deserializeWorld(JSON.stringify(corrupted))).toThrow(
      /undeclared value/,
    );
  });
  it("conflicting final sections are unsupported", () => {
    const pending = file(world, "category-proof:conflicting", ["robbery"]);
    const next = recordFiledProvision(pending.world, {
      stableKey: "category-proof:second",
      measureId: pending.measureId,
      provisionKey: "other-coverage",
      sectionNumber: 2,
      heading: "Other coverage",
      text: "A conflicting coverage section.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "modeled offenses",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
      lawCategories: [{ questionKey, key: termKey, values: ["assault"] }],
    });
    const enacted = enact(next, pending.measureId);
    expect(
      readFinalEnactedLawCategories(
        enacted,
        lawInForce(enacted, jurisdictionId, questionId)!,
        request(),
      ),
    ).toBeNull();
  });
  it("catalog clones preserve and isolate declaration arrays and reject invalid declarations", () => {
    const clone = clonePolicyCatalog(world.policyCatalog);
    const original = world.policyCatalog.propositions[
      questionId
    ]!.parameters.find((row) => row.key === termKey)!;
    const copied = clone.propositions[questionId]!.parameters.find(
      (row) => row.key === termKey,
    )!;
    expect(copied.allowedValues).toEqual(original.allowedValues);
    expect(copied.allowedValues).not.toBe(original.allowedValues);
    const catalog = {
      ...clone,
      propositions: {
        ...clone.propositions,
        [questionId]: {
          ...clone.propositions[questionId]!,
          parameters: [
            {
              key: termKey,
              value: "covered-offense-categories",
              allowedValues: ["robbery", "robbery"],
            },
          ],
        },
      },
    };
    expect(() => assertPolicyCatalogIntegrity(catalog)).toThrow(/Duplicate/);
  });
});
