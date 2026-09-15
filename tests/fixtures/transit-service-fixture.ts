import {
  createLegislativeScenario,
  type LegislativeProcedureContext,
} from "../../src/simulation/legislation-scenarios";
import { compileBillDraft } from "../../src/simulation/legislation-drafting";
import { standingAuthority } from "../../src/simulation/legislation-program-families";
import { recordFiledProvision } from "../../src/simulation/legislative-politics";
import { recordDraftLineage } from "../../src/simulation/legislation-draft-lineage";
import {
  availableMeasureSteps,
  measurePosition,
  introduceMeasure,
  recordEnactment,
} from "../../src/simulation/legislation";
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import { addDays } from "../../src/simulation/dates";
import {
  TRANSIT_FAMILY_KEY,
  TRANSIT_PROGRAM_KEY,
  TRANSIT_VARIANT_KEY,
} from "../../src/simulation/legislation-transit-families";
import type { World, EntityId, IsoDate } from "../../src/simulation/types";
// Explicitly synthetic core fixture. The sponsor is authored through canonical
// writers. Ordinary creator/office/F receipts are proved separately.
export function transitAppropriationFixture(
  base?: {
    world: World;
    personId: EntityId;
    procedure: LegislativeProcedureContext;
  },
  amountMinorUnits = 20_000,
  serviceWindow: "weekday" | "weekend" = "weekday",
  ordinal = 1,
) {
  const scenario = base ? null : createLegislativeScenario("alaska");
  const personId = base?.personId ?? scenario!.playerPersonId;
  const original = base?.world ?? scenario!.world;
  const procedure = base?.procedure ?? scenario!;
  const jurisdictionId = original.jurisdictionOrder[0]!;
  const draft = compileBillDraft({
    familyKey: TRANSIT_FAMILY_KEY,
    variantKey: TRANSIT_VARIANT_KEY,
    scenarioKey: "alaska",
    jurisdictionId,
    rulePackId: procedure.pack.packId,
    designation: `HB ${400 + ordinal}`,
    filedOn: original.currentDate,
    parameterValues: {
      appropriation: {
        kind: "money",
        minorUnits: amountMinorUnits,
        currency: "USD",
      },
      "service-window": { kind: "enumerated", value: serviceWindow },
    },
    predicateAuthority: standingAuthority(TRANSIT_PROGRAM_KEY)!,
  });
  let world = introduceMeasure(original, {
    stableKey: `legislative-docket:alaska:bill-${String(ordinal).padStart(3, "0")}:measure`,
    jurisdictionId,
    rulePackId: procedure.pack.packId,
    designation: draft.designation,
    shortTitle: draft.shortTitle,
    summary: draft.summary,
    origin: "member-introduction",
    subjectClass: draft.subjectClass,
    sponsorPersonId: personId,
    originChamberKey: "house",
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  for (const c of draft.clauses)
    world = recordFiledProvision(world, {
      stableKey:
        ordinal === 1
          ? `transit-core:${c.provisionKey}`
          : `transit-core:${ordinal}:${c.provisionKey}`,
      measureId,
      provisionKey: c.provisionKey,
      sectionNumber: c.sectionNumber,
      heading: c.heading,
      text: c.text,
      beneficiary: c.beneficiary,
      applicationScope: { jurisdictionId, segmentKey: null },
      ...(c.fiscalExposureLabel === null
        ? {}
        : {
            fiscalExposureLabel: c.fiscalExposureLabel,
            fiscalExposureMinorUnits: c.fiscalExposureMinorUnits,
          }),
    });
  world = recordDraftLineage(world, {
    stableKey:
      ordinal === 1
        ? "transit-core:lineage"
        : `transit-core:${ordinal}:lineage`,
    measureId,
    familyKey: draft.familyKey,
    familyVersion: draft.familyVersion,
    variantKey: draft.variantKey,
    compiledAt: draft.filedOn,
    parameterValues: draft.parameterValues,
    authorityKey: TRANSIT_PROGRAM_KEY,
    provenanceNote:
      "Explicitly synthetic core test, not the ordinary office route.",
  });
  for (
    let count = 0;
    count < 45 && measurePosition(world, measureId).phase !== "enacted";
    count++
  ) {
    const step = availableMeasureSteps(world, measureId).find(
      (s) => s !== "offer-amendment",
    );
    if (!step) throw new Error("No legal fixture step remains.");
    world = applyLegislativeStep(
      { ...procedure, measureId },
      world,
      step,
    ).world;
  }
  const enactment = world.history.legislativeEnactments!.find(
    (e) => e.measureId === measureId,
  )!;
  return {
    world,
    personId,
    measureId,
    availableAt: addDays(enactment.resolvedAt, 90),
    procedure,
  };
}

/** Canonical-writer source intake fixture. The operative date is explicitly
 * supplied test data, never a claim about a normal Alaska repeal resolver. */
export function transitTerminationFixture(
  base: ReturnType<typeof transitAppropriationFixture>,
  specifiedEffectiveAt: IsoDate | null,
) {
  const jurisdictionId = base.world.history.legislativeMeasures!.find(
    (m) => m.id === base.measureId,
  )!.jurisdictionId;
  const draft = compileBillDraft({
    familyKey: "program-sunset",
    variantKey: "terminate-on-date",
    scenarioKey: "alaska",
    jurisdictionId,
    rulePackId: base.procedure.pack.packId,
    designation: "HB 402 (authored source fixture)",
    filedOn: base.world.currentDate,
    parameterValues: {
      "sunset-term": { kind: "duration-years", years: 1 },
      "pre-sunset-review": { kind: "enumerated", value: "no-review" },
    },
    predicateAuthority: standingAuthority(TRANSIT_PROGRAM_KEY)!,
  });
  let world = introduceMeasure(base.world, {
    stableKey: "transit-test:termination",
    jurisdictionId,
    rulePackId: base.procedure.pack.packId,
    designation: draft.designation,
    shortTitle: draft.shortTitle,
    summary:
      "Authored terminating-law source intake fixture, not ordinary enactment proof.",
    origin: "member-introduction",
    subjectClass: draft.subjectClass,
    sponsorPersonId: base.personId,
    originChamberKey: "house",
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  for (const clause of draft.clauses)
    world = recordFiledProvision(world, {
      stableKey: `transit-test:termination:${clause.provisionKey}`,
      measureId,
      provisionKey: clause.provisionKey,
      sectionNumber: clause.sectionNumber,
      heading: clause.heading,
      text: clause.text,
      beneficiary: clause.beneficiary,
      applicationScope: { jurisdictionId, segmentKey: null },
    });
  world = recordDraftLineage(world, {
    stableKey: "transit-test:termination:lineage",
    measureId,
    familyKey: draft.familyKey,
    familyVersion: draft.familyVersion,
    variantKey: draft.variantKey,
    compiledAt: draft.filedOn,
    parameterValues: draft.parameterValues,
    authorityKey: TRANSIT_PROGRAM_KEY,
    provenanceNote:
      "Explicit canonical-writer terminating-source test fixture.",
  });
  for (
    let count = 0;
    count < 45 &&
    measurePosition(world, measureId).phase !== "awaiting-enactment";
    count++
  ) {
    const step = availableMeasureSteps(world, measureId).find(
      (s) => s !== "offer-amendment",
    );
    if (!step) throw new Error("No legal terminating fixture step remains.");
    world = applyLegislativeStep(
      { ...base.procedure, measureId },
      world,
      step,
    ).world;
  }
  world = recordEnactment(world, {
    stableKey: "transit-test:termination:enactment",
    measureId,
    effectiveAt: specifiedEffectiveAt,
  });
  return { ...base, world, terminationId: measureId, endsOn: draft.endsOn! };
}
