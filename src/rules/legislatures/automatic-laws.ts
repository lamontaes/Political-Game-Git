import type {
  EntityId,
  LegislativeMeasureRecord,
  LegislativeProvisionRecord,
  LegislativeDraftLineageRecord,
  LegislativeEnactmentRecord,
} from "../../simulation/types";
import type {
  SponsorLawTermRequest,
  SponsorRequestedLawTerm,
  AutomaticLawPositionMapping,
  AutomaticLawCompileContext,
  AutomaticLawGovernmentLevel,
} from "../../simulation/governing/automatic-legislation";
import type {
  CompiledBillDraft,
  compileBillDraft,
} from "../../simulation/legislation-drafting";
import type {
  ProgramFamily,
  ProgramVariant,
  ProgramParameterValue,
} from "../../simulation/legislation-program-families";
import type { PredicateAuthority } from "../../simulation/legislation-content-contracts";
import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import type { lawInForce } from "../../simulation/governing/law-in-force";
import {
  principledLeaning,
  type PrincipledLeaningFacts,
} from "./principled-leaning";
type CompileRequest = Parameters<typeof compileBillDraft>[0];
export interface CompileAction {
  readonly kind: "compile-request";
  readonly request: CompileRequest;
}
export interface AutomaticLawFacts extends PrincipledLeaningFacts {
  readonly personIds: ReadonlySet<EntityId>;
  readonly measures: readonly LegislativeMeasureRecord[];
  readonly enactments: readonly LegislativeEnactmentRecord[];
  readonly lineages: readonly LegislativeDraftLineageRecord[];
  readonly regionByState: ReadonlyMap<string, string>;
  readonly stateByJurisdiction: ReadonlyMap<EntityId, string>;
  readonly populationByJurisdiction: ReadonlyMap<EntityId, number>;
  readonly laws: ReadonlyMap<
    string,
    NonNullable<ReturnType<typeof lawInForce>>
  >;
  readonly currentTerms: ReadonlyMap<
    string,
    { readonly value: number; readonly sourceRecordIds: readonly EntityId[] }
  >;
  readonly finalProvisions: ReadonlyMap<
    EntityId,
    readonly LegislativeProvisionRecord[]
  >;
  readonly contexts: ReadonlyMap<string, AutomaticLawCompileContext>;
  readonly mappings: readonly AutomaticLawPositionMapping[];
  readonly packsByJurisdiction: ReadonlyMap<EntityId, LegislativeRulePack>;
  readonly packsByWorkKey: ReadonlyMap<string, LegislativeRulePack>;
  readonly workKeysByPack: ReadonlyMap<string, string>;
  readonly programVariants: ReadonlyMap<
    string,
    { readonly family: ProgramFamily; readonly variant: ProgramVariant }
  >;
  readonly compiledReferences: ReadonlyMap<EntityId, CompiledBillDraft>;
  readonly parameterValuesByLineage: ReadonlyMap<
    EntityId,
    Readonly<Record<string, ProgramParameterValue>>
  >;
  readonly compiledResult: CompiledBillDraft | null;
}
interface AutomaticSponsorDraft extends CompiledBillDraft {
  readonly sponsorRequest?: {
    readonly sponsorPersonId: EntityId;
    readonly score: number;
    readonly referenceMeasureId: EntityId;
    readonly sourceRecordIds: readonly EntityId[];
    readonly provisions: readonly LegislativeProvisionRecord[];
  };
}

function referenceDistance(
  facts: AutomaticLawFacts,
  target: EntityId,
  source: EntityId,
) {
  const targetState = facts.stateByJurisdiction.get(target) ?? null;
  const sourceState = facts.stateByJurisdiction.get(source) ?? null;
  if (targetState && sourceState === targetState) return 0;
  const states = new Set(facts.regionByState.keys());
  return targetState &&
    sourceState &&
    states.has(targetState) &&
    states.has(sourceState) &&
    facts.regionByState.get(targetState) ===
      facts.regionByState.get(sourceState)
    ? 1
    : 2;
}

export function selectSortedSponsorReference<
  T extends {
    readonly value: number;
  },
>(references: readonly T[], strength: number): T | null {
  const unique = references.filter(
    (row, index) => index === 0 || row.value !== references[index - 1]!.value,
  );
  return unique.length
    ? unique[Math.floor(Math.min(1, strength) * (unique.length - 1))]!
    : null;
}

