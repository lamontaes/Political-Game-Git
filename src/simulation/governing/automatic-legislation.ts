import {
  finalTermProvisions,
  readFinalEnactedLawTerm,
} from "./final-law-term-query";
export {
  readFinalEnactedLawTerm,
  type FinalEnactedLawTerm,
  readFinalEnactedLawCategories,
  type FinalEnactedLawCategories,
  readFinalEnactedLawSchedule,
  type FinalEnactedLawSchedule,
} from "./final-law-term-query";
import {
  compileBillDraft,
  draftScope,
  type CompiledBillDraft,
} from "../legislation-drafting";
import { addDays } from "../dates";
import {
  introduceMeasure,
  measureActions,
  measureById,
  measurePosition,
} from "../legislation";
import {
  recordFiledProvision,
  type RecordFiledProvisionInput,
} from "../legislative-politics";
import type { LawAmountUnit } from "../law-consequence-types";
import { lawInForce } from "./law-in-force";
import { principledLeaning } from "./officeholder-principles";
import {
  censusRegionOf,
  censusRegionStates,
} from "../world-setup/census-regions";
import { publicBudgetFor } from "../public-budgets/store";
import { recordWorldEvent } from "../world";
import {
  draftParameterValues,
  recordDraftLineage,
} from "../legislation-draft-lineage";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import {
  npcEligibleProgramConfigurations,
  npcEligibleProgramConfigurationsFor,
  programVariant,
  standingAuthority,
  type NpcEligibleProgramConfiguration,
} from "../legislation-program-families";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "../legislative-institutions";
import { legislativeWorkKey } from "../legislative-work-key";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
  stateJurisdictionForKey,
  stateKeyForJurisdictionSlug,
} from "../life-places";
import { rulePackById } from "../legislature-rule-packs";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { TRANSIT_PROGRAM_KEY } from "../legislation-transit-families";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureNumberingSession,
  LegislativeMeasureRecord,
  LegislativeDraftLineageRecord,
  LegislativeProvisionRecord,
  World,
} from "../types";
import type { PredicateAuthority } from "../legislation-content-contracts";

/**
 * A deliberately closed list of automatic law opportunities.
 *
 * A proposition mapping says which authored policy position a configuration
 * actually carries; the answer says which direction the operative text takes.
 * It does not infer a match from a subject label or nearby wording. The first
 * declared component is eligible only for its exact proposition, answer,
 * government level, authority and compiled operative effect. Similar subject
 * labels at other levels do not make a component transferable.
 */
export type AutomaticLawGovernmentLevel =
  "federal" | "state" | "county" | "municipality";

export type AutomaticLawPositionMapping = NpcEligibleProgramConfiguration;

export interface AutomaticLawCompileContext {
  readonly governmentLevel: AutomaticLawGovernmentLevel;
  readonly jurisdictionId: EntityId;
  readonly rulePackId: string;
  readonly scenarioKey: string;
  readonly predicateAuthority: PredicateAuthority;
}

export interface SponsorLawTermRequest {
  readonly measureId: EntityId;
  readonly questionKey: string;
  readonly termKey: string;
  readonly unit: LawAmountUnit;
  /** The declared numeric direction of supporting this question, not an inferred rate. */
  readonly supportDirection: "raise" | "lower";
  readonly basis: "term" | "appropriation-per-resident";
}
export interface SponsorRequestedLawTerm {
  readonly value: number;
  readonly unit: LawAmountUnit;
  readonly referenceMeasureId: EntityId;
  readonly referenceProvisionId: EntityId;
  readonly principleRecordIds: readonly EntityId[];
  readonly score: number;
  readonly sourceRecordIds: readonly EntityId[];
}

/** Transient compiler provenance; saved through the existing provision and event writers. */
interface AutomaticSponsorDraft extends CompiledBillDraft {
  readonly sponsorRequest?: {
    readonly sponsorPersonId: EntityId;
    readonly score: number;
    readonly referenceMeasureId: EntityId;
    readonly sourceRecordIds: readonly EntityId[];
    readonly provisions: readonly LegislativeProvisionRecord[];
  };
}

function referenceDistance(world: World, target: EntityId, source: EntityId) {
  const targetState = referenceState(world, target);
  const sourceState = referenceState(world, source);
  if (targetState && sourceState === targetState) return 0;
  const states = new Set(censusRegionStates());
  return targetState &&
    sourceState &&
    states.has(targetState) &&
    states.has(sourceState) &&
    censusRegionOf(targetState) === censusRegionOf(sourceState)
    ? 1
    : 2;
}

function selectSortedSponsorReference<T extends { readonly value: number }>(
  references: readonly T[],
  strength: number,
): T | null {
  const unique = references.filter(
    (row, index) => index === 0 || row.value !== references[index - 1]!.value,
  );
  return unique.length
    ? unique[Math.floor(Math.min(1, strength) * (unique.length - 1))]!
    : null;
}

