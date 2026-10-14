import { beforeAll, describe, expect, it } from "vitest";
import { createWorld, assertWorldIntegrity } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  createLegislativeScenario,
  type LegislativeScenario,
} from "../legislation-scenarios";
import { stateJurisdictionForKey } from "../life-places";
import { createOrganization } from "../life";
import { organizationProfileAt } from "../life-queries";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
} from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { applyLawConsequences } from "../enacted-law-effects";
import {
  fileRuleChangeProvision,
  recordInstitutionOfficeBinding,
  institutionOfficeBindingAt,
  ruleChangeConsequenceBindingHistoryRecords,
  enactedRuleChangeAt,
  type InstitutionOfficeBindingRecord,
  type RuleChangeLawBindingRecord,
} from "../enacted-rule-changes";
import { serializeWorld, deserializeWorld } from "../serialization";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import {
  INSTITUTION_RULE_REGISTRATION,
  resolveLawInstitutionRuleConsequences,
  applyLawInstitutionRuleConsequence,
} from "./institution-rule";
import type { EntityId, World } from "../types";
import type {
  LawConsequenceRow,
  LawConsequenceContext,
} from "../law-consequence-types";

// Fictional fixture terms and organization records, not researched legal values
// or a claim that any state may change these fields by ordinary statute.
const questionKey =
  "us-policy-positions:government-operations.legislative-term-limits";
const rows: LawConsequenceRow[] = ["body.seats", "term.years"].map((field) => ({
  id: `institution-proof:${field}`,
  kind: "institution-rule",
  when: "effective",
  who: {
    selector: "recorded-rule-institution",
    predicates: [
      { capability: "institution-rule-field", parameters: { field } },
    ],
  },
  what: "apply-adopted-institution-rule",
  amount: {
    op: "term",
    key: field,
    unit: field === "body.seats" ? "count" : "years",
  },
  conditions: [],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["authored:institution-core-fixture"],
    population: "Recorded fictional chambers",
    scope: "Controlled adapter proof only",
    why: "An adopted typed term identifies the saved rule being read.",
    uncertainty: "This fixture establishes no real legal term or authority.",
  },
}));
let scenario: LegislativeScenario;
let world: World;
let jurisdictionId: EntityId;
let measureId: EntityId;
let context: LawConsequenceContext;
let offices: string[];

function apply(start: World): World {
  return applyLawConsequences(start, context, [INSTITUTION_RULE_REGISTRATION]);
}

