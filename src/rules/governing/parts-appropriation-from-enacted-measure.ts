// STOPGAP RULES3-GOV-050: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/program-governing.ts :: appropriationFromEnactedMeasure.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 251: world.history.legislativeMeasures ?? [] */
export function appropriationFromEnactedMeasureRule1(facts: {
  readonly historyLegislativeMeasures: unknown;
}) {
  return facts.historyLegislativeMeasures ?? [];
}

/** Legacy line 252: row.id === measureId */
export function appropriationFromEnactedMeasureRule2(facts: {
  readonly rowId: string;
  readonly measureId: string;
}) {
  return facts.rowId === facts.measureId;
}

/** Legacy line 254: world.history.legislativeEnactments ?? [] */
export function appropriationFromEnactedMeasureRule3(facts: {
  readonly historyLegislativeEnactments: unknown;
}) {
  return facts.historyLegislativeEnactments ?? [];
}

/** Legacy line 255: row.measureId === measureId && row.outcome === "enacted" */
export function appropriationFromEnactedMeasureRule4(facts: {
  readonly rowMeasureId: string;
  readonly measureId: string;
  readonly rowOutcome: string;
}) {
  return (
    facts.rowMeasureId === facts.measureId && facts.rowOutcome === "enacted"
  );
}

/** Legacy line 257: !measure || !enactment */
export function appropriationFromEnactedMeasureRule5(facts: {
  readonly measure: unknown;
  readonly enactment: unknown;
}) {
  return !facts.measure || !facts.enactment;
}

/** Legacy line 259: !governmentScope */
export function appropriationFromEnactedMeasureRule6(facts: {
  readonly governmentScope: unknown;
}) {
  return !facts.governmentScope;
}

/** Legacy line 262: governmentScope.kind === "local" */
export function appropriationFromEnactedMeasureRule7(facts: {
  readonly governmentScopeKind: string;
}) {
  return facts.governmentScopeKind === "local";
}

/** Legacy line 269: !admission.ok ||       admission.effectKind !== "public-program-appropriation" */
export function appropriationFromEnactedMeasureRule8(facts: {
  readonly admissionOk: boolean;
  readonly admissionEffectKind: string;
}) {
  return (
    !facts.admissionOk ||
    facts.admissionEffectKind !== "public-program-appropriation"
  );
}

/** Legacy line 275: lineage.componentKey !== undefined */
export function appropriationFromEnactedMeasureRule9(facts: {
  readonly lineageComponentKey: string | undefined;
}) {
  return facts.lineageComponentKey! !== undefined;
}

/** Legacy line 281: governmentScope.kind === "federal" &&     !draftLineageForMeasure(world, measureId) */
export function appropriationFromEnactedMeasureRule10(facts: {
  readonly governmentScopeKind: string;
  readonly draftLineageForMeasureWorldMeasureId: unknown;
}) {
  return (
    facts.governmentScopeKind === "federal" &&
    !facts.draftLineageForMeasureWorldMeasureId
  );
}

/** Legacy line 287: provision.applicationScope.jurisdictionId ===             measure.jurisdictionId &&           provision.applicationScope.segmentKey === null */
export function appropriationFromEnactedMeasureRule11(facts: {
  readonly provisionApplicationScopeJurisdictionId: string;
  readonly measureJurisdictionId: string;
  readonly provisionApplicationScopeSegmentKey: string | null;
}) {
  return (
    facts.provisionApplicationScopeJurisdictionId ===
      facts.measureJurisdictionId &&
    facts.provisionApplicationScopeSegmentKey! === null
  );
}

/** Legacy line 292: provision.lawTerms ?? [] */
export function appropriationFromEnactedMeasureRule12(facts: {
  readonly provisionLawTerms: unknown;
}) {
  return facts.provisionLawTerms ?? [];
}

/** Legacy line 294: term.questionKey === EXPAND_PASSENGER_RAIL_QUESTION &&             term.key === "appropriation" */
export function appropriationFromEnactedMeasureRule13(facts: {
  readonly termQuestionKey: string;
  readonly EXPAND_PASSENGER_RAIL_QUESTION: string;
  readonly termKey: string;
}) {
  return (
    facts.termQuestionKey === facts.EXPAND_PASSENGER_RAIL_QUESTION &&
    facts.termKey === "appropriation"
  );
}

