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
import { recordFiledProvision } from "../legislative-politics";
import { recordDraftLineage } from "../legislation-draft-lineage";
import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import {
  npcEligibleProgramConfigurations,
  npcEligibleProgramConfigurationsFor,
  programVariant,
  standingAuthority,
  type NpcEligibleProgramConfiguration,
  type ProgramParameterValue,
} from "../legislation-program-families";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "../legislative-institutions";
import { legislativeWorkKey } from "../legislative-work-key";
import {
  stateJurisdictionForKey,
  stateKeyForJurisdictionSlug,
} from "../life-places";
import { rulePackById } from "../legislature-rule-packs";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../rng";
import { TRANSIT_PROGRAM_KEY } from "../legislation-transit-families";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
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
    if (jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id) return null;
    const pack = legislativePackForWorkKey(
      `institution:${US_CONGRESS_PACK_ID}`,
    );
    if (!pack || pack.packId !== US_CONGRESS_PACK_ID) return null;
    rulePackId = pack.packId;
    scenarioKey = `institution:${pack.packId}`;
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
    mapping.governmentLevel === "state"
      ? legislativePackForJurisdiction(jurisdictionId)
      : legislativePackForWorkKey(context.scenarioKey);
  if (!pack || pack.packId !== context.rulePackId) return false;
  if (
    mapping.governmentLevel === "federal" &&
    (pack.packId !== US_CONGRESS_PACK_ID ||
      jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id)
  )
    return false;
  return true;
}

/**
 * The exact current consumer tuple for an automatic state appropriation.
 *
 * Until the clause carries that closed intent and the exact positive amount
 * compiled from its appropriation parameter, this producer refuses to create a
 * measure. Funding caps and informative clauses do not count as an operative
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

/**
 * Compile a proposal only when its exact proposition, answer, jurisdiction,
 * authority, and effect consumer all agree.
 *
 * `null` is a real refusal: the available content bank does not yet express
 * that automatic opportunity for this institution. Compiler errors are
 * allowed to surface because they indicate a broken declared configuration.
 */