export function sponsorRequestedLawTerm(
  facts: AutomaticLawFacts,
  input: SponsorLawTermRequest,
): SponsorRequestedLawTerm | null {
  const measure =
    facts.measures.find((row) => row.id === input.measureId) ?? null;
  const question = facts.policyCatalog.propositionOrder
    .map((id) => facts.policyCatalog.propositions[id]!)
    .find((row) => row.stableKey === input.questionKey);
  if (
    !measure?.sponsorPersonId ||
    !question ||
    !(measure.propositionIds ?? []).includes(question.id)
  )
    return null;
  const leaning = principledLeaning(
    facts,
    measure.sponsorPersonId,
    question.id,
  );
  const maximumScore =
    4 *
    (question.principles ?? []).reduce(
      (sum, row) => sum + (row.weight ?? 1),
      0,
    );
  if (!leaning.recordIds.length || !leaning.score || !maximumScore) return null;
  const currentLaw =
    facts.laws.get(`${measure.jurisdictionId}:${question.id}`) ?? null;
  const current = currentLaw
    ? (facts.currentTerms.get(
        `${currentLaw.measureId}:${input.questionKey}:${input.termKey}`,
      ) ?? null)
    : null;
  if (!current) return null;
  const targetPopulation =
    input.basis === "appropriation-per-resident"
      ? facts.populationByJurisdiction.get(measure.jurisdictionId)
      : null;
  if (
    input.basis === "appropriation-per-resident" &&
    (input.unit !== "minor" ||
      !(targetPopulation && targetPopulation > 0) ||
      !Number.isFinite(targetPopulation))
  )
    return null;
  const increasing = leaning.score > 0 === (input.supportDirection === "raise");
  const targetState =
    facts.stateByJurisdiction.get(measure.jurisdictionId) ?? null;
  const knownRegions = new Set(facts.regionByState.keys());
  const targetRegion =
    targetState && knownRegions.has(targetState)
      ? facts.regionByState.get(targetState)
      : null;
  const references = (facts.measures ?? [])
    .flatMap((reference) => {
      if (
        reference.id === measure.id ||
        reference.introducedAt > facts.onDate ||
        !(reference.propositionIds ?? []).includes(question.id)
      )
        return [];
      const sourcePopulation =
        input.basis === "appropriation-per-resident"
          ? facts.populationByJurisdiction.get(reference.jurisdictionId)
          : null;
      if (
        input.basis === "appropriation-per-resident" &&
        (!(sourcePopulation && sourcePopulation > 0) ||
          !Number.isFinite(sourcePopulation))
      )
        return [];
      const state =
        facts.stateByJurisdiction.get(reference.jurisdictionId) ?? null;
      const region =
        state && knownRegions.has(state)
          ? facts.regionByState.get(state)
          : null;
      const distance =
        targetState && state === targetState
          ? 0
          : targetRegion && region === targetRegion
            ? 1
            : 2;
      const adopted = (facts.enactments ?? []).find(
        (row) =>
          row.measureId === reference.id &&
          row.outcome === "enacted" &&
          row.resolvedAt <= facts.onDate,
      );
      const provisions = facts.finalProvisions.get(reference.id) ?? [];
      const terms = provisions.flatMap((provision) =>
        provision.applicationScope.segmentKey === null
          ? (provision.lawTerms ?? [])
              .filter(
                (term) =>
                  term.questionKey === input.questionKey &&
                  term.key === input.termKey,
              )
              .map((term) => ({ provision, term }))
          : [],
      );
      if (terms.length !== 1 || terms[0]!.term.unit !== input.unit) return [];
      const { provision, term } = terms[0]!;
      const value =
        input.basis === "appropriation-per-resident"
          ? Math.round((term.value / sourcePopulation!) * targetPopulation!)
          : term.value;
      if (
        !Number.isFinite(value) ||
        !(increasing ? value > current.value : value < current.value)
      )
        return [];
      return [
        { value, provision, reference, distance, enactmentId: adopted?.id },
      ];
    })
    .sort(
      (a, b) =>
        (increasing ? a.value - b.value : b.value - a.value) ||
        a.distance - b.distance ||
        b.provision.recordedAt.localeCompare(a.provision.recordedAt) ||
        b.provision.sequence - a.provision.sequence ||
        a.provision.id.localeCompare(b.provision.id),
    );
  const selected = selectSortedSponsorReference(
    references,
    Math.abs(leaning.score) / maximumScore,
  );
  if (!selected) return null;
  return {
    value: selected.value,
    unit: input.unit,
    referenceMeasureId: selected.reference.id,
    referenceProvisionId: selected.provision.id,
    principleRecordIds: leaning.recordIds,
    score: leaning.score,
    sourceRecordIds: [
      ...current.sourceRecordIds,
      selected.reference.id,
      selected.provision.id,
      ...(selected.enactmentId ? [selected.enactmentId] : []),
      ...leaning.recordIds,
    ],
  };
}