/** Legacy line 298: terms.length === 1 ? terms[0] : null */
export function appropriationFromEnactedMeasureRule14(facts: {
  readonly termsLength: number;
  readonly terms0: unknown;
}) {
  return facts.termsLength === 1 ? facts.terms0 : null;
}

/** Legacy line 306: answer.answer === "yes" &&         world.policyCatalog.propositions[answer.propositionId]?.stableKey ===           EXPAND_PASSENGER_RAIL_QUESTION */
export function appropriationFromEnactedMeasureRule15(facts: {
  readonly answerAnswer: string;
  readonly policyCatalogPropositionsAnswerPropositionIdStableKey:
    string | undefined;
  readonly EXPAND_PASSENGER_RAIL_QUESTION: string;
}) {
  return (
    facts.answerAnswer === "yes" &&
    facts.policyCatalogPropositionsAnswerPropositionIdStableKey! ===
      facts.EXPAND_PASSENGER_RAIL_QUESTION
  );
}

/** Legacy line 316: answersYes &&       operativeAt &&       term?.unit === "dollars/year" &&       Number.isFinite(term.value) &&       term.value > 0 &&       configurations.length === 1 */
export function appropriationFromEnactedMeasureRule16(facts: {
  readonly answersYes: boolean;
  readonly operativeAt: string | undefined;
  readonly termUnit: string | undefined;
  readonly termValue: number;
  readonly configurationsLength: number;
}) {
  return (
    facts.answersYes &&
    facts.operativeAt! &&
    facts.termUnit! === "dollars/year" &&
    Number.isFinite(facts.termValue) &&
    facts.termValue > 0 &&
    facts.configurationsLength === 1
  );
}

/** Legacy line 329: term.value * 100 */
export function appropriationFromEnactedMeasureRule17(facts: {
  readonly termValue: number;
}) {
  return facts.termValue * 100;
}

/** Legacy line 331: -1 */
export function appropriationFromEnactedMeasureRule18() {
  return -1;
}

/** Legacy line 340: governmentScope.kind === "federal" &&     (existingComponents.length > 0 ||       !programServiceCapacityProfileForEnactment({         world,         measure,         governmentScope,         lineage: draftLineageForMeasure(world, measureId),         */
export function appropriationFromEnactedMeasureRule20(facts: {
  readonly governmentScopeKind: string;
  readonly existingComponentsLength: number;
  readonly programServiceCapacityProfileForEnactmentResult: unknown;
}) {
  return (
    facts.governmentScopeKind === "federal" &&
    (facts.existingComponentsLength > 0 ||
      !facts.programServiceCapacityProfileForEnactmentResult)
  );
}

/** Legacy line 353: enactment.effectiveAt && enactment.effectiveAt > world.currentDate       ? enactment.effectiveAt       : world.currentDate */
export function appropriationFromEnactedMeasureRule21(facts: {
  readonly enactmentEffectiveAt: string | null;
  readonly currentDate: string;
}) {
  return facts.enactmentEffectiveAt! &&
    facts.enactmentEffectiveAt > facts.currentDate
    ? facts.enactmentEffectiveAt
    : facts.currentDate;
}

/** Legacy line 361: lineage.familyKey === "appropriations" &&     (lineage.variantKey === "single-programme" ||       lineage.variantKey === "supplemental")       ? (operativeDateInWorld(world, enactment)?.date ?? null)       : undefined */
export function appropriationFromEnactedMeasureRule22(facts: {
  readonly lineageFamilyKey: string;
  readonly lineageVariantKey: string;
  readonly operativeDateInWorldWorldEnactmentDate: string | undefined;
}) {
  return facts.lineageFamilyKey === "appropriations" &&
    (facts.lineageVariantKey === "single-programme" ||
      facts.lineageVariantKey === "supplemental")
    ? (facts.operativeDateInWorldWorldEnactmentDate! ?? null)
    : undefined;
}

/** Legacy line 374: lineage.familyKey !== "appropriations" */
export function appropriationFromEnactedMeasureRule23(facts: {
  readonly lineageFamilyKey: string;
}) {
  return facts.lineageFamilyKey !== "appropriations";
}