function referenceState(world: World, jurisdictionId: EntityId): string | null {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  return (
    (jurisdiction ? stateKeyForJurisdiction(jurisdiction)?.slice(3) : null) ??
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey?.slice(3) ??
    null
  );
}

/** CTO reference mechanism: recorded principles select an existing value, with no new level. */
export function sponsorRequestedLawTerm(
  world: World,
  input: SponsorLawTermRequest,
): SponsorRequestedLawTerm | null {
  const measure = measureById(world, input.measureId);
  const question = world.policyCatalog.propositionOrder
    .map((id) => world.policyCatalog.propositions[id]!)
    .find((row) => row.stableKey === input.questionKey);
  if (
    !measure?.sponsorPersonId ||
    !question ||
    !(measure.propositionIds ?? []).includes(question.id)
  )
    return null;
  const leaning = principledLeaning(
    world,
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
  const currentLaw = lawInForce(world, measure.jurisdictionId, question.id);
  const current = currentLaw
    ? readFinalEnactedLawTerm(world, currentLaw, input)
    : null;
  if (!current) return null;
  const targetPopulation =
    input.basis === "appropriation-per-resident"
      ? publicBudgetFor(world, measure.jurisdictionId)?.population
      : null;
  if (
    input.basis === "appropriation-per-resident" &&
    (input.unit !== "minor" ||
      !(targetPopulation && targetPopulation > 0) ||
      !Number.isFinite(targetPopulation))
  )
    return null;
  const increasing = leaning.score > 0 === (input.supportDirection === "raise");
  const targetState = referenceState(world, measure.jurisdictionId);
  const knownRegions = new Set(censusRegionStates());
  const targetRegion =
    targetState && knownRegions.has(targetState)
      ? censusRegionOf(targetState)
      : null;
  const references = (world.history.legislativeMeasures ?? [])
    .flatMap((reference) => {
      if (
        reference.id === measure.id ||
        reference.introducedAt > world.currentDate ||
        !(reference.propositionIds ?? []).includes(question.id)
      )
        return [];
      const sourcePopulation =
        input.basis === "appropriation-per-resident"
          ? publicBudgetFor(world, reference.jurisdictionId)?.population
          : null;
      if (
        input.basis === "appropriation-per-resident" &&
        (!(sourcePopulation && sourcePopulation > 0) ||
          !Number.isFinite(sourcePopulation))
      )
        return [];
      const state = referenceState(world, reference.jurisdictionId);
      const region =
        state && knownRegions.has(state) ? censusRegionOf(state) : null;
      const distance =
        targetState && state === targetState
          ? 0
          : targetRegion && region === targetRegion
            ? 1
            : 2;
      const adopted = (world.history.legislativeEnactments ?? []).find(
        (row) =>
          row.measureId === reference.id &&
          row.outcome === "enacted" &&
          row.resolvedAt <= world.currentDate,
      );
      const provisions = finalTermProvisions(
        world,
        reference.id,
        adopted?.sequence,
      );
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

/** Files the requested number through the existing provision writer and preserves its reason. */
export function recordSponsorRequestedLawTerm(
  world: World,
  input: SponsorLawTermRequest & {
    readonly provision: Omit<
      RecordFiledProvisionInput,
      "measureId" | "lawTerms" | "text"
    >;
    readonly renderText: (term: SponsorRequestedLawTerm) => string;
  },
): {
  readonly world: World;
  readonly provision: LegislativeProvisionRecord | null;
} {
  const existing = (world.history.legislativeProvisions ?? []).find(
    (row) => row.stableKey === input.provision.stableKey,
  );
  if (existing) {
    if (existing.measureId !== input.measureId)
      throw new Error("A requested term's key belongs to another measure.");
    return { world, provision: existing };
  }
  if (measurePosition(world, input.measureId).terminal)
    throw new Error("A terminal measure cannot acquire a new requested term.");
  const term = sponsorRequestedLawTerm(world, input);
  if (!term) return { world, provision: null };
  let next = recordFiledProvision(world, {
    ...input.provision,
    measureId: input.measureId,
    text: input.renderText(term),
    lawTerms: [
      {
        questionKey: input.questionKey,
        key: input.termKey,
        value: term.value,
        unit: term.unit,
      },
    ],
  });
  const measure = measureById(next, input.measureId)!;
  next = recordWorldEvent(next, {
    stableKey: `${input.provision.stableKey}:requested-term-reason`,
    type: "legislation.sponsor-requested-term",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [measure.id, measure.sponsorPersonId!],
    participants: [
      {
        personId: measure.sponsorPersonId!,
        role: "agency:sponsor",
        detail:
          "Requested the numeric term from recorded principles and an existing bill.",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      ...term.sourceRecordIds.map((id) => `source-record:${id}`),
      `term:${input.termKey}`,
      `principle-score:${term.score}`,
    ],
    summary: `The sponsor requested ${input.provision.heading} from a recorded legislative reference.`,
    context: {
      location: {
        jurisdictionId: measure.jurisdictionId,
        label: world.jurisdictions[measure.jurisdictionId]!.name,
        setting: null,
      },
      socialContext: measure.designation,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return {
    world: next,
    provision: next.history.legislativeProvisions!.find(
      (row) => row.stableKey === input.provision.stableKey,
    )!,
  };
}

/** Resolve a bank-declared game profile against a saved public jurisdiction. */
function profileContextForMapping(
  world: World,
  jurisdictionId: EntityId,
  mapping: AutomaticLawPositionMapping,
): AutomaticLawCompileContext | null {
  const { variant } = programVariant(mapping.familyKey, mapping.variantKey);
  const service = variant.npcServiceProfile;
  const amountDefault = variant.defaults[mapping.effectParameterKey];
  if (
    mapping.authorityKind === "game-profile" &&
    service?.profileIdScope === "local-government"
  )
    return null;

  const governmentLevel = mapping.governmentLevel;
  let rulePackId: string;
  let scenarioKey: string;
  if (governmentLevel === "state") {
    const savedJurisdiction = world.jurisdictions[jurisdictionId];
    const jurisdictionKey = savedJurisdiction
      ? stateKeyForJurisdictionSlug(savedJurisdiction.slug)
      : null;
    if (!jurisdictionKey?.startsWith("US-")) return null;
    const usps = jurisdictionKey.slice(3) as (typeof US_STATE_USPS)[number];
    if (
      !US_STATE_USPS.includes(usps) ||
      stateJurisdictionForKey(jurisdictionKey)?.id !== jurisdictionId
    )
      return null;
    const pack = legislativePackForJurisdiction(jurisdictionId);
    if (!pack) return null;
    try {
      if (rulePackById(pack.packId).jurisdictionKey !== jurisdictionKey)
        return null;
    } catch {
      return null;
    }
    rulePackId = pack.packId;
    scenarioKey = legislativeWorkKey(pack);
  } else if (governmentLevel === "federal") {
    if (world.jurisdictions[jurisdictionId]?.kind !== "federal") return null;
    const pack = legislativePackForJurisdiction(jurisdictionId);
    if (!pack) return null;
    rulePackId = pack.packId;
    scenarioKey = legislativeWorkKey(pack);
  } else {
    return null;
  }

  const authority: PredicateAuthority | null =
    mapping.authorityKind === "standing-statute"
      ? mapping.authorityKey
        ? standingAuthority(mapping.authorityKey)
        : null
      : amountDefault?.kind === "money"
        ? {
            kind: "game-profile",
            authorityKey:
              mapping.authorityKey ??
              (governmentLevel === "state"
                ? TRANSIT_PROGRAM_KEY
                : `automatic:${mapping.familyKey}/${mapping.variantKey}:${jurisdictionId}`),
            authorityVersion: `automatic-law-authority/${mapping.familyKey}/${mapping.variantKey}/v1`,
            profileVersion:
              service?.profileId ??
              `automatic-law-profile/${mapping.familyKey}/${mapping.variantKey}/v1`,
            rulePackId,
            governmentLevel,
            publicGovernmentIdentity: { kind: "jurisdiction", jurisdictionId },
            permittedEffects: [mapping.operativeEffectKind],
            citationLabel: `${world.jurisdictions[jurisdictionId]?.slug ?? jurisdictionId} ${service?.serviceLabel ?? variant.label} game profile`,
            programLabel: service?.serviceLabel ?? variant.label,
            authorizedCeilingMinorUnits: null,
            currency: amountDefault.currency,
            basis: "game-profile",
          }
        : null;
  if (!authority) return null;
  return {
    governmentLevel,
    jurisdictionId,
    rulePackId,
    scenarioKey,
    predicateAuthority: authority,
  };
}

/** Compatibility gate for state intake; authority is resolved per bank row. */
export function stateTransitAutomaticLawContext(
  world: World,
  jurisdictionId: EntityId,
): AutomaticLawCompileContext | null {
  const mapping = AUTOMATIC_LAW_POSITION_MAPPINGS.find(
    (entry) => entry.governmentLevel === "state",
  );
  return mapping
    ? profileContextForMapping(world, jurisdictionId, mapping)
    : null;
}

export const AUTOMATIC_LAW_QUESTION_COOLDOWN_DAYS = 365;

/**
 * Prevents an automatic producer from repeatedly toggling the same supported
 * question. Only explicitly answered measures in that producer's persisted
 * key namespace count, and the window starts at a terminal legislative action.
 */
export function automaticLawQuestionOnCooldown(
  world: World,
  input: {
    readonly jurisdictionId: EntityId;
    readonly propositionId: EntityId;
    readonly stableKeyPrefix: string;
    readonly asOf?: IsoDate;
    readonly cooldownDays?: number;
  },
): boolean {
  if (!input.stableKeyPrefix) return false;
  const cooldownDays =
    input.cooldownDays ?? AUTOMATIC_LAW_QUESTION_COOLDOWN_DAYS;
  if (!Number.isSafeInteger(cooldownDays) || cooldownDays < 0) {
    throw new Error(
      "The automatic-law cooldown must be a non-negative integer.",
    );
  }
  const asOf = input.asOf ?? world.currentDate;
  return (world.history.legislativeMeasures ?? []).some((measure) => {
    if (
      measure.origin !== "member-introduction" ||
      measure.jurisdictionId !== input.jurisdictionId ||
      !measure.stableKey.startsWith(input.stableKeyPrefix) ||
      !(measure.propositionAnswers ?? []).some(
        (row) => row.propositionId === input.propositionId,
      )
    )
      return false;
    if (!measurePosition(world, measure.id).terminal) return false;
    const terminalAction = measureActions(world, measure.id).at(-1);
    if (!terminalAction) return false;
    return asOf < addDays(terminalAction.occurredAt, cooldownDays);
  });
}

export const AUTOMATIC_LAW_POSITION_MAPPINGS =
  npcEligibleProgramConfigurations();

function mappingsFor(
  propositionKey: string,
  answer: "yes" | "no",
  governmentLevel: AutomaticLawGovernmentLevel = "state",
): readonly AutomaticLawPositionMapping[] {
  return npcEligibleProgramConfigurationsFor(
    propositionKey,
    answer,
    governmentLevel,
  );
}

function mappingFor(
  propositionKey: string,
  answer: "yes" | "no",
  governmentLevel: AutomaticLawGovernmentLevel = "state",
): AutomaticLawPositionMapping | null {
  return mappingsFor(propositionKey, answer, governmentLevel)[0] ?? null;
}

export function automaticLawPropositionKeysForLevel(
  governmentLevel: AutomaticLawGovernmentLevel,
): readonly string[] {
  return [
    ...new Set(
      AUTOMATIC_LAW_POSITION_MAPPINGS.filter(
        (mapping) => mapping.governmentLevel === governmentLevel,
      ).map((mapping) => mapping.propositionKey),
    ),
  ];
}

export function automaticLawMappingFor(
  propositionKey: string,
  answer: "yes" | "no",
  governmentLevel: AutomaticLawGovernmentLevel = "state",
): AutomaticLawPositionMapping | null {
  return mappingFor(propositionKey, answer, governmentLevel);
}

function authorityAllowsAppropriation(authority: PredicateAuthority): boolean {
  if ("permittedEffects" in authority)
    return authority.permittedEffects.includes("public-program-appropriation");
  return "authorizesSpending" in authority && authority.authorizesSpending;
}

function contextSupportsMapping(
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
      ? legislativePackForJurisdiction(jurisdictionId)
      : legislativePackForWorkKey(context.scenarioKey);
  if (!pack || pack.packId !== context.rulePackId) return false;
  if (
    mapping.governmentLevel === "federal" &&
    context.scenarioKey !== legislativeWorkKey(pack)
  )
    return false;
  return true;
}

/**
 * The exact current consumer tuple for an automatic state appropriation.
 *
 * Until the clause carries that closed intent and the exact positive amount
 * compiled from its appropriation parameter, this numeric compiler is unsupported. Funding caps and informative clauses do not count as an operative
 * public-program appropriation.
 */
function hasRegisteredOperativeEffect(
  draft: CompiledBillDraft,
  mapping: AutomaticLawPositionMapping,
): boolean {
  // This consumer currently writes public-program appropriations only. Other
  // declared effect kinds remain ineligible until their own World writer exists.
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

/** A filing lineage is usable only while its exact final clauses still carry those terms. */
function verifiedReferenceDraft(
  world: World,
  measure: LegislativeMeasureRecord,
  lineage: LegislativeDraftLineageRecord,
  mapping: AutomaticLawPositionMapping,
  suppliedContext?: AutomaticLawCompileContext,
) {
  const context =
    suppliedContext &&
    contextSupportsMapping(suppliedContext, measure.jurisdictionId, mapping)
      ? suppliedContext
      : profileContextForMapping(world, measure.jurisdictionId, mapping);
  if (
    !context ||
    !contextSupportsMapping(context, measure.jurisdictionId, mapping)
  )
    return null;
  const { family, variant } = programVariant(
    mapping.familyKey,
    mapping.variantKey,
  );
  if (
    lineage.familyVersion !== family.familyVersion ||
    lineage.authorityKey !== context.predicateAuthority.authorityKey
  )
    return null;
  const values = draftParameterValues(lineage);
  if (
    lineage.parameters.length !== variant.parameters.length ||
    new Set(lineage.parameters.map((row) => row.parameterKey)).size !==
      lineage.parameters.length ||
    variant.parameters.some((parameter) => !values[parameter.key])
  )
    return null;
  const adopted = (world.history.legislativeEnactments ?? []).find(
    (row) =>
      row.measureId === measure.id &&
      row.outcome === "enacted" &&
      row.resolvedAt <= world.currentDate,
  );
  const provisions = finalTermProvisions(world, measure.id, adopted?.sequence);
  if (
    provisions.some(
      (row) =>
        row.applicationScope.jurisdictionId !== measure.jurisdictionId ||
        row.applicationScope.segmentKey !== null,
    )
  )
    return null;
  const draft = compileBillDraft({
    familyKey: mapping.familyKey,
    variantKey: mapping.variantKey,
    parameterValues: values,
    scenarioKey: context.scenarioKey,
    jurisdictionId: measure.jurisdictionId,
    rulePackId: context.rulePackId,
    designation: measure.designation,
    filedOn: measure.introducedAt,
    predicateAuthority: context.predicateAuthority,
  });
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

/**
 * Automatic terms come from the real sponsor's principles and verified saved law.
 * Missing current terms or references leave the numeric compiler unsupported;
 * the agenda caller can still file the member's plain policy answer.
 */
export function compileAutomaticLawDraft(input: {
  readonly world: World;
  readonly jurisdictionId: EntityId;
  readonly propositionId: EntityId;
  readonly answer: "yes" | "no";
  readonly designation: string;
  readonly intakeKey: string;
  readonly sponsorPersonId?: EntityId;
  readonly governmentLevel?: AutomaticLawGovernmentLevel;
  readonly context?: AutomaticLawCompileContext;
}): AutomaticSponsorDraft | null {
  const world = input.world;
  const proposition = world.policyCatalog.propositions[input.propositionId];
  const sponsor = input.sponsorPersonId;
  if (!proposition || !sponsor || !world.people[sponsor]) return null;
  const leaning = principledLeaning(world, sponsor, proposition.id);
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
    !world.policyCatalog.issues[proposition.issueId]?.levels?.includes(
      governmentLevel,
    )
  )
    return null;
  const candidates = mappingsFor(
    proposition.stableKey,
    input.answer,
    governmentLevel,
  ).filter((mapping) => {
    const context =
      input.context ??
      profileContextForMapping(world, input.jurisdictionId, mapping);
    return (
      context && contextSupportsMapping(context, input.jurisdictionId, mapping)
    );
  });
  if (!candidates.length) return null;
  const currentLaw = lawInForce(world, input.jurisdictionId, proposition.id);
  if (currentLaw?.origin !== "enacted") return null;
  const currentMeasure = measureById(world, currentLaw.measureId);
  // A higher-level law does not supply a fictitious local program or local budget.
  if (!currentMeasure || currentMeasure.jurisdictionId !== input.jurisdictionId)
    return null;
  const targetPopulation = publicBudgetFor(
    world,
    input.jurisdictionId,
  )?.population;
  if (
    !targetPopulation ||
    targetPopulation <= 0 ||
    !Number.isFinite(targetPopulation)
  )
    return null;
  const currentLineages = (world.history.legislativeDraftLineages ?? []).filter(
    (row) =>
      row.measureId === currentMeasure.id &&
      row.componentKey === undefined &&
      row.recordedAt <= world.currentDate &&
      row.compiledAt <= world.currentDate,
  );
  if (currentLineages.length !== 1) return null;
  const currentLineage = currentLineages[0]!;
  const currentMapping = AUTOMATIC_LAW_POSITION_MAPPINGS.find(
    (row) =>
      row.familyKey === currentLineage.familyKey &&
      row.variantKey === currentLineage.variantKey &&
      row.propositionKey === proposition.stableKey &&
      row.governmentLevel === governmentLevel &&
      row.answer === currentLaw.answer,
  );
  if (!currentMapping) return null;
  const current = verifiedReferenceDraft(
    world,
    currentMeasure,
    currentLineage,
    currentMapping,
    input.context,
  );
  const currentAmount =
    current?.draft.parameterValues[currentMapping.effectParameterKey];
  if (!current || currentAmount?.kind !== "money") return null;
  const references = (world.history.legislativeDraftLineages ?? []).flatMap(
    (lineage) => {
      if (
        lineage.componentKey !== undefined ||
        lineage.compiledAt > world.currentDate ||
        lineage.recordedAt > world.currentDate
      )
        return [];
      const measure = measureById(world, lineage.measureId);
      if (
        !measure ||
        measure.id === currentMeasure.id ||
        measure.introducedAt > world.currentDate ||
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
        profileContextForMapping(world, input.jurisdictionId, mapping);
      if (
        !context ||
        lineage.authorityKey !== context.predicateAuthority.authorityKey
      )
        return [];
      const sourceMapping = AUTOMATIC_LAW_POSITION_MAPPINGS.find(
        (row) =>
          row.familyKey === mapping.familyKey &&
          row.variantKey === mapping.variantKey &&
          row.propositionKey === proposition.stableKey &&
          row.answer === input.answer &&
          (input.context &&
          contextSupportsMapping(input.context, measure.jurisdictionId, row)
            ? input.context
            : profileContextForMapping(world, measure.jurisdictionId, row)),
      );
      if (!sourceMapping) return [];
      const source = verifiedReferenceDraft(
        world,
        measure,
        lineage,
        sourceMapping,
        input.context,
      );
      const amount = source?.draft.parameterValues[mapping.effectParameterKey];
      const population = publicBudgetFor(
        world,
        measure.jurisdictionId,
      )?.population;
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
      // This admitted consumer is an expansion appropriation, not an inferred numeric policy direction.
      if (!Number.isSafeInteger(value) || value <= currentAmount.minorUnits)
        return [];
      const { variant } = programVariant(mapping.familyKey, mapping.variantKey);
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
        const question = world.policyCatalog.propositionOrder
          .map((id) => world.policyCatalog.propositions[id]!)
          .find((row) => row.stableKey === bearing.propositionKey);
        if (!question) continue;
        const reason = principledLeaning(world, sponsor, question.id);
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
            world,
            input.jurisdictionId,
            measure.jurisdictionId,
          ),
          lineage,
        },
      ];
    },
  );
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
  // Copy every declared service/eligibility/timing choice from the selected verified reference.
  // No option-bearing declaration exists for an independent service-window change.
  const draft = compileBillDraft({
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
    filedOn: world.currentDate,
    predicateAuthority: selected.context.predicateAuthority,
  });
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

/**
 * Keeps measure, compiler, and catalog identities joined before any writer is
 * called. A measure's proposition is aboutness; the mapping above is what
 * establishes the direction its compiled sections actually take.
 */
export function automaticDraftMatchesMeasure(
  world: World,
  measure: LegislativeMeasureRecord,
  draft: CompiledBillDraft,
  governmentLevel: AutomaticLawGovernmentLevel = "state",
): boolean {
  if (
    measure.jurisdictionId !== draft.jurisdictionId ||
    measure.rulePackId !== draft.rulePackId ||
    measure.designation !== draft.designation ||
    measure.introducedAt !== draft.filedOn ||
    measure.shortTitle !== draft.shortTitle ||
    measure.summary !== draft.summary ||
    measure.subjectClass !== draft.subjectClass
  )
    return false;
  const scenarioPack = legislativePackForWorkKey(draft.scenarioKey);
  if (
    !scenarioPack ||
    scenarioPack.packId !== measure.rulePackId ||
    (legislativeWorkKey(scenarioPack) !== draft.scenarioKey &&
      `institution:${scenarioPack.packId}` !== draft.scenarioKey)
  )
    return false;
  const propositionIds = measure.propositionIds ?? [];
  const answers = measure.propositionAnswers ?? [];
  if (propositionIds.length !== 1 || answers.length !== 1) return false;
  const proposition = world.policyCatalog.propositions[propositionIds[0]!];
  if (!proposition) return false;
  const answer = answers[0]!.answer;
  const mapping = mappingsFor(
    proposition.stableKey,
    answer,
    governmentLevel,
  ).find(
    (candidate) =>
      candidate.familyKey === draft.familyKey &&
      candidate.variantKey === draft.variantKey,
  );
  if (!mapping) return false;
  const issue = world.policyCatalog.issues[proposition.issueId];
  if (!(issue?.levels?.includes(governmentLevel) ?? false)) return false;
  const registeredAuthority =
    mapping.authorityKind === "standing-statute" && mapping.authorityKey
      ? standingAuthority(mapping.authorityKey)
      : null;
  const predicateAuthority = draft.predicateAuthority;
  if (
    !predicateAuthority ||
    !authorityAllowsAppropriation(predicateAuthority) ||
    predicateAuthority.kind !== mapping.authorityKind ||
    (mapping.authorityKind === "game-profile" &&
      (predicateAuthority.kind !== "game-profile" ||
        predicateAuthority.governmentLevel !== governmentLevel ||
        predicateAuthority.rulePackId !== measure.rulePackId ||
        predicateAuthority.publicGovernmentIdentity.jurisdictionId !==
          measure.jurisdictionId ||
        !predicateAuthority.authorityKey.trim() ||
        ((governmentLevel === "county" || governmentLevel === "municipality") &&
          predicateAuthority.publicGovernmentIdentity.kind !==
            "local-government") ||
        (governmentLevel === "federal" &&
          (predicateAuthority.publicGovernmentIdentity.kind !==
            "jurisdiction" ||
            measure.jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id)))) ||
    (mapping.authorityKey !== null &&
      predicateAuthority.authorityKey !== mapping.authorityKey) ||
    (mapping.authorityKind === "standing-statute" && !registeredAuthority)
  )
    return false;
  const { family } = programVariant(mapping.familyKey, mapping.variantKey);
  return (
    (mapping.authorityKey === null ||
      draft.predicateAuthority?.authorityKey === mapping.authorityKey) &&
    answers[0]!.propositionId === proposition.id &&
    draft.propositionKeys.includes(proposition.stableKey) &&
    draft.familyVersion === family.familyVersion &&
    mapping.familyKey === draft.familyKey &&
    mapping.variantKey === draft.variantKey
  );
}

/**
 * Persist the exact compiled clauses and their provenance before clock
 * scheduling. This boundary deliberately refuses an older provision writer
 * that drops an explicitly compiled effect tag.
 */
export function recordCompiledDraftOnMeasure(
  world: World,
  input: {
    readonly measureId: EntityId;
    readonly draft: AutomaticSponsorDraft;
    readonly provenanceNote: string;
    readonly governmentLevel?: AutomaticLawGovernmentLevel;
  },
): World {
  const measure = measureById(world, input.measureId);
  if (!measure) throw new Error(`Measure not found: ${input.measureId}`);
  const governmentLevel = input.governmentLevel ?? "state";
  if (
    !automaticDraftMatchesMeasure(world, measure, input.draft, governmentLevel)
  ) {
    throw new Error(
      `${measure.designation} does not match its compiled automatic draft.`,
    );
  }
  if (!input.provenanceNote.trim()) {
    throw new Error("An automatic draft lineage needs its recorded reason.");
  }
  const propositionId = measure.propositionIds?.[0];
  const proposition = propositionId
    ? world.policyCatalog.propositions[propositionId]
    : undefined;
  const answer = measure.propositionAnswers?.[0]?.answer;
  const effectMapping =
    proposition && answer
      ? mappingsFor(proposition.stableKey, answer, governmentLevel).find(
          (mapping) =>
            mapping.familyKey === input.draft.familyKey &&
            mapping.variantKey === input.draft.variantKey,
        )
      : undefined;
  if (
    !effectMapping ||
    !hasRegisteredOperativeEffect(input.draft, effectMapping)
  ) {
    throw new Error(
      `${measure.designation} has no supported, positively funded effect clause.`,
    );
  }

  let next = world;
  const scope = draftScope(input.draft);
  for (const clause of input.draft.clauses) {
    const operativeEffect = clause.operativeEffect;
    const reference = input.draft.sponsorRequest?.provisions.find(
      (row) => row.provisionKey === clause.provisionKey,
    );
    const lawTerms = reference?.lawTerms
      ?.filter((row) => row.questionKey === proposition?.stableKey)
      .map((row) => ({
        ...row,
        value:
          row.key === effectMapping.effectParameterKey &&
          row.unit === "minor" &&
          clause.provisionKey === effectMapping.effectProvisionKey
            ? input.draft.appropriatedMinorUnits!
            : row.value,
      }));
    const lawCategories = reference?.lawCategories?.filter(
      (row) => row.questionKey === proposition?.stableKey,
    );
    const provisionInput = {
      stableKey: `${measure.stableKey}:draft:${input.draft.familyKey}:${input.draft.variantKey}:${clause.provisionKey}`,
      measureId: measure.id,
      provisionKey: clause.provisionKey,
      sectionNumber: clause.sectionNumber,
      heading: clause.heading,
      text: clause.text,
      beneficiary: clause.beneficiary,
      applicationScope: scope,
      fiscalExposureLabel: clause.fiscalExposureLabel,
      fiscalExposureMinorUnits: clause.fiscalExposureMinorUnits,
      ...(clause.fiscalPeriod !== undefined
        ? { fiscalPeriod: clause.fiscalPeriod }
        : {}),
      ...(operativeEffect ? { operativeEffect } : {}),
      ...(lawTerms?.length ? { lawTerms } : {}),
      ...(lawCategories ? { lawCategories } : {}),
    };
    next = recordFiledProvision(next, provisionInput);
    if (operativeEffect) {
      const filed = next.history.legislativeProvisions?.find(
        (row) => row.stableKey === provisionInput.stableKey,
      );
      if (!filed || filed.operativeEffect?.kind !== operativeEffect.kind) {
        throw new Error(
          `The provision writer dropped the compiled ${operativeEffect.kind} intent for '${clause.provisionKey}'.`,
        );
      }
    }
  }

  const authority = input.draft.predicateAuthority;
  next = recordDraftLineage(next, {
    stableKey: `${measure.stableKey}:draft-lineage`,
    measureId: measure.id,
    familyKey: input.draft.familyKey,
    familyVersion: input.draft.familyVersion,
    variantKey: input.draft.variantKey,
    compiledAt: input.draft.filedOn,
    parameterValues: input.draft.parameterValues,
    provenanceNote: input.provenanceNote,
    ...(authority ? { authorityKey: authority.authorityKey } : {}),
    ...(authority?.kind === "docket-measure"
      ? { authorityMeasureId: authority.measureId as EntityId }
      : {}),
  });
  const request = input.draft.sponsorRequest;
  if (!request) return next;
  if (request.sponsorPersonId !== measure.sponsorPersonId)
    throw new Error("Requested terms belong to another sponsor.");
  return recordWorldEvent(next, {
    stableKey: `${measure.stableKey}:requested-terms-reason`,
    type: "legislation.sponsor-requested-term",
    occurredAt: measure.introducedAt,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [measure.id, request.sponsorPersonId],
    participants: [
      {
        personId: request.sponsorPersonId,
        role: "agency:sponsor",
        detail:
          "Requested this appropriation and its service choices from a verified legislative reference.",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      ...request.sourceRecordIds.map((id) => `source-record:${id}`),
      `reference-measure:${request.referenceMeasureId}`,
      `principle-score:${request.score}`,
    ],
    summary: `${measure.designation}'s sponsor requested the saved reference's per-resident appropriation and service choices.`,
    context: {
      location: {
        jurisdictionId: measure.jurisdictionId,
        label: world.jurisdictions[measure.jurisdictionId]!.name,
        setting: null,
      },
      socialContext: measure.designation,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * Shared write boundary for a mapped automatic bill at any admitted level.
 * The caller owns sponsor selection, exact authority resolution, chamber
 * permission, and the institution's calendar; this helper owns the canonical
 * measure, clauses, and source lineage that must agree across those routes.
 */
export function introduceAutomaticLawMeasure(
  world: World,
  input: {
    readonly jurisdictionId: EntityId;
    readonly governmentLevel?: AutomaticLawGovernmentLevel;
    readonly context?: AutomaticLawCompileContext;
    readonly propositionId: EntityId;
    readonly answer: "yes" | "no";
    readonly intakeKey: string;
    readonly stableKey: string;
    readonly designation: string;
    /** The session `designation` was numbered in, from `nextMeasureNumbering`. */
    readonly numberingSession?: LegislativeMeasureNumberingSession;
    readonly sponsorPersonId: EntityId;
    readonly originChamberKey: string;
    readonly principleRecordIds: readonly EntityId[];
    readonly principleScore: number;
  },
): {
  readonly world: World;
  readonly measureId: EntityId;
  readonly draft: AutomaticSponsorDraft;
} | null {
  const proposition = world.policyCatalog.propositions[input.propositionId];
  if (!proposition) return null;
  const governmentLevel =
    input.context?.governmentLevel ?? input.governmentLevel ?? "state";
  const mapping = mappingFor(
    proposition.stableKey,
    input.answer,
    governmentLevel,
  );
  if (!mapping) return null;
  const existing = (world.history.legislativeMeasures ?? []).find(
    (row) => row.stableKey === input.stableKey,
  );
  if (existing) {
    if (
      existing.sponsorPersonId !== input.sponsorPersonId ||
      existing.jurisdictionId !== input.jurisdictionId ||
      !(existing.propositionAnswers ?? []).some(
        (row) =>
          row.propositionId === input.propositionId &&
          row.answer === input.answer,
      )
    )
      throw new Error(
        "This automatic bill key belongs to a different sponsor or question.",
      );
    const lineage = (world.history.legislativeDraftLineages ?? []).find(
      (row) => row.measureId === existing.id && row.componentKey === undefined,
    );
    const savedMapping = lineage
      ? mappingsFor(proposition.stableKey, input.answer, governmentLevel).find(
          (row) =>
            row.familyKey === lineage.familyKey &&
            row.variantKey === lineage.variantKey,
        )
      : null;
    const saved =
      lineage && savedMapping
        ? verifiedReferenceDraft(world, existing, lineage, savedMapping)
        : null;
    return saved ? { world, measureId: existing.id, draft: saved.draft } : null;
  }
  const draft = compileAutomaticLawDraft({
    world,
    jurisdictionId: input.jurisdictionId,
    propositionId: input.propositionId,
    answer: input.answer,
    sponsorPersonId: input.sponsorPersonId,
    designation: input.designation,
    intakeKey: input.intakeKey,
    governmentLevel,
    ...(input.context ? { context: input.context } : {}),
  });
  if (!draft) return null;

  let next = introduceMeasure(world, {
    stableKey: input.stableKey,
    jurisdictionId: draft.jurisdictionId,
    rulePackId: draft.rulePackId,
    designation: input.designation,
    ...(input.numberingSession
      ? { numberingSession: input.numberingSession }
      : {}),
    shortTitle: draft.shortTitle,
    summary: draft.summary,
    origin: "member-introduction",
    subjectClass: draft.subjectClass,
    sponsorPersonId: input.sponsorPersonId,
    originChamberKey: input.originChamberKey,
    propositionIds: [input.propositionId],
    propositionAnswers: [
      { propositionId: input.propositionId, answer: input.answer },
    ],
  });
  const measure = next.history.legislativeMeasures?.at(-1);
  if (!measure)
    throw new Error(
      `${input.designation} is missing from legislative history after introduction.`,
    );
  if (!automaticDraftMatchesMeasure(next, measure, draft, governmentLevel))
    throw new Error(
      `${input.designation} does not match its compiled automatic draft.`,
    );

  const actualReasons = principledLeaning(
    next,
    input.sponsorPersonId,
    input.propositionId,
  );
  const provenanceNote = `The seated sponsor's saved political-principle records ${actualReasons.recordIds.join(", ")} produced a score of ${actualReasons.score} toward ${input.answer} on ${proposition.stableKey}. The provisions were requested from verified current law and a saved reference for the exact registered ${governmentLevel} appropriation configuration.`;
  next = recordCompiledDraftOnMeasure(next, {
    measureId: measure.id,
    draft,
    provenanceNote,
    governmentLevel,
  });
  return { world: next, measureId: measure.id, draft };
}