function authorityAllowsAppropriation(authority: PredicateAuthority): boolean {
  if ("permittedEffects" in authority)
    return authority.permittedEffects.includes("public-program-appropriation");
  return "authorizesSpending" in authority && authority.authorizesSpending;
}

function contextSupportsMapping(
  facts: AutomaticLawFacts,
  context: AutomaticLawCompileContext,
  jurisdictionId: EntityId,
  mapping: AutomaticLawPositionMapping,
): boolean {
  const authority = context.predicateAuthority;
  if (
    context.jurisdictionId !== jurisdictionId ||
    context.governmentLevel !== mapping.governmentLevel ||
    authority.kind !== mapping.authorityKind ||
    !authorityAllowsAppropriation(authority) ||
    (mapping.authorityKey !== null &&
      authority.authorityKey !== mapping.authorityKey)
  )
    return false;
  if (authority.kind === "game-profile") {
    if (
      authority.governmentLevel !== mapping.governmentLevel ||
      authority.publicGovernmentIdentity.jurisdictionId !== jurisdictionId ||
      !authority.permittedEffects.includes(mapping.operativeEffectKind)
    )
      return false;
    if (
      (mapping.governmentLevel === "municipality" ||
        mapping.governmentLevel === "county") &&
      authority.publicGovernmentIdentity.kind !== "local-government"
    )
      return false;
    if (
      (mapping.governmentLevel === "state" ||
        mapping.governmentLevel === "federal") &&
      authority.publicGovernmentIdentity.kind !== "jurisdiction"
    )
      return false;
  }
  const pack =
    mapping.governmentLevel === "state" || mapping.governmentLevel === "federal"
      ? facts.packsByJurisdiction.get(jurisdictionId)
      : facts.packsByWorkKey.get(context.scenarioKey);
  if (!pack || pack.packId !== context.rulePackId) return false;
  if (
    mapping.governmentLevel === "federal" &&
    context.scenarioKey !== facts.workKeysByPack.get(pack.packId)
  )
    return false;
  return true;
}

function hasRegisteredOperativeEffect(
  draft: CompiledBillDraft,
  mapping: AutomaticLawPositionMapping,
): boolean {
  if (
    mapping.operativeEffectKind !== "public-program-appropriation" ||
    mapping.effectProvisionKey !== "amount-provided" ||
    mapping.effectParameterKey !== "appropriation"
  )
    return false;
  const appropriation = draft.parameterValues[mapping.effectParameterKey];
  const amountClauses = draft.clauses.filter(
    (clause) => clause.provisionKey === mapping.effectProvisionKey,
  );
  const amountClause = amountClauses[0];
  const spendingTotal = draft.clauses
    .filter((clause) => clause.dimension !== "revenue")
    .map((clause) => clause.fiscalExposureMinorUnits)
    .filter((amount): amount is number => amount !== null)
    .reduce((total, amount) => total + amount, 0);
  return (
    appropriation?.kind === "money" &&
    Number.isSafeInteger(appropriation.minorUnits) &&
    appropriation.minorUnits > 0 &&
    amountClauses.length === 1 &&
    amountClause?.operativeEffect?.kind === "public-program-appropriation" &&
    amountClause.parameterKey === "appropriation" &&
    amountClause.fiscalExposureMinorUnits === appropriation.minorUnits &&
    draft.authorizesAppropriation &&
    draft.appropriatedMinorUnits === appropriation.minorUnits &&
    spendingTotal === draft.appropriatedMinorUnits
  );
}