/** Legacy line 376: lineage.variantKey === "single-programme"         ? "availability"         : lineage.variantKey === "supplemental"           ? "lapse"           : null */
export function appropriationFromEnactedMeasureRule24(facts: {
  readonly lineageVariantKey: string;
}) {
  return facts.lineageVariantKey === "single-programme"
    ? "availability"
    : facts.lineageVariantKey === "supplemental"
      ? "lapse"
      : null;
}

/** Legacy line 381: provisionKey === null */
export function appropriationFromEnactedMeasureRule25(facts: {
  readonly provisionKey: string | null;
}) {
  return facts.provisionKey! === null;
}

/** Legacy line 382: componentKey       ? `${componentKey}:${provisionKey}`       : provisionKey */
export function appropriationFromEnactedMeasureRule26(facts: {
  readonly componentKey: string | undefined;
  readonly provisionKey: string;
}) {
  return facts.componentKey!
    ? `${facts.componentKey}:${facts.provisionKey}`
    : facts.provisionKey;
}

/** Legacy line 386: provision.provisionKey === fullKey */
export function appropriationFromEnactedMeasureRule27(facts: {
  readonly provisionProvisionKey: string;
  readonly fullKey: string;
}) {
  return facts.provisionProvisionKey === facts.fullKey;
}

/** Legacy line 388: !current || current.originAmendmentId !== null */
export function appropriationFromEnactedMeasureRule28(facts: {
  readonly current: unknown;
  readonly currentOriginAmendmentId: string | null;
}) {
  return !facts.current || facts.currentOriginAmendmentId! !== null;
}

/** Legacy line 391: term?.kind !== "duration-years" ||       term.years === null ||       !Number.isSafeInteger(term.years) ||       term.years <= 0 */
export function appropriationFromEnactedMeasureRule29(facts: {
  readonly termKind: string | undefined;
  readonly termYears: number | null;
}) {
  return (
    facts.termKind! !== "duration-years" ||
    facts.termYears! === null ||
    !Number.isSafeInteger(facts.termYears) ||
    facts.termYears <= 0
  );
}

/** Legacy line 402: opensOn && through >= opensOn ? through : null */
export function appropriationFromEnactedMeasureRule30(facts: {
  readonly opensOn: string | null | undefined;
  readonly through: string;
}) {
  return facts.opensOn! && facts.through >= facts.opensOn
    ? facts.through
    : null;
}

/** Legacy line 412: components.length > 0 */
export function appropriationFromEnactedMeasureRule31(facts: {
  readonly componentsLength: number;
}) {
  return facts.componentsLength > 0;
}

/** Legacy line 420: availableThrough === null */
export function appropriationFromEnactedMeasureRule32(facts: {
  readonly availableThrough: string | null | undefined;
}) {
  return facts.availableThrough! === null;
}

/** Legacy line 423: provision.provisionKey === `${lineage.componentKey}:amount-provided` */
export function appropriationFromEnactedMeasureRule33(facts: {
  readonly provisionProvisionKey: string;
  readonly lineageComponentKey: string | undefined;
}) {
  return (
    facts.provisionProvisionKey ===
    `${facts.lineageComponentKey!}:amount-provided`
  );
}

/** Legacy line 426: lineage.variantKey === STATE_TRANSIT_VARIANT_KEY           ? stateTransitProfileForLineage(world, measure, enactment, lineage)           : null */
export function appropriationFromEnactedMeasureRule34(facts: {
  readonly lineageVariantKey: string;
  readonly STATE_TRANSIT_VARIANT_KEY: string;
  readonly stateTransitProfileForLineageWorldMeasureEnactmentLineage: unknown;
}) {
  return facts.lineageVariantKey === facts.STATE_TRANSIT_VARIANT_KEY
    ? facts.stateTransitProfileForLineageWorldMeasureEnactmentLineage
    : null;
}

/** Legacy line 429: lineage.variantKey === STATE_TRANSIT_VARIANT_KEY && !transitProfile */
export function appropriationFromEnactedMeasureRule35(facts: {
  readonly lineageVariantKey: string;
  readonly STATE_TRANSIT_VARIANT_KEY: string;
  readonly transitProfile: unknown;
}) {
  return (
    facts.lineageVariantKey === facts.STATE_TRANSIT_VARIANT_KEY &&
    !facts.transitProfile
  );
}

