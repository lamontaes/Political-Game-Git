// STOPGAP RULES3-GOV-051: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/program-governing.ts :: npcProgramServiceCapacityProfileForEnactment.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 846: !lineage ||     lineage.authorityMeasureId !== undefined ||     governmentScope.kind === "state" */
export function npcProgramServiceCapacityProfileForEnactmentRule1(facts: {
  readonly lineage: unknown;
  readonly lineageAuthorityMeasureId: string | undefined;
  readonly governmentScopeKind: string;
}) {
  return (
    !facts.lineage ||
    facts.lineageAuthorityMeasureId! !== undefined ||
    facts.governmentScopeKind === "state"
  );
}

/** Legacy line 861: family.familyVersion !== lineage.familyVersion ||     !rawVariant.authorizesAppropriation */
export function npcProgramServiceCapacityProfileForEnactmentRule2(facts: {
  readonly familyFamilyVersion: string;
  readonly lineageFamilyVersion: string;
  readonly rawVariantAuthorizesAppropriation: boolean;
}) {
  return (
    facts.familyFamilyVersion !== facts.lineageFamilyVersion ||
    !facts.rawVariantAuthorizesAppropriation
  );
}

/** Legacy line 866: measure.propositionIds ?? [] */
export function npcProgramServiceCapacityProfileForEnactmentRule3(facts: {
  readonly measurePropositionIds: unknown;
}) {
  return facts.measurePropositionIds ?? [];
}

/** Legacy line 867: measure.propositionAnswers ?? [] */
export function npcProgramServiceCapacityProfileForEnactmentRule4(facts: {
  readonly measurePropositionAnswers: unknown;
}) {
  return facts.measurePropositionAnswers ?? [];
}

/** Legacy line 869: propositionIds.length !== 1 ||     propositionAnswers.length !== 1 ||     propositionAnswers[0]?.propositionId !== propositionIds[0] */
export function npcProgramServiceCapacityProfileForEnactmentRule5(facts: {
  readonly propositionIdsLength: number;
  readonly propositionAnswersLength: number;
  readonly propositionAnswers0PropositionId: string | undefined;
  readonly propositionIds0: string | undefined;
}) {
  return (
    facts.propositionIdsLength !== 1 ||
    facts.propositionAnswersLength !== 1 ||
    facts.propositionAnswers0PropositionId! !== facts.propositionIds0!
  );
}

/** Legacy line 875: !proposition */
export function npcProgramServiceCapacityProfileForEnactmentRule6(facts: {
  readonly proposition: unknown;
}) {
  return !facts.proposition;
}

/** Legacy line 881: governmentScope.kind === "local" */
export function npcProgramServiceCapacityProfileForEnactmentRule7(facts: {
  readonly governmentScopeKind: string;
}) {
  return facts.governmentScopeKind === "local";
}

/** Legacy line 884: !localAuthority ||       localAuthority.jurisdictionId !== measure.jurisdictionId ||       localAuthority.unit.id !== governmentScope.localGovernmentKey ||       !localAuthority.authority.permittedEffects.includes(         "public-program-appropriati */
export function npcProgramServiceCapacityProfileForEnactmentRule8(facts: {
  readonly localAuthority: unknown;
  readonly localAuthorityJurisdictionId: string;
  readonly measureJurisdictionId: string;
  readonly localAuthorityUnitId: string;
  readonly governmentScopeLocalGovernmentKey: string;
  readonly localAuthorityauthoritypermittedEffectsincludesResult: boolean;
}) {
  return (
    !facts.localAuthority ||
    facts.localAuthorityJurisdictionId !== facts.measureJurisdictionId ||
    facts.localAuthorityUnitId !== facts.governmentScopeLocalGovernmentKey ||
    !facts.localAuthorityauthoritypermittedEffectsincludesResult
  );
}

/** Legacy line 895: measure.jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id ||       rulePackById(measure.rulePackId)?.institution?.government !== "federal" */
export function npcProgramServiceCapacityProfileForEnactmentRule9(facts: {
  readonly measureJurisdictionId: string;
  readonly NATIONAL_ELECTION_JURISDICTIONId: string;
  readonly rulePackByIdMeasureRulePackIdInstitutionGovernment:
    string | undefined;
}) {
  return (
    facts.measureJurisdictionId !== facts.NATIONAL_ELECTION_JURISDICTIONId ||
    facts.rulePackByIdMeasureRulePackIdInstitutionGovernment! !== "federal"
  );
}

/** Legacy line 904: entry.propositionKey === proposition.stableKey &&       entry.answer === propositionAnswers[0]!.answer &&       entry.governmentLevel === governmentLevel */
export function npcProgramServiceCapacityProfileForEnactmentRule10(facts: {
  readonly entryPropositionKey: string;
  readonly propositionStableKey: string;
  readonly entryAnswer: string;
  readonly propositionAnswers0Answer: string;
  readonly entryGovernmentLevel: string;
  readonly governmentLevel: string;
}) {
  return (
    facts.entryPropositionKey === facts.propositionStableKey &&
    facts.entryAnswer === facts.propositionAnswers0Answer &&
    facts.entryGovernmentLevel === facts.governmentLevel
  );
}

