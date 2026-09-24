import {
  compileBillDraft,
  draftScope,
  type CompiledBillDraft,
} from "../legislation-drafting";
import { introduceMeasure, measureById } from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import { recordDraftLineage } from "../legislation-draft-lineage";
import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import {
  programVariant,
  standingAuthority,
  type ProgramParameterValue,
} from "../legislation-program-families";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "../legislative-institutions";
import { legislativeWorkKey } from "../legislative-work-key";
import { SeededRng } from "../rng";
import { FEDERAL_PASSENGER_RAIL_PROPOSITION_KEY } from "../legislation-federal-rail-family";
import { LOCAL_FIX_IT_FIRST_PROPOSITION_KEY } from "../legislation-local-fiscal-families";
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
  | "federal"
  | "state"
  | "county"
  | "municipality";

export interface AutomaticLawPositionMapping {
  readonly propositionKey: string;
  readonly answer: "yes" | "no";
  readonly familyKey: string;
  readonly variantKey: string;
  /** Null means the level-specific intake must supply its exact authority. */
  readonly authorityKey: string | null;
  readonly authorityKind: "standing-statute" | "game-profile";
  readonly governmentLevel: AutomaticLawGovernmentLevel;
}

export interface AutomaticLawCompileContext {
  readonly governmentLevel: AutomaticLawGovernmentLevel;
  readonly jurisdictionId: EntityId;
  readonly rulePackId: string;
  readonly scenarioKey: string;
  readonly predicateAuthority: PredicateAuthority;
}

export const AUTOMATIC_LAW_POSITION_MAPPINGS = [
  {
    propositionKey:
      "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours",
    answer: "yes",
    familyKey: "appropriations",
    variantKey: "transit-staged-service-v1",
    authorityKey: "standing:rural-transit-assistance",
    authorityKind: "standing-statute",
    governmentLevel: "state",
  },
  {
    propositionKey: FEDERAL_PASSENGER_RAIL_PROPOSITION_KEY,
    answer: "yes",
    familyKey: "appropriations",
    variantKey: "federal-passenger-rail-v1",
    authorityKey: "game-profile:federal-passenger-rail/v1",
    authorityKind: "game-profile",
    governmentLevel: "federal",
  },
  {
    propositionKey: LOCAL_FIX_IT_FIRST_PROPOSITION_KEY,
    answer: "yes",
    familyKey: "appropriations",
    variantKey: "local-fix-it-first-v1",
    authorityKey: null,
    authorityKind: "game-profile",
    governmentLevel: "municipality",
  },
  {
    propositionKey: LOCAL_FIX_IT_FIRST_PROPOSITION_KEY,
    answer: "yes",
    familyKey: "appropriations",
    variantKey: "local-fix-it-first-v1",
    authorityKey: null,
    authorityKind: "game-profile",
    governmentLevel: "county",
  },
] as const satisfies readonly AutomaticLawPositionMapping[];

const mappingsByQuestion = (() => {
  const index = new Map<string, AutomaticLawPositionMapping>();
  for (const mapping of AUTOMATIC_LAW_POSITION_MAPPINGS) {
    const key = `${mapping.governmentLevel}\u0000${mapping.propositionKey}\u0000${mapping.answer}`;
    if (index.has(key)) {
      throw new Error(
        `Automatic legislation maps '${mapping.propositionKey}' and '${mapping.answer}' more than once.`,
      );
    }
    index.set(key, mapping);
  }
  return index;
})();

function mappingFor(
  propositionKey: string,
  answer: "yes" | "no",
  governmentLevel: AutomaticLawGovernmentLevel = "state",
): AutomaticLawPositionMapping | null {
  return (
    mappingsByQuestion.get(
      `${governmentLevel}\u0000${propositionKey}\u0000${answer}`,
    ) ?? null
  );
}

export function automaticLawMappingFor(
  propositionKey: string,
  answer: "yes" | "no",
  governmentLevel: AutomaticLawGovernmentLevel = "state",
): AutomaticLawPositionMapping | null {
  return mappingFor(propositionKey, answer, governmentLevel);
}

function authorityAllowsAppropriation(
  authority: PredicateAuthority,
): boolean {
  if ("permittedEffects" in authority)
    return authority.permittedEffects.includes("public-program-appropriation");
  return "authorizesSpending" in authority && authority.authorizesSpending;
}

/**
 * The exact current consumer tuple for an automatic state appropriation.
 *
 * Until the clause carries that closed intent and the exact positive amount
 * compiled from its appropriation parameter, this producer refuses to create a
 * measure. Funding caps and informative clauses do not count as an operative
 * public-program appropriation.
 */