/** Legacy line 432: amountProvision?.operativeEffect !== undefined &&         amountProvision.operativeEffect.kind !== "public-program-appropriation" */
export function appropriationFromEnactedMeasureRule36(facts: {
  readonly amountProvisionOperativeEffect: unknown;
  readonly amountProvisionOperativeEffectKind: string;
}) {
  return (
    facts.amountProvisionOperativeEffect !== undefined &&
    facts.amountProvisionOperativeEffectKind !== "public-program-appropriation"
  );
}

/** Legacy line 436: !lineageAuthorizesAppropriation(lineage) */
export function appropriationFromEnactedMeasureRule37(facts: {
  readonly lineageAuthorizesAppropriationLineage: boolean;
}) {
  return !facts.lineageAuthorizesAppropriationLineage;
}

/** Legacy line 437: !measureMayEnact(measure.rulePackId, lineage) */
export function appropriationFromEnactedMeasureRule38(facts: {
  readonly measureMayEnactMeasureRulePackIdLineage: boolean;
}) {
  return !facts.measureMayEnactMeasureRulePackIdLineage;
}

/** Legacy line 439: amount === null || amount === undefined || amount <= 0 */
export function appropriationFromEnactedMeasureRule39(facts: {
  readonly amount: number | null | undefined;
}) {
  return (
    facts.amount! === null || facts.amount! === undefined || facts.amount <= 0
  );
}

/** Legacy line 449: serviceProfile?.programKey ??         transitProfile?.programKey ??         programKeyForEnactedAppropriation(next, lineage, governmentScope) */
export function appropriationFromEnactedMeasureRule40(facts: {
  readonly serviceProfileProgramKey: string | undefined;
  readonly transitProfileProgramKey: string | undefined;
  readonly programKeyForEnactedAppropriationNextLineageGovernmentScope:
    string | null;
}) {
  return (
    facts.serviceProfileProgramKey! ??
    facts.transitProfileProgramKey! ??
    facts.programKeyForEnactedAppropriationNextLineageGovernmentScope!
  );
}

/** Legacy line 452: !programKey */
export function appropriationFromEnactedMeasureRule41(facts: {
  readonly programKey: string | null;
}) {
  return !facts.programKey!;
}