/** Legacy line 909: !eligibility ||     eligibility.authorityKind !== "game-profile" ||     !lineage.authorityKey ||     (eligibility.authorityKey !== null &&       eligibility.authorityKey !== lineage.authorityKey) */
export function npcProgramServiceCapacityProfileForEnactmentRule11(facts: {
  readonly eligibility: unknown;
  readonly eligibilityAuthorityKind: string;
  readonly lineageAuthorityKey: string | undefined;
  readonly eligibilityAuthorityKey: string | null;
}) {
  return (
    !facts.eligibility ||
    facts.eligibilityAuthorityKind !== "game-profile" ||
    !facts.lineageAuthorityKey! ||
    (facts.eligibilityAuthorityKey! !== null &&
      facts.eligibilityAuthorityKey !== facts.lineageAuthorityKey)
  );
}

/** Legacy line 917: eligibility.authorityKey === null */
export function npcProgramServiceCapacityProfileForEnactmentRule12(facts: {
  readonly eligibilityAuthorityKey: string | null;
}) {
  return facts.eligibilityAuthorityKey! === null;
}

/** Legacy line 919: governmentScope.kind === "local" &&       localAuthority?.authority.authorityKey === lineage.authorityKey */
export function npcProgramServiceCapacityProfileForEnactmentRule13(facts: {
  readonly governmentScopeKind: string;
  readonly localAuthorityAuthorityAuthorityKey: string | undefined;
  readonly lineageAuthorityKey: string;
}) {
  return (
    facts.governmentScopeKind === "local" &&
    facts.localAuthorityAuthorityAuthorityKey! === facts.lineageAuthorityKey
  );
}

/** Legacy line 921: !authorityMatchesLocal */
export function npcProgramServiceCapacityProfileForEnactmentRule14(facts: {
  readonly authorityMatchesLocal: boolean;
}) {
  return !facts.authorityMatchesLocal;
}

/** Legacy line 925: clause.provisionKey === eligibility.effectProvisionKey */
export function npcProgramServiceCapacityProfileForEnactmentRule15(facts: {
  readonly clauseProvisionKey: string;
  readonly eligibilityEffectProvisionKey: string;
}) {
  return facts.clauseProvisionKey === facts.eligibilityEffectProvisionKey;
}

/** Legacy line 928: parameter.key === eligibility.effectParameterKey */
export function npcProgramServiceCapacityProfileForEnactmentRule16(facts: {
  readonly parameterKey: string;
  readonly eligibilityEffectParameterKey: string;
}) {
  return facts.parameterKey === facts.eligibilityEffectParameterKey;
}

/** Legacy line 931: parameter.parameterKey === eligibility.effectParameterKey */
export function npcProgramServiceCapacityProfileForEnactmentRule17(facts: {
  readonly parameterParameterKey: string;
  readonly eligibilityEffectParameterKey: string;
}) {
  return facts.parameterParameterKey === facts.eligibilityEffectParameterKey;
}

/** Legacy line 933: lineage.componentKey     ? `${lineage.componentKey}:${eligibility.effectProvisionKey}`     : eligibility.effectProvisionKey */
export function npcProgramServiceCapacityProfileForEnactmentRule18(facts: {
  readonly lineageComponentKey: string | undefined;
  readonly eligibilityEffectProvisionKey: string;
}) {
  return facts.lineageComponentKey!
    ? `${facts.lineageComponentKey}:${facts.eligibilityEffectProvisionKey}`
    : facts.eligibilityEffectProvisionKey;
}

/** Legacy line 938: provision.operativeEffect !== undefined &&       (lineage.componentKey === undefined ||         provision.provisionKey.startsWith(`${lineage.componentKey}:`)) */
export function npcProgramServiceCapacityProfileForEnactmentRule19(facts: {
  readonly provisionOperativeEffect: unknown;
  readonly lineageComponentKey: string | undefined;
  readonly provisionProvisionKeyStartsWith$LineageComponentKey: boolean;
}) {
  return (
    facts.provisionOperativeEffect !== undefined &&
    (facts.lineageComponentKey! === undefined ||
      facts.provisionProvisionKeyStartsWith$LineageComponentKey)
  );
}