export function compileAutomaticLawDraft(input: {
  readonly world: World;
  readonly jurisdictionId: EntityId;
  readonly propositionId: EntityId;
  readonly answer: "yes" | "no";
  readonly designation: string;
  readonly intakeKey: string;
  readonly governmentLevel?: AutomaticLawGovernmentLevel;
  readonly context?: AutomaticLawCompileContext;
}): CompiledBillDraft | null {
  const proposition =
    input.world.policyCatalog.propositions[input.propositionId];
  if (!proposition) return null;
  const governmentLevel =
    input.context?.governmentLevel ?? input.governmentLevel ?? "state";
  const candidates = mappingsFor(
    proposition.stableKey,
    input.answer,
    governmentLevel,
  );
  if (candidates.length === 0) return null;
  const eligibleCandidates = candidates.filter((candidate) => {
    const context =
      input.context ??
      profileContextForMapping(input.world, input.jurisdictionId, candidate);
    return context
      ? contextSupportsMapping(context, input.jurisdictionId, candidate)
      : false;
  });
  if (eligibleCandidates.length === 0) return null;
  const selectionRng = new SeededRng(input.world.seed).fork(
    `automatic-law-configuration:${input.intakeKey}:${input.jurisdictionId}:${proposition.stableKey}:${input.answer}:${governmentLevel}`,
  );
  const mapping = selectionRng.pick(eligibleCandidates);
  const issue = input.world.policyCatalog.issues[proposition.issueId];
  if (!(issue?.levels?.includes(governmentLevel) ?? false)) return null;

  const resolvedContext =
    input.context ??
    profileContextForMapping(input.world, input.jurisdictionId, mapping);
  if (
    !resolvedContext ||
    resolvedContext.jurisdictionId !== input.jurisdictionId
  )
    return null;
  const { rulePackId, scenarioKey } = resolvedContext;
  const authority = resolvedContext.predicateAuthority;
  if (!rulePackId || !scenarioKey) return null;
  if (governmentLevel === "state") {
    const pack = legislativePackForJurisdiction(input.jurisdictionId);
    if (!pack || pack.packId !== rulePackId) return null;
  } else if (governmentLevel === "federal") {
    const pack = legislativePackForWorkKey(scenarioKey);
    if (
      !pack ||
      pack.packId !== rulePackId ||
      rulePackId !== US_CONGRESS_PACK_ID ||
      input.jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id
    )
      return null;
  } else {
    const pack = legislativePackForWorkKey(scenarioKey);
    if (
      !pack ||
      pack.packId !== rulePackId ||
      authority.kind !== "game-profile" ||
      authority.publicGovernmentIdentity.kind !== "local-government" ||
      authority.publicGovernmentIdentity.jurisdictionId !== input.jurisdictionId
    )
      return null;
  }
  if (!authority || !authorityAllowsAppropriation(authority)) return null;
  if (authority.kind !== mapping.authorityKind) return null;
  if (
    mapping.authorityKind === "game-profile" &&
    (authority.kind !== "game-profile" ||
      authority.governmentLevel !== governmentLevel)
  )
    return null;
  if (
    mapping.authorityKey !== null &&
    authority.authorityKey !== mapping.authorityKey
  )
    return null;

  const { variant } = programVariant(mapping.familyKey, mapping.variantKey);
  if (!variant.propositionKeys?.includes(mapping.propositionKey)) {
    throw new Error(
      `${mapping.familyKey}/${mapping.variantKey} is not declared for ${mapping.propositionKey}.`,
    );
  }

  const amountDefault = variant.defaults[mapping.effectParameterKey];
  if (!amountDefault || amountDefault.kind !== "money") {
    throw new Error(
      `${mapping.familyKey}/${mapping.variantKey} has no authored mapped money default.`,
    );
  }
  const amountSpec = variant.parameters.find(
    (parameter) =>
      parameter.key === mapping.effectParameterKey &&
      parameter.kind === "money",
  );
  if (!amountSpec || amountSpec.kind !== "money") {
    throw new Error(
      `${mapping.familyKey}/${mapping.variantKey} has no bounded appropriation parameter.`,
    );
  }

  // The values are a game-authored variation over the variant's declared
  // bounds, not an estimate of a real program's cost or a cash balance.
  const rng = new SeededRng(input.world.seed).fork(
    `automatic-law-parameters:${input.intakeKey}:${rulePackId}:${proposition.stableKey}`,
  );
  const appropriationMultipliers = [0.5, 0.75, 1, 1.5, 2] as const;
  const appropriationMinorUnits =
    Math.round(
      (amountDefault.minorUnits *
        rng.fork("amount").pick(appropriationMultipliers)) /
        100,
    ) * 100;
  const parameterValues: Record<string, ProgramParameterValue> = {
    ...variant.defaults,
    [mapping.effectParameterKey]: {
      kind: "money",
      minorUnits: Math.max(
        amountSpec.minMinorUnits,
        Math.min(amountSpec.maxMinorUnits, appropriationMinorUnits),
      ),
      currency: amountDefault.currency,
    },
  };
  const serviceWindow = variant.parameters.find(
    (parameter) =>
      parameter.key === "service-window" && parameter.kind === "enumerated",
  );
  if (
    serviceWindow?.kind === "enumerated" &&
    serviceWindow.options.length > 0
  ) {
    parameterValues[serviceWindow.key] = {
      kind: "enumerated",
      value: rng
        .fork("service-window")
        .pick(serviceWindow.options.map((option) => option.value)),
    };
  }
  for (const parameter of variant.parameters) {
    if (parameter.kind !== "enumerated" || parameter.key === serviceWindow?.key)
      continue;
    const defaultValue = variant.defaults[parameter.key];
    if (defaultValue?.kind === "enumerated" && parameter.options.length > 0) {
      parameterValues[parameter.key] = {
        kind: "enumerated",
        value: rng
          .fork(`parameter:${parameter.key}`)
          .pick(parameter.options.map((option) => option.value)),
      };
    }
  }
  const draft = compileBillDraft({
    familyKey: mapping.familyKey,
    variantKey: mapping.variantKey,
    parameterValues,
    scenarioKey,
    jurisdictionId: input.jurisdictionId,
    rulePackId,
    designation: input.designation,
    filedOn: input.world.currentDate as IsoDate,
    predicateAuthority: authority,
  });
  return hasRegisteredOperativeEffect(draft, mapping) ? draft : null;
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
    readonly draft: CompiledBillDraft;
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
    };
    next = recordFiledProvision(next, provisionInput);
    if (operativeEffect) {
      const filed = next.history.legislativeProvisions?.at(-1);
      if (!filed || filed.operativeEffect?.kind !== operativeEffect.kind) {
        throw new Error(
          `The provision writer dropped the compiled ${operativeEffect.kind} intent for '${clause.provisionKey}'.`,
        );
      }
    }
  }

  const authority = input.draft.predicateAuthority;
  return recordDraftLineage(next, {
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
    readonly sponsorPersonId: EntityId;
    readonly originChamberKey: string;
    readonly principleRecordIds: readonly EntityId[];
    readonly principleScore: number;
  },
): {
  readonly world: World;
  readonly measureId: EntityId;
  readonly draft: CompiledBillDraft;
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
  const draft = compileAutomaticLawDraft({
    world,
    jurisdictionId: input.jurisdictionId,
    propositionId: input.propositionId,
    answer: input.answer,
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
      `${input.designation} was not recorded after introduction.`,
    );
  if (!automaticDraftMatchesMeasure(next, measure, draft, governmentLevel))
    throw new Error(
      `${input.designation} does not match its compiled automatic draft.`,
    );

  const provenanceNote = `The seated sponsor's saved political-principle records ${input.principleRecordIds.join(", ")} produced a score of ${input.principleScore} toward ${input.answer} on ${proposition.stableKey}. The provisions were compiled from the exact registered ${governmentLevel} appropriation configuration.`;
  next = recordCompiledDraftOnMeasure(next, {
    measureId: measure.id,
    draft,
    provenanceNote,
    governmentLevel,
  });
  return { world: next, measureId: measure.id, draft };
}