beforeAll(() => {
  scenario = createLegislativeScenario("kentucky");
  const state = stateJurisdictionForKey("US-KY")!;
  jurisdictionId = state.id;
  const baseCatalog = createProductionPolicyCatalog();
  const questionId = baseCatalog.propositionOrder.find(
    (id) => baseCatalog.propositions[id]!.stableKey === questionKey,
  )!;
  expect(questionId).toBeDefined();
  const catalog = {
    ...baseCatalog,
    propositions: {
      ...baseCatalog.propositions,
      [questionId]: {
        ...baseCatalog.propositions[questionId]!,
        consequences: structuredClone(rows),
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
    policyCatalog: catalog,
  });
  offices = ["house", "senate"].map(
    (chamber) => `${scenario.pack.packId}:${chamber}`,
  );
  for (const officeKey of offices) {
    world = createOrganization(world, {
      stableKey: `institution-proof:${officeKey}`,
      formedAt: world.currentDate,
      provenance: {
        kind: "authored",
        note: "Controlled saved institution; not a starting-law producer.",
      },
      initialProfile: {
        name: `Controlled ${officeKey}`,
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    const profile = organizationProfileAt(world, organizationId)!;
    world = recordInstitutionOfficeBinding(world, {
      stableKey: `institution-proof:${officeKey}:identity`,
      officeKey,
      jurisdictionId,
      organizationId,
      effectiveAt: world.currentDate,
      supersedesBindingId: null,
      sourceRecordIds: [organizationId, profile.id, jurisdictionId],
    });
  }
  world = introduceMeasure(world, {
    stableKey: "institution-proof:bill",
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: "HB institution fixture",
    shortTitle: "Controlled institution rule",
    summary: "Fictional rule and attribution proof.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: scenario.playerPersonId,
    originChamberKey: "house",
    propositionIds: [questionId],
    propositionAnswers: [{ propositionId: questionId, answer: "yes" }],
  });
  measureId = world.history.legislativeMeasures!.at(-1)!.id;
  for (const officeKey of offices)
    for (const field of ["body.seats", "term.years"]) {
      world = fileRuleChangeProvision(world, {
        stableKey: `institution-proof:${officeKey}:${field}`,
        measureId,
        officeKey,
        field,
        value: field === "body.seats" ? 120 : 4,
      });
    }
  world = recordFiledProvision(world, {
    stableKey: "institution-proof:terms",
    measureId,
    provisionKey: "institution-terms",
    sectionNumber: 1,
    heading: "Controlled institutional terms",
    text: "Fictional fixture sets both chamber terms to four years and sizes to 120.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "the controlled saved chambers",
    },
    applicationScope: { jurisdictionId, segmentKey: null },
    lawTerms: [
      { questionKey, key: "body.seats", value: 120, unit: "count" },
      { questionKey, key: "term.years", value: 4, unit: "years" },
    ],
  });
  const procedure = {
    ...scenario,
    measureId,
    governorAction: "signed" as const,
    governorRationale: "Controlled explicit decision.",
  };
  let enacted = false;
  for (let guard = 0; guard < 40; guard += 1) {
    if (measurePosition(world, measureId).phase === "awaiting-enactment") {
      world = recordEnactment(world, {
        stableKey: "institution-proof:enactment",
        measureId,
        effectiveAt: world.currentDate,
      });
      enacted = true;
      break;
    }
    const step = availableMeasureSteps(world, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `No next fixture step at ${measurePosition(world, measureId).phase}`,
      );
    world = applyLegislativeStep(procedure, world, step).world;
  }
  expect(enacted).toBe(true);
  context = {
    onDate: world.currentDate,
    activity: "effective",
    activityId: world.history.legislativeEnactments!.at(-1)!.id,
    subjectIds: [],
    governingLawId: measureId,
    questionKey,
  };
}, 30000);

describe("append-only institution applications", () => {
  it("binds two actual saved offices changing the same fields without rewriting original rules", () => {
    const original = world.history.ruleChangeProvisions!;
    const before = JSON.stringify(original);
    const next = apply(world);
    const applications = ruleChangeConsequenceBindingHistoryRecords(
      next,
    ).filter(
      (record): record is RuleChangeLawBindingRecord =>
        record.kind === "law-application",
    );
    expect(applications).toHaveLength(4);
    expect(next.history.ruleChangeProvisions).toBe(original);
    expect(JSON.stringify(next.history.ruleChangeProvisions)).toBe(before);
    for (const binding of applications) {
      const office = institutionOfficeBindingAt(
        next,
        binding.officeKey,
        jurisdictionId,
        {
          asOfDate: next.currentDate,
          historySequenceExclusive: next.history.nextSequence,
        },
      )!;
      expect(binding.bodyOrganizationId).toBe(office.organizationId);
      expect(
        next.history.organizations.some(
          (record) => record.id === binding.bodyOrganizationId,
        ),
      ).toBe(true);
      expect(binding.officeBindingId).toBe(office.id);
      expect(binding.sourceRecordIds).toEqual(
        expect.arrayContaining([
          binding.ruleChangeProvisionId,
          binding.provisionId,
          binding.enactmentId,
          office.id,
          office.organizationId,
        ]),
      );
      expect(binding.lawEffectStamps).toHaveLength(1);
      expect(binding.lawEffectStamps[0]).toMatchObject({
        governingLawKey: measureId,
        effectKind: "institution-rule",
        jurisdictionId,
      });
    }
    expect(
      enactedRuleChangeAt(next, {
        stateUsps: "KY",
        officeKey: offices[0]!,
        field: "body.seats",
        onDate: next.currentDate,
      })?.value,
    ).toBe(120);
    assertWorldIntegrity(next);
  });
  it("preserves bindings through canonical Save/Continue and repeats without appending", () => {
    const next = apply(world);
    expect(apply(next)).toBe(next);
    const continued = deserializeWorld(serializeWorld(next));
    expect(continued.history.ruleChangeConsequenceBindings).toEqual(
      next.history.ruleChangeConsequenceBindings,
    );
    expect(continued.history.ruleChangeConsequenceBindings).not.toBe(
      next.history.ruleChangeConsequenceBindings,
    );
    expect(apply(continued)).toBe(continued);
    expect(continued.history.ruleChangeProvisions).toEqual(
      world.history.ruleChangeProvisions,
    );
  });
  it("refuses a missing recorded body and does not fabricate an organization", () => {
    const missing = {
      ...world,
      history: { ...world.history, ruleChangeConsequenceBindings: [] },
    };
    expect(() => apply(missing)).toThrow(
      /Missing recorded institution identity/,
    );
    expect(missing.history.organizations).toBe(world.history.organizations);
  });
  it("honors the identity record's sequence cutoff and rejects an ambiguous unsuperseded relation", () => {
    const office = ruleChangeConsequenceBindingHistoryRecords(world).find(
      (record): record is InstitutionOfficeBindingRecord =>
        record.kind === "office-organization",
    )!;
    expect(
      institutionOfficeBindingAt(world, office.officeKey, jurisdictionId, {
        asOfDate: world.currentDate,
        historySequenceExclusive: office.sequence,
      }),
    ).toBeNull();
    expect(
      institutionOfficeBindingAt(world, office.officeKey, jurisdictionId, {
        asOfDate: world.currentDate,
        historySequenceExclusive: office.sequence + 1,
      })?.id,
    ).toBe(office.id);
    expect(() =>
      recordInstitutionOfficeBinding(world, {
        stableKey: "institution-proof:duplicate-identity",
        officeKey: office.officeKey,
        jurisdictionId,
        organizationId: office.organizationId,
        effectiveAt: world.currentDate,
        sourceRecordIds: office.sourceRecordIds,
        supersedesBindingId: null,
      }),
    ).toThrow(/supersede/);
  });
  it("rejects altered resolved terms instead of stamping an unverified consequence", () => {
    const resolved = resolveLawInstitutionRuleConsequences(
      world,
      rows[0]!,
      context,
    )[0]!;
    expect(() =>
      applyLawInstitutionRuleConsequence(world, {
        ...resolved,
        value: { type: "amount", value: 121, unit: "count" },
      }),
    ).toThrow(/stale or unverified/);
  });
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "retains the same adopted office application for an observer in %s",
    (code) => {
      const observer = world.personOrder[0]!;
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
      const resolved = resolveLawInstitutionRuleConsequences(
        start,
        rows[0]!,
        context,
      );
      expect(resolved).toHaveLength(2);
      expect(resolved.map((record) => record.subject.kind)).toEqual([
        "organization",
        "organization",
      ]);
      expect(
        resolved.every(
          (record) =>
            record.law.measureId === measureId &&
            record.jurisdictionId === jurisdictionId,
        ),
      ).toBe(true);
    },
  );
});