function verifiedReferenceDraft(
  facts: AutomaticLawFacts,
  measure: LegislativeMeasureRecord,
  lineage: LegislativeDraftLineageRecord,
  mapping: AutomaticLawPositionMapping,
  suppliedContext?: AutomaticLawCompileContext,
) {
  const context =
    suppliedContext &&
    contextSupportsMapping(
      facts,
      suppliedContext,
      measure.jurisdictionId,
      mapping,
    )
      ? suppliedContext
      : (facts.contexts.get(
          `${measure.jurisdictionId}:${mapping.familyKey}:${mapping.variantKey}`,
        ) ?? null);
  if (
    !context ||
    !contextSupportsMapping(facts, context, measure.jurisdictionId, mapping)
  )
    return null;
  const { family, variant } = facts.programVariants.get(
    `${mapping.familyKey}:${mapping.variantKey}`,
  )!;
  if (
    lineage.familyVersion !== family.familyVersion ||
    lineage.authorityKey !== context.predicateAuthority.authorityKey
  )
    return null;
  const values = facts.parameterValuesByLineage.get(lineage.id)!;
  if (
    lineage.parameters.length !== variant.parameters.length ||
    new Set(lineage.parameters.map((row) => row.parameterKey)).size !==
      lineage.parameters.length ||
    variant.parameters.some((parameter) => !values[parameter.key])
  )
    return null;
  const adopted = (facts.enactments ?? []).find(
    (row) =>
      row.measureId === measure.id &&
      row.outcome === "enacted" &&
      row.resolvedAt <= facts.onDate,
  );
  const provisions = facts.finalProvisions.get(measure.id) ?? [];
  if (
    provisions.some(
      (row) =>
        row.applicationScope.jurisdictionId !== measure.jurisdictionId ||
        row.applicationScope.segmentKey !== null,
    )
  )
    return null;
  const draft = facts.compiledReferences.get(lineage.id)!;
  if (
    !hasRegisteredOperativeEffect(draft, mapping) ||
    provisions.length !== draft.clauses.length ||
    draft.clauses.some((clause) => {
      const matches = provisions.filter(
        (row) => row.provisionKey === clause.provisionKey,
      );
      const recorded = matches[0];
      return (
        matches.length !== 1 ||
        !recorded ||
        recorded.sectionNumber !== clause.sectionNumber ||
        recorded.heading !== clause.heading ||
        recorded.text !== clause.text ||
        !(recorded.beneficiary.kind === "general-application" &&
        clause.beneficiary.kind === "general-application"
          ? recorded.beneficiary.appliesToLabel ===
            clause.beneficiary.appliesToLabel
          : recorded.beneficiary.kind === "particularized" &&
            clause.beneficiary.kind === "particularized" &&
            recorded.beneficiary.particularization ===
              clause.beneficiary.particularization &&
            recorded.beneficiary.beneficiaryLabel ===
              clause.beneficiary.beneficiaryLabel &&
            recorded.beneficiary.placeLabel === clause.beneficiary.placeLabel &&
            recorded.beneficiary.statedGround ===
              clause.beneficiary.statedGround) ||
        recorded.fiscalExposureLabel !== clause.fiscalExposureLabel ||
        recorded.fiscalExposureMinorUnits !== clause.fiscalExposureMinorUnits ||
        recorded.fiscalPeriod !== clause.fiscalPeriod ||
        recorded.operativeEffect?.kind !== clause.operativeEffect?.kind
      );
    })
  )
    return null;
  return {
    draft,
    provisions,
    sourceRecordIds: [
      measure.id,
      lineage.id,
      ...provisions.map((row) => row.id),
      ...(adopted ? [adopted.id] : []),
    ],
  };
}

