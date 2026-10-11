// STOPGAP RULES3-GOV-054: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/program-governing.ts :: eligibleStandingOperator.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1319: !program */
export function eligibleStandingOperatorRule1(facts: {
  readonly program: unknown;
}) {
  return !facts.program;
}

/** Legacy line 1321: served ? stateKeyForJurisdiction(served) : null */
export function eligibleStandingOperatorRule2(facts: {
  readonly served: unknown;
  readonly stateKeyForJurisdictionServed: string | null;
}) {
  return facts.served ? facts.stateKeyForJurisdictionServed! : null;
}

/** Legacy line 1323: !id */
export function eligibleStandingOperatorRule3(facts: {
  readonly id: string | null;
}) {
  return !facts.id!;
}

/** Legacy line 1324: id === jurisdictionId */
export function eligibleStandingOperatorRule4(facts: {
  readonly id: string;
  readonly jurisdictionId: string;
}) {
  return facts.id === facts.jurisdictionId;
}

/** Legacy line 1327: lifePlaceByJurisdictionId(id)?.stateJurisdictionKey ??       (place ? stateKeyForJurisdiction(place) : null) */
export function eligibleStandingOperatorRule5(facts: {
  readonly lifePlaceByJurisdictionIdIdStateJurisdictionKey:
    string | null | undefined;
  readonly place: unknown;
  readonly stateKeyForJurisdictionPlace: string | null;
}) {
  return (
    facts.lifePlaceByJurisdictionIdIdStateJurisdictionKey! ??
    (facts.place ? facts.stateKeyForJurisdictionPlace! : null)
  );
}

/** Legacy line 1329: !!servedState && state === servedState */
export function eligibleStandingOperatorRule6(facts: {
  readonly servedState: string | null;
  readonly state: string | null;
}) {
  return !!facts.servedState! && facts.state! === facts.servedState;
}

/** Legacy line 1333: organization.formedAt > world.currentDate */
export function eligibleStandingOperatorRule7(facts: {
  readonly organizationFormedAt: string;
  readonly currentDate: string;
}) {
  return facts.organizationFormedAt > facts.currentDate;
}

/** Legacy line 1335: profile       ? program.operatorClassifications.indexOf(profile.classification)       : -1 */
export function eligibleStandingOperatorRule8(facts: {
  readonly profile: unknown;
  readonly programOperatorClassificationsIndexOfProfileClassification: number;
}) {
  return facts.profile
    ? facts.programOperatorClassificationsIndexOfProfileClassification
    : -1;
}

/** Legacy line 1338: rank < 0 */
export function eligibleStandingOperatorRule9(facts: {
  readonly rank: number;
}) {
  return facts.rank < 0;
}

/** Legacy line 1343: !organizationServesCounty(           world,           organization.id,           programKey,           jurisdictionId,         ) */
export function eligibleStandingOperatorRule10(facts: {
  readonly organizationServesCountyResult: boolean;
}) {
  return !facts.organizationServesCountyResult;
}

/** Legacy line 1351: !inPlace(profile!.locationJurisdictionId) */
export function eligibleStandingOperatorRule11(facts: {
  readonly inPlaceProfileLocationJurisdictionId: boolean;
}) {
  return !facts.inPlaceProfileLocationJurisdictionId;
}

/** Legacy line 1358: !best ||       rank < best.rank ||       (rank === best.rank &&         (candidate.formedAt < best.formedAt ||           (candidate.formedAt === best.formedAt && candidate.id < best.id))) */
export function eligibleStandingOperatorRule12(facts: {
  readonly best: unknown;
  readonly rank: number;
  readonly bestRank: number;
  readonly candidateFormedAt: string;
  readonly bestFormedAt: string;
  readonly candidateId: string;
  readonly bestId: string;
}) {
  return (
    !facts.best ||
    facts.rank < facts.bestRank ||
    (facts.rank === facts.bestRank &&
      (facts.candidateFormedAt < facts.bestFormedAt ||
        (facts.candidateFormedAt === facts.bestFormedAt &&
          facts.candidateId < facts.bestId)))
  );
}

/** Legacy line 1366: best?.id ?? null */
export function eligibleStandingOperatorRule13(facts: {
  readonly bestId: string | undefined;
}) {
  return facts.bestId! ?? null;
}