/** Legacy line 455: stateUsps ? { stateUsps } : {} */
export function appropriationFromEnactedMeasureRule42(facts: {
  readonly stateUsps: string | null;
  readonly stateUsps2: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.stateUsps! ? facts.stateUsps2 : facts.selectedValue;
}

/** Legacy line 460: transitProfile           ? operativeDateInWorld(world, enactment)!.date           : (compiledAvailabilityOpensOn(lineage) ?? adoptedOn) */
export function appropriationFromEnactedMeasureRule43(facts: {
  readonly transitProfile: unknown;
  readonly operativeDateInWorldWorldEnactmentDate: string;
  readonly compiledAvailabilityOpensOnLineage: string | null | undefined;
  readonly adoptedOn: string;
}) {
  return facts.transitProfile
    ? facts.operativeDateInWorldWorldEnactmentDate
    : (facts.compiledAvailabilityOpensOnLineage! ?? facts.adoptedOn);
}

/** Legacy line 463: availableThrough !== undefined           ? { availableThrough }           : transitProfile             ? { availableDays: transitProfile.availabilityDays }             : {} */
export function appropriationFromEnactedMeasureRule44(facts: {
  readonly availableThrough: string | undefined;
  readonly availableThrough2: unknown;
  readonly transitProfile: unknown;
  readonly availableDaysTransitProfileAvailabilityDays: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.availableThrough! !== undefined
    ? facts.availableThrough2
    : facts.transitProfile
      ? facts.availableDaysTransitProfileAvailabilityDays
      : facts.selectedValue;
}

/** Legacy line 469: transitProfile           ? `${PROGRAM_GOVERNING_VERSION}: adopted by the '${lineage.componentKey}' part of ${measure.designation}, ${measure.shortTitle}. The amount is that part's own enacted clause. Profile ${transitProfile.ref.profileId} version ${ */
export function appropriationFromEnactedMeasureRule45(facts: {
  readonly transitProfile: unknown;
  readonly PROGRAM_GOVERNING_VERSION: string;
  readonly lineageComponentKey: string | undefined;
  readonly measureDesignation: string;
  readonly measureShortTitle: string;
  readonly transitProfileRefProfileId: string;
  readonly transitProfileRefVersion: string;
  readonly transitProfileRefDigest: string;
  readonly serviceProfile: unknown;
  readonly serviceCapacityBasisNoteServiceProfile: string;
}) {
  return facts.transitProfile
    ? `${facts.PROGRAM_GOVERNING_VERSION}: adopted by the '${facts.lineageComponentKey!}' part of ${facts.measureDesignation}, ${facts.measureShortTitle}. The amount is that part's own enacted clause. Profile ${facts.transitProfileRefProfileId} version ${facts.transitProfileRefVersion} digest ${facts.transitProfileRefDigest} supplies the state transit program key and availability window; the saved enactment effective date starts availability. ${facts.serviceProfile ? facts.serviceCapacityBasisNoteServiceProfile : ""}This is spending authority, not cash.`
    : `${facts.PROGRAM_GOVERNING_VERSION}: adopted by the '${facts.lineageComponentKey!}' part of ${facts.measureDesignation}, ${facts.measureShortTitle}. The amount is that part's own enacted clause.`;
}

/** Legacy line 486: provision.provisionKey === "amount-provided" */
export function appropriationFromEnactedMeasureRule48(facts: {
  readonly provisionProvisionKey: string;
}) {
  return facts.provisionProvisionKey === "amount-provided";
}

/** Legacy line 489: amountProvision?.operativeEffect !== undefined &&     amountProvision.operativeEffect.kind !== "public-program-appropriation" */
export function appropriationFromEnactedMeasureRule49(facts: {
  readonly amountProvisionOperativeEffect: unknown;
  readonly amountProvisionOperativeEffectKind: string;
}) {
  return (
    facts.amountProvisionOperativeEffect !== undefined &&
    facts.amountProvisionOperativeEffectKind !== "public-program-appropriation"
  );
}

/** Legacy line 494: amount === null || amount === undefined || amount <= 0 */
export function appropriationFromEnactedMeasureRule50(facts: {
  readonly amount: number | null | undefined;
}) {
  return (
    facts.amount! === null || facts.amount! === undefined || facts.amount <= 0
  );
}

/** Legacy line 496: lineage ? statedAvailability(lineage) : undefined */
export function appropriationFromEnactedMeasureRule51(facts: {
  readonly lineage: unknown;
  readonly statedAvailabilityLineage: string | null | undefined;
}) {
  return facts.lineage ? facts.statedAvailabilityLineage! : undefined;
}

/** Legacy line 497: availableThrough === null */
export function appropriationFromEnactedMeasureRule52(facts: {
  readonly availableThrough: string | null | undefined;
}) {
  return facts.availableThrough! === null;
}

/** Legacy line 499: lineage?.familyKey === TRANSIT_FAMILY_KEY &&     lineage.familyVersion === TRANSIT_FAMILY_VERSION &&     lineage.variantKey === TRANSIT_VARIANT_KEY &&     lineage.authorityKey === TRANSIT_PROGRAM_KEY &&     lineage.authorityMeasureId === undefined */
export function appropriationFromEnactedMeasureRule53(facts: {
  readonly lineageFamilyKey: string | undefined;
  readonly TRANSIT_FAMILY_KEY: string;
  readonly lineageFamilyVersion: string;
  readonly TRANSIT_FAMILY_VERSION: string;
  readonly lineageVariantKey: string;
  readonly TRANSIT_VARIANT_KEY: string;
  readonly lineageAuthorityKey: string | undefined;
  readonly TRANSIT_PROGRAM_KEY: string;
  readonly lineageAuthorityMeasureId: string | undefined;
}) {
  return (
    facts.lineageFamilyKey! === facts.TRANSIT_FAMILY_KEY &&
    facts.lineageFamilyVersion === facts.TRANSIT_FAMILY_VERSION &&
    facts.lineageVariantKey === facts.TRANSIT_VARIANT_KEY &&
    facts.lineageAuthorityKey! === facts.TRANSIT_PROGRAM_KEY &&
    facts.lineageAuthorityMeasureId! === undefined
  );
}

/** Legacy line 505: pinnedLegacyTransit &&     measure.jurisdictionId !==       stateJurisdictionForKey(LEGACY_TRANSIT_COMPILED_STATE)?.id */
export function appropriationFromEnactedMeasureRule54(facts: {
  readonly pinnedLegacyTransit: boolean;
  readonly measureJurisdictionId: string;
  readonly stateJurisdictionForKeyLEGACY_TRANSIT_COMPILED_STATEId:
    string | undefined;
}) {
  return (
    facts.pinnedLegacyTransit &&
    facts.measureJurisdictionId !==
      facts.stateJurisdictionForKeyLEGACY_TRANSIT_COMPILED_STATEId!
  );
}

/** Legacy line 510: pinnedLegacyTransit     ? operativeDateInWorld(world, enactment)?.date     : null */
export function appropriationFromEnactedMeasureRule55(facts: {
  readonly pinnedLegacyTransit: boolean;
  readonly operativeDateInWorldWorldEnactmentDate: string | undefined;
}) {
  return facts.pinnedLegacyTransit
    ? facts.operativeDateInWorldWorldEnactmentDate!
    : null;
}

/** Legacy line 513: pinnedLegacyTransit && !pinnedOperativeDate */
export function appropriationFromEnactedMeasureRule56(facts: {
  readonly pinnedLegacyTransit: boolean;
  readonly pinnedOperativeDate: string | null | undefined;
}) {
  return facts.pinnedLegacyTransit && !facts.pinnedOperativeDate!;
}

/** Legacy line 515: lineage?.variantKey === STATE_TRANSIT_VARIANT_KEY       ? stateTransitProfileForLineage(world, measure, enactment, lineage)       : null */
export function appropriationFromEnactedMeasureRule57(facts: {
  readonly lineageVariantKey: string | undefined;
  readonly STATE_TRANSIT_VARIANT_KEY: string;
  readonly stateTransitProfileForLineageWorldMeasureEnactmentLineage: unknown;
}) {
  return facts.lineageVariantKey! === facts.STATE_TRANSIT_VARIANT_KEY
    ? facts.stateTransitProfileForLineageWorldMeasureEnactmentLineage
    : null;
}

/** Legacy line 518: lineage?.variantKey === STATE_TRANSIT_VARIANT_KEY && !transitProfile */
export function appropriationFromEnactedMeasureRule58(facts: {
  readonly lineageVariantKey: string | undefined;
  readonly STATE_TRANSIT_VARIANT_KEY: string;
  readonly transitProfile: unknown;
}) {
  return (
    facts.lineageVariantKey! === facts.STATE_TRANSIT_VARIANT_KEY &&
    !facts.transitProfile
  );
}

/** Legacy line 520: lineage && !lineageAuthorizesAppropriation(lineage) */
export function appropriationFromEnactedMeasureRule59(facts: {
  readonly lineage: unknown;
  readonly lineageAuthorizesAppropriationLineage: boolean;
}) {
  return facts.lineage && !facts.lineageAuthorizesAppropriationLineage;
}

/** Legacy line 521: lineage && !measureMayEnact(measure.rulePackId, lineage) */
export function appropriationFromEnactedMeasureRule60(facts: {
  readonly lineage: unknown;
  readonly measureMayEnactMeasureRulePackIdLineage: boolean;
}) {
  return facts.lineage && !facts.measureMayEnactMeasureRulePackIdLineage;
}

/** Legacy line 523: amountProvision?.operativeEffect !== undefined &&     (!lineage || !lineageAuthorizesAppropriation(lineage)) */
export function appropriationFromEnactedMeasureRule61(facts: {
  readonly amountProvisionOperativeEffect: unknown;
  readonly lineage: unknown;
  readonly lineageAuthorizesAppropriationLineage: boolean;
}) {
  return (
    facts.amountProvisionOperativeEffect !== undefined &&
    (!facts.lineage || !facts.lineageAuthorizesAppropriationLineage)
  );
}

/** Legacy line 527: lineage?.familyKey ?? "appropriations" */
export function appropriationFromEnactedMeasureRule62(facts: {
  readonly lineageFamilyKey: string | undefined;
}) {
  return facts.lineageFamilyKey! ?? "appropriations";
}

/** Legacy line 528: stateUsps     ? stateTaxServiceProfileForJurisdictionId(world, measure.jurisdictionId)     : null */
export function appropriationFromEnactedMeasureRule63(facts: {
  readonly stateUsps: string | null;
  readonly stateTaxServiceProfileForJurisdictionIdWorldMeasureJurisdictionId: unknown;
}) {
  return facts.stateUsps!
    ? facts.stateTaxServiceProfileForJurisdictionIdWorldMeasureJurisdictionId
    : null;
}

/** Legacy line 532: gameProfile &&     stateUsps &&     lineage &&     lineage.componentKey === undefined &&     lineage.familyKey === gameProfile.appropriation.familyKey &&     lineage.variantKey === gameProfile.appropriation.variantKey &&     lineage.authorityKey ===  */
export function appropriationFromEnactedMeasureRule64(facts: {
  readonly gameProfile: unknown;
  readonly stateUsps: string | null;
  readonly lineage: unknown;
  readonly lineageComponentKey: string | undefined;
  readonly lineageFamilyKey: string;
  readonly gameProfileAppropriationFamilyKey: string;
  readonly lineageVariantKey: string;
  readonly gameProfileAppropriationVariantKey: string;
  readonly lineageAuthorityKey: string | undefined;
  readonly gameProfileAppropriationAuthorityKey: string;
  readonly amount: number;
  readonly gameProfileAppropriationAmountMinorUnits: number;
  readonly familyKey: string;
  readonly governingProgramKeyFamilyKeyStateUsps: string;
  readonly gameProfileAppropriationProgramKey: string;
}) {
  return (
    facts.gameProfile &&
    facts.stateUsps! &&
    facts.lineage &&
    facts.lineageComponentKey! === undefined &&
    facts.lineageFamilyKey === facts.gameProfileAppropriationFamilyKey &&
    facts.lineageVariantKey === facts.gameProfileAppropriationVariantKey &&
    facts.lineageAuthorityKey! === facts.gameProfileAppropriationAuthorityKey &&
    facts.amount === facts.gameProfileAppropriationAmountMinorUnits &&
    facts.familyKey === facts.gameProfileAppropriationFamilyKey &&
    facts.governingProgramKeyFamilyKeyStateUsps ===
      facts.gameProfileAppropriationProgramKey
  );
}

/** Legacy line 551: profileAuthorityMatches && gameProfile ? { gameProfile } : {} */
export function appropriationFromEnactedMeasureRule65(facts: {
  readonly profileAuthorityMatches: boolean;
  readonly gameProfile: unknown;
  readonly gameProfile2: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.profileAuthorityMatches && facts.gameProfile
    ? facts.gameProfile2
    : facts.selectedValue;
}

/** Legacy line 554: serviceProfile?.programKey ??     transitProfile?.programKey ??     (lineage       ? programKeyForEnactedAppropriation(world, lineage, governmentScope)       : programKeyForGovernment(familyKey, governmentScope)) */
export function appropriationFromEnactedMeasureRule66(facts: {
  readonly serviceProfileProgramKey: string | undefined;
  readonly transitProfileProgramKey: string | undefined;
  readonly lineage: unknown;
  readonly programKeyForEnactedAppropriationWorldLineageGovernmentScope:
    string | null;
  readonly programKeyForGovernmentFamilyKeyGovernmentScope: string;
}) {
  return (
    facts.serviceProfileProgramKey! ??
    facts.transitProfileProgramKey! ??
    (facts.lineage
      ? facts.programKeyForEnactedAppropriationWorldLineageGovernmentScope!
      : facts.programKeyForGovernmentFamilyKeyGovernmentScope)
  );
}

/** Legacy line 559: !programKey */
export function appropriationFromEnactedMeasureRule67(facts: {
  readonly programKey: string | null;
}) {
  return !facts.programKey!;
}

/** Legacy line 562: stateUsps ? { stateUsps } : {} */
export function appropriationFromEnactedMeasureRule68(facts: {
  readonly stateUsps: string | null;
  readonly stateUsps2: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.stateUsps! ? facts.stateUsps2 : facts.selectedValue;
}

/** Legacy line 567: transitProfile       ? operativeDateInWorld(world, enactment)!.date       : ((lineage && compiledAvailabilityOpensOn(lineage)) ??         pinnedOperativeDate ??         adoptedOn) */
export function appropriationFromEnactedMeasureRule69(facts: {
  readonly transitProfile: unknown;
  readonly operativeDateInWorldWorldEnactmentDate: string;
  readonly lineage: unknown;
  readonly compiledAvailabilityOpensOnLineage: string | null | undefined;
  readonly pinnedOperativeDate: string | null | undefined;
  readonly adoptedOn: string;
}) {
  return facts.transitProfile
    ? facts.operativeDateInWorldWorldEnactmentDate
    : ((facts.lineage && facts.compiledAvailabilityOpensOnLineage!) ??
        facts.pinnedOperativeDate! ??
        facts.adoptedOn);
}

/** Legacy line 572: availableThrough !== undefined       ? { availableThrough }       : transitProfile         ? { availableDays: transitProfile.availabilityDays }         : pinnedLegacyTransit           ? { availableDays: 366 }           : profileAuthorityMatches && ga */
export function appropriationFromEnactedMeasureRule70(facts: {
  readonly availableThrough: string | undefined;
  readonly availableThrough2: unknown;
  readonly transitProfile: unknown;
  readonly availableDaysTransitProfileAvailabilityDays: unknown;
  readonly pinnedLegacyTransit: boolean;
  readonly availableDays366: unknown;
  readonly profileAuthorityMatches: boolean;
  readonly gameProfile: unknown;
  readonly availableDaysGameProfileAppropriationAvailabilityDays: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.availableThrough! !== undefined
    ? facts.availableThrough2
    : facts.transitProfile
      ? facts.availableDaysTransitProfileAvailabilityDays
      : facts.pinnedLegacyTransit
        ? facts.availableDays366
        : facts.profileAuthorityMatches && facts.gameProfile
          ? facts.availableDaysGameProfileAppropriationAvailabilityDays
          : facts.selectedValue;
}

/** Legacy line 582: transitProfile       ? `${PROGRAM_GOVERNING_VERSION}: adopted by ${measure.designation}, ${measure.shortTitle}. The amount is the enacted clause's own figure. Profile ${transitProfile.ref.profileId} version ${transitProfile.ref.version} digest ${tran */
export function appropriationFromEnactedMeasureRule71(facts: {
  readonly transitProfile: unknown;
  readonly PROGRAM_GOVERNING_VERSION: string;
  readonly measureDesignation: string;
  readonly measureShortTitle: string;
  readonly transitProfileRefProfileId: string;
  readonly transitProfileRefVersion: string;
  readonly transitProfileRefDigest: string;
  readonly serviceProfile: unknown;
  readonly serviceCapacityBasisNoteServiceProfile: string;
}) {
  return facts.transitProfile
    ? `${facts.PROGRAM_GOVERNING_VERSION}: adopted by ${facts.measureDesignation}, ${facts.measureShortTitle}. The amount is the enacted clause's own figure. Profile ${facts.transitProfileRefProfileId} version ${facts.transitProfileRefVersion} digest ${facts.transitProfileRefDigest} supplies the state transit program key and availability window; the saved enactment effective date starts availability. ${facts.serviceProfile ? facts.serviceCapacityBasisNoteServiceProfile : ""}This is spending authority, not cash.`
    : facts.serviceProfile
      ? `${facts.PROGRAM_GOVERNING_VERSION}: adopted by ${facts.measureDesignation}, ${facts.measureShortTitle}. The amount is the enacted clause's own figure. ${facts.serviceCapacityBasisNoteServiceProfile}This is spending authority, not cash.`
      : `${facts.PROGRAM_GOVERNING_VERSION}: adopted by ${facts.measureDesignation}, ${facts.measureShortTitle}. The amount is the enacted clause's own figure.`;
}