export function compileAutomaticLawDraft(input: {
  readonly facts: AutomaticLawFacts;
  readonly jurisdictionId: EntityId;
  readonly propositionId: EntityId;
  readonly answer: "yes" | "no";
  readonly designation: string;
  readonly intakeKey: string;
  readonly sponsorPersonId?: EntityId;
  readonly governmentLevel?: AutomaticLawGovernmentLevel;
  readonly context?: AutomaticLawCompileContext;
}): AutomaticSponsorDraft | CompileAction | null {
  const facts = input.facts;
  const proposition = facts.policyCatalog.propositions[input.propositionId];
  const sponsor = input.sponsorPersonId;
  if (!proposition || !sponsor || !facts.personIds.has(sponsor)) return null;
  const leaning = principledLeaning(facts, sponsor, proposition.id);
  const maximumScore =
    4 *
    (proposition.principles ?? []).reduce(
      (sum, row) => sum + (row.weight ?? 1),
      0,
    );
  if (
    !leaning.recordIds.length ||
    !maximumScore ||
    (input.answer === "yes" ? leaning.score : -leaning.score) <= 0
  )
    return null;
  const governmentLevel =
    input.context?.governmentLevel ?? input.governmentLevel ?? "state";
  if (
    !facts.policyCatalog.issues[proposition.issueId]?.levels?.includes(
      governmentLevel,
    )
  )
    return null;
  const candidates = facts.mappings
    .filter(
      (mapping) =>
        mapping.propositionKey === proposition.stableKey &&
        mapping.answer === input.answer &&
        mapping.governmentLevel === governmentLevel,
    )
    .filter((mapping) => {
      const context =
        input.context ??
        facts.contexts.get(
          `${input.jurisdictionId}:${mapping.familyKey}:${mapping.variantKey}`,
        ) ??
        null;
      return (
        context &&
        contextSupportsMapping(facts, context, input.jurisdictionId, mapping)
      );
    });
  if (!candidates.length) return null;
  const currentLaw =
    facts.laws.get(`${input.jurisdictionId}:${proposition.id}`) ?? null;
  if (currentLaw?.origin !== "enacted") return null;
  const currentMeasure =
    facts.measures.find((row) => row.id === currentLaw.measureId) ?? null;
  if (!currentMeasure || currentMeasure.jurisdictionId !== input.jurisdictionId)
    return null;
  const targetPopulation = facts.populationByJurisdiction.get(
    input.jurisdictionId,
  );
  if (
    !targetPopulation ||
    targetPopulation <= 0 ||
    !Number.isFinite(targetPopulation)
  )
    return null;
  const currentLineages = (facts.lineages ?? []).filter(
    (row) =>
      row.measureId === currentMeasure.id &&
      row.componentKey === undefined &&
      row.recordedAt <= facts.onDate &&
      row.compiledAt <= facts.onDate,
  );
  if (currentLineages.length !== 1) return null;
  const currentLineage = currentLineages[0]!;
  const currentMapping = facts.mappings.find(
    (row) =>
      row.familyKey === currentLineage.familyKey &&
      row.variantKey === currentLineage.variantKey &&
      row.propositionKey === proposition.stableKey &&
      row.governmentLevel === governmentLevel &&
      row.answer === currentLaw.answer,
  );
  if (!currentMapping) return null;
  const current = verifiedReferenceDraft(
    facts,
    currentMeasure,
    currentLineage,
    currentMapping,
    input.context,
  );
  const currentAmount =
    current?.draft.parameterValues[currentMapping.effectParameterKey];
  if (!current || currentAmount?.kind !== "money") return null;
  const references = (facts.lineages ?? []).flatMap((lineage) => {
    if (
      lineage.componentKey !== undefined ||
      lineage.compiledAt > facts.onDate ||
      lineage.recordedAt > facts.onDate
    )
      return [];
    const measure =
      facts.measures.find((row) => row.id === lineage.measureId) ?? null;
    if (
      !measure ||
      measure.id === currentMeasure.id ||
      measure.introducedAt > facts.onDate ||
      !(measure.propositionAnswers ?? []).some(
        (row) =>
          row.propositionId === proposition.id && row.answer === input.answer,
      )
    )
      return [];
    const mapping = candidates.find(
      (row) =>
        row.familyKey === lineage.familyKey &&
        row.variantKey === lineage.variantKey,
    );
    if (!mapping || mapping.familyKey !== currentMapping.familyKey) return [];
    const context =
      input.context ??
      facts.contexts.get(
        `${input.jurisdictionId}:${mapping.familyKey}:${mapping.variantKey}`,
      ) ??
      null;
    if (
      !context ||
      lineage.authorityKey !== context.predicateAuthority.authorityKey
    )
      return [];
    const sourceMapping = facts.mappings.find(
      (row) =>
        row.familyKey === mapping.familyKey &&
        row.variantKey === mapping.variantKey &&
        row.propositionKey === proposition.stableKey &&
        row.answer === input.answer &&
        (input.context &&
        contextSupportsMapping(
          facts,
          input.context,
          measure.jurisdictionId,
          row,
        )
          ? input.context
          : (facts.contexts.get(
              `${measure.jurisdictionId}:${row.familyKey}:${row.variantKey}`,
            ) ?? null)),
    );
    if (!sourceMapping) return [];
    const source = verifiedReferenceDraft(
      facts,
      measure,
      lineage,
      sourceMapping,
      input.context,
    );
    const amount = source?.draft.parameterValues[mapping.effectParameterKey];
    const population = facts.populationByJurisdiction.get(
      measure.jurisdictionId,
    );
    if (
      !source ||
      amount?.kind !== "money" ||
      !population ||
      population <= 0 ||
      !Number.isFinite(population) ||
      amount.currency !== currentAmount.currency
    )
      return [];
    const value = Math.round(
      (amount.minorUnits / population) * targetPopulation,
    );
    if (!Number.isSafeInteger(value) || value <= currentAmount.minorUnits)
      return [];
    const { variant } = facts.programVariants.get(
      `${mapping.familyKey}:${mapping.variantKey}`,
    )!;
    const amountSpec = variant.parameters.find(
      (row) => row.key === mapping.effectParameterKey,
    );
    if (
      amountSpec?.kind !== "money" ||
      value < amountSpec.minMinorUnits ||
      value > amountSpec.maxMinorUnits
    )
      return [];
    const bearings = [
      ...new Map(
        (variant.npcEligibility ?? [])
          .filter((row) => row.governmentLevel === governmentLevel)
          .map((row) => [row.propositionKey, row]),
      ).values(),
    ];
    let variantScore = 0;
    const variantReasons: EntityId[] = [];
    for (const bearing of bearings) {
      const question = facts.policyCatalog.propositionOrder
        .map((id) => facts.policyCatalog.propositions[id]!)
        .find((row) => row.stableKey === bearing.propositionKey);
      if (!question) continue;
      const reason = principledLeaning(facts, sponsor, question.id);
      variantScore += (bearing.answer === "yes" ? 1 : -1) * reason.score;
      variantReasons.push(...reason.recordIds);
    }
    return [
      {
        value,
        mapping,
        source,
        measure,
        context,
        variantScore,
        variantReasons,
        distance: referenceDistance(
          facts,
          input.jurisdictionId,
          measure.jurisdictionId,
        ),
        lineage,
      },
    ];
  });
  const strongestVariant = Math.max(
    ...references.map((row) => row.variantScore),
  );
  if (strongestVariant <= 0) return null;
  const ranked = references
    .filter((row) => row.variantScore === strongestVariant)
    .sort(
      (a, b) =>
        a.value - b.value ||
        a.distance - b.distance ||
        b.lineage.recordedAt.localeCompare(a.lineage.recordedAt) ||
        b.lineage.sequence - a.lineage.sequence ||
        a.lineage.id.localeCompare(b.lineage.id),
    );
  const selected = selectSortedSponsorReference(
    ranked,
    Math.abs(leaning.score) / maximumScore,
  );
  if (!selected) return null;
  const request: CompileRequest = {
    familyKey: selected.mapping.familyKey,
    variantKey: selected.mapping.variantKey,
    parameterValues: {
      ...selected.source.draft.parameterValues,
      [selected.mapping.effectParameterKey]: {
        kind: "money",
        minorUnits: selected.value,
        currency: currentAmount.currency,
      },
    },
    scenarioKey: selected.context.scenarioKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId: selected.context.rulePackId,
    designation: input.designation,
    filedOn: facts.onDate,
    predicateAuthority: selected.context.predicateAuthority,
  };
  if (!facts.compiledResult) return { kind: "compile-request", request };
  const draft = facts.compiledResult;
  return hasRegisteredOperativeEffect(draft, selected.mapping)
    ? {
        ...draft,
        sponsorRequest: {
          sponsorPersonId: sponsor,
          score: leaning.score,
          referenceMeasureId: selected.measure.id,
          sourceRecordIds: [
            ...new Set([
              ...current.sourceRecordIds,
              ...selected.source.sourceRecordIds,
              ...leaning.recordIds,
              ...selected.variantReasons,
            ]),
          ],
          provisions: selected.source.provisions,
        },
      }
    : null;
}

// stopgapId: "SG-P14-legislatures-sponsor-reference-strength"

// stopgapId: "SG-P14-legislatures-sponsor-request-adapter"