/** Legacy line 944: eligibility.operativeEffectKind !== "public-program-appropriation" ||     effectClause?.parameterKey !== eligibility.effectParameterKey ||     effectParameter?.kind !== "money" ||     parameterValue?.kind !== "money" ||     operativeProvisions.length */
export function npcProgramServiceCapacityProfileForEnactmentRule20(facts: {
  readonly eligibilityOperativeEffectKind: string;
  readonly effectClauseParameterKey: string | null | undefined;
  readonly eligibilityEffectParameterKey: string;
  readonly effectParameterKind: string | undefined;
  readonly parameterValueKind: string | undefined;
  readonly operativeProvisionsLength: number;
  readonly operativeProvisionProvisionKey: string | undefined;
  readonly expectedProvisionKey: string;
  readonly operativeProvisionOperativeEffectKind: string | undefined;
  readonly operativeProvisionFiscalExposureMinorUnits: number | null;
  readonly operativeProvisionFiscalExposureLabel: string | null;
}) {
  return (
    facts.eligibilityOperativeEffectKind !== "public-program-appropriation" ||
    facts.effectClauseParameterKey! !== facts.eligibilityEffectParameterKey ||
    facts.effectParameterKind! !== "money" ||
    facts.parameterValueKind! !== "money" ||
    facts.operativeProvisionsLength !== 1 ||
    facts.operativeProvisionProvisionKey! !== facts.expectedProvisionKey ||
    facts.operativeProvisionOperativeEffectKind! !==
      facts.eligibilityOperativeEffectKind ||
    facts.operativeProvisionFiscalExposureMinorUnits! === null ||
    facts.operativeProvisionFiscalExposureMinorUnits <= 0 ||
    facts.operativeProvisionFiscalExposureLabel! === null
  );
}

/** Legacy line 959: !authoredProfile */
export function npcProgramServiceCapacityProfileForEnactmentRule21(facts: {
  readonly authoredProfile: unknown;
}) {
  return !facts.authoredProfile;
}

/** Legacy line 960: governmentScope.kind === "local" */
export function npcProgramServiceCapacityProfileForEnactmentRule22(facts: {
  readonly governmentScopeKind: string;
}) {
  return facts.governmentScopeKind === "local";
}

/** Legacy line 962: (localProfile && authoredProfile.profileIdScope !== "local-government") ||     (!localProfile && authoredProfile.profileIdScope !== "fixed") ||     !authoredProfile.profileId.trim() ||     !authoredProfile.serviceLabel.trim() ||     !authoredProfile. */
export function npcProgramServiceCapacityProfileForEnactmentRule23(facts: {
  readonly localProfile: boolean;
  readonly authoredProfileProfileIdScope: string;
  readonly authoredProfileProfileIdTrim: string;
  readonly authoredProfileServiceLabelTrim: string;
  readonly authoredProfileUnitLabelTrim: string;
  readonly authoredProfileUnitsTotal: number;
  readonly authoredProfileUnitsOperational: number;
  readonly authoredProfileMonthlyOperatingNeedMinorUnits: number;
  readonly authoredProfileRestorationCostPerUnitMinorUnits: number | null;
  readonly authoredProfileBasisNoteTrim: string;
}) {
  return (
    (facts.localProfile &&
      facts.authoredProfileProfileIdScope !== "local-government") ||
    (!facts.localProfile && facts.authoredProfileProfileIdScope !== "fixed") ||
    !facts.authoredProfileProfileIdTrim ||
    !facts.authoredProfileServiceLabelTrim ||
    !facts.authoredProfileUnitLabelTrim ||
    !Number.isSafeInteger(facts.authoredProfileUnitsTotal) ||
    facts.authoredProfileUnitsTotal < 1 ||
    !Number.isSafeInteger(facts.authoredProfileUnitsOperational) ||
    facts.authoredProfileUnitsOperational < 0 ||
    facts.authoredProfileUnitsOperational > facts.authoredProfileUnitsTotal ||
    !Number.isSafeInteger(
      facts.authoredProfileMonthlyOperatingNeedMinorUnits,
    ) ||
    facts.authoredProfileMonthlyOperatingNeedMinorUnits <= 0 ||
    (facts.authoredProfileRestorationCostPerUnitMinorUnits! !== null &&
      (!Number.isSafeInteger(
        facts.authoredProfileRestorationCostPerUnitMinorUnits,
      ) ||
        facts.authoredProfileRestorationCostPerUnitMinorUnits <= 0)) ||
    !facts.authoredProfileBasisNoteTrim
  );
}

/** Legacy line 983: localProfile     ? `${authoredProfile.profileId}:${governmentScope.localGovernmentKey}`     : authoredProfile.profileId */
export function npcProgramServiceCapacityProfileForEnactmentRule24(facts: {
  readonly localProfile: boolean;
  readonly authoredProfileProfileId: string;
  readonly governmentScopeLocalGovernmentKey: string;
}) {
  return facts.localProfile
    ? `${facts.authoredProfileProfileId}:${facts.governmentScopeLocalGovernmentKey}`
    : facts.authoredProfileProfileId;
}

/** Legacy line 986: localProfile     ? `${lineage.authorityKey}:${measure.rulePackId}:${measure.jurisdictionId}`     : `${measure.jurisdictionId}:${measure.rulePackId}:${lineage.authorityKey}` */
export function npcProgramServiceCapacityProfileForEnactmentRule25(facts: {
  readonly localProfile: boolean;
  readonly lineageAuthorityKey: string;
  readonly measureRulePackId: string;
  readonly measureJurisdictionId: string;
}) {
  return facts.localProfile
    ? `${facts.lineageAuthorityKey}:${facts.measureRulePackId}:${facts.measureJurisdictionId}`
    : `${facts.measureJurisdictionId}:${facts.measureRulePackId}:${facts.lineageAuthorityKey}`;
}