function hasRegisteredAppropriationClause(
  draft: CompiledBillDraft,
): boolean {
  const appropriation = draft.parameterValues.appropriation;
  const amountClauses = draft.clauses.filter(
    (clause) => clause.provisionKey === "amount-provided",
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
  readonly context?: AutomaticLawCompileContext;
}): CompiledBillDraft | null {
  const proposition = input.world.policyCatalog.propositions[
    input.propositionId
  ];
  if (!proposition) return null;
  const governmentLevel = input.context?.governmentLevel ?? "state";
  const mapping = mappingFor(
    proposition.stableKey,
    input.answer,
    governmentLevel,
  );
  if (!mapping) return null;
  const issue = input.world.policyCatalog.issues[proposition.issueId];
  if (!(issue?.levels?.includes(governmentLevel) ?? false)) return null;

  let rulePackId: string;
  let scenarioKey: string;
  let authority: PredicateAuthority | null;
  if (input.context) {
    if (input.context.jurisdictionId !== input.jurisdictionId) return null;
    rulePackId = input.context.rulePackId;
    scenarioKey = input.context.scenarioKey;
    authority = input.context.predicateAuthority;
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
        authority.publicGovernmentIdentity.jurisdictionId !==
          input.jurisdictionId
      )
        return null;
    }
  } else {
    if (governmentLevel !== "state") return null;
    const pack = legislativePackForJurisdiction(input.jurisdictionId);
    if (!pack) return null;
    rulePackId = pack.packId;
    scenarioKey = legislativeWorkKey(pack);
    authority = mapping.authorityKind === "standing-statute" && mapping.authorityKey
      ? standingAuthority(mapping.authorityKey)
      : null;
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

  const amountDefault = variant.defaults.appropriation;
  if (!amountDefault || amountDefault.kind !== "money") {
    throw new Error(
      `${mapping.familyKey}/${mapping.variantKey} has no authored appropriation default.`,
    );
  }
  const amountSpec = variant.parameters.find(
    (parameter) =>
      parameter.key === "appropriation" && parameter.kind === "money",
  );
  if (!amountSpec || amountSpec.kind !== "money") {
    throw new Error(
      `${mapping.familyKey}/${mapping.variantKey} has no bounded appropriation parameter.`,
    );
  }

  // The values are a game-authored variation over the variant's declared
  // bounds, not an estimate of a real program's cost or a cash balance.
  const rng = new SeededRng(input.world.seed).fork(
    `automatic-law-parameters:${input.intakeKey}:${pack.packId}:${proposition.stableKey}`,
  );
  const appropriationMultipliers = [0.5, 0.75, 1, 1.5, 2] as const;
  const appropriationMinorUnits = Math.round(
    (amountDefault.minorUnits * rng.fork("amount").pick(appropriationMultipliers)) /
      100,
  ) * 100;
  const parameterValues: Record<string, ProgramParameterValue> = {
    appropriation: {
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
  if (serviceWindow?.kind === "enumerated" && serviceWindow.options.length > 0) {
    parameterValues[serviceWindow.key] = {
      kind: "enumerated",
      value: rng
        .fork("service-window")
        .pick(serviceWindow.options.map((option) => option.value)),
    };
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
  return hasRegisteredAppropriationClause(draft) ? draft : null;
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
  const mapping = mappingFor(proposition.stableKey, answer, governmentLevel);
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
        ((governmentLevel === "county" ||
          governmentLevel === "municipality") &&
          predicateAuthority.publicGovernmentIdentity.kind !==
            "local-government") ||
        (governmentLevel === "federal" &&
          (predicateAuthority.publicGovernmentIdentity.kind !==
            "jurisdiction" ||
            measure.jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id))) ||
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
    draft.familyVersion === family.version &&
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
    !automaticDraftMatchesMeasure(
      world,
      measure,
      input.draft,
      governmentLevel,
    )
  ) {
    throw new Error(
      `${measure.designation} does not match its compiled automatic draft.`,
    );
  }
  if (!input.provenanceNote.trim()) {
    throw new Error("An automatic draft lineage needs its recorded reason.");
  }
  if (!hasRegisteredAppropriationClause(input.draft)) {
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
      if (
        !filed ||
        filed.operativeEffect?.kind !== operativeEffect.kind
      ) {
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
  const governmentLevel = input.context?.governmentLevel ?? "state";
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
    throw new Error(`${input.designation} was not recorded after introduction.`);
  if (
    !automaticDraftMatchesMeasure(
      next,
      measure,
      draft,
      governmentLevel,
    )
  )
    throw new Error(
      `${input.designation} does not match its compiled automatic draft.`,
    );

  const provenanceNote =
    `The seated sponsor's saved political-principle records ${input.principleRecordIds.join(", ")} produced a score of ${input.principleScore} toward ${input.answer} on ${proposition.stableKey}. The provisions were compiled from the exact registered ${governmentLevel} appropriation configuration.`;
  next = recordCompiledDraftOnMeasure(next, {
    measureId: measure.id,
    draft,
    provenanceNote,
    governmentLevel,
  });
  return { world: next, measureId: measure.id, draft };
}
