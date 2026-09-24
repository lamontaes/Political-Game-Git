/**
 * Disclosed, versioned play rules for a general-purpose local government whose
 * own ordinance procedure has not been compiled. The Census unit supplies only
 * identity and footprint; every procedural field below belongs to the game.
 * A sourced municipal reading always takes precedence over this profile.
 */
import { governmentUnit, governmentUnitsForPlace } from "./government-units";
import type { GovernmentUnitIdentity } from "./government-units";
import {
  knownRule,
  majorityOf,
  notApplicableRule,
  unknownRule,
} from "./legislature-rules";
import type { LegislativeRulePack, RuleSourceRef } from "./legislature-rules";
import { LOCAL_ORDINANCE_SOURCE_ANCHORS } from "./local-ordinance-source-anchors.generated";
import type {
  MunicipalGovernment,
  MunicipalReading,
} from "./municipal-government";

export const LOCAL_ORDINANCE_GAME_PROFILE_VERSION = "local-ordinance-game/v1";

const majority = {
  numerator: 1,
  denominator: 2,
  denominatorBasis: "MEMBERS_ELECTED",
  fixedVotesRequired: null,
} as const;

function gameSource(unit: GovernmentUnitIdentity): RuleSourceRef {
  return {
    authority: "game-profile",
    citation: LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
    sourceTitle: "Our Civic Duty local ordinance game profile",
    sourceUrl: null,
    retrievedAt: null,
    verification: "game-profile",
    note: `Fictional procedure for ${unit.name}; the Census unit establishes identity only.`,
  };
}

export interface LocalOrdinanceSourceAnchor {
  readonly governmentKey: string;
  readonly sourceEvidence: string;
  readonly safeGameProcedure: boolean;
  readonly bodyName: string | null;
  readonly bodySize: number | null;
  readonly bodySizeSource: RuleSourceRef | null;
}

export function localOrdinanceSourceAnchor(
  unitId: string,
): LocalOrdinanceSourceAnchor | null {
  const anchors = LOCAL_ORDINANCE_SOURCE_ANCHORS as unknown as Readonly<
    Record<string, LocalOrdinanceSourceAnchor>
  >;
  return anchors[unitId] ?? null;
}

/** A runtime pack is derived on demand from its stable publisher identity. */
export function localOrdinanceGameRulePack(
  unit: GovernmentUnitIdentity,
): LegislativeRulePack | null {
  if (!unit.functionalActive) return null;
  const council = body(unit);
  const source = gameSource(unit);
  const anchor = localOrdinanceSourceAnchor(unit.id);
  if (anchor && !anchor.safeGameProcedure) return null;
  const bodyName = anchor?.bodyName ?? council.name;
  const bodySize = anchor?.bodySize ?? council.seats;
  const bodySizeSource = anchor?.bodySizeSource ?? source;
  const passage = majorityOf(
    "members-elected",
    "A majority of seated members votes yea (game profile).",
    source,
  );
  const quorum = majorityOf(
    "members-elected",
    "A majority of the profile's board is present (game profile).",
    source,
  );
  return {
    packId: `${unit.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
    jurisdictionKey: `US-${unit.stateUsps}`,
    displayName: `${unit.name} (${unit.unitType}) — ${bodyName}`,
    basis: "game-profile",
    structure: "unicameral",
    chambers: [
      {
        chamberKey: "council",
        name: bodyName,
        billDesignationPrefix: "ORD",
        seats: knownRule(bodySize, bodySizeSource),
        quorum: knownRule(quorum, source),
        introductionAllowed: true,
        referral: {
          authorityLabel: `${bodyName} presiding member`,
          multipleReferralAllowed: knownRule(false, source),
          everyMeasureMustBeHeard: knownRule(false, source),
          floorWithoutReferral: knownRule(true, source),
          source,
        },
        committees: [],
        floorStages: [
          {
            stageKey: "final-passage",
            label: "Adoption",
            amendable: knownRule(true, source),
            separateLegislativeDayRequired: false,
            vote: knownRule(passage, source),
            source,
          },
        ],
        amendments: {
          floorAmendmentsAllowed: knownRule(true, source),
          germanenessStandard: unknownRule(
            "The game profile does not impose a separate germaneness test.",
          ),
          source,
        },
      },
    ],
    chamberOrder: ["council"],
    origination: {
      generalOrigination: knownRule(["council"], source),
      subjectRestrictions: [],
      source,
    },
    interChamber: {
      kind: "not-applicable",
      note: "This game profile has one local legislative body.",
    },
    executive: {
      titleLabel: "Local executive",
      presentmentRequired: knownRule(false, source),
      actionWindowDaysInSession: notApplicableRule(
        "This game profile has no presentment.",
      ),
      actionWindowDaysAfterAdjournment: notApplicableRule(
        "This game profile has no presentment.",
      ),
      inactionOutcomeInSession: notApplicableRule(
        "This game profile has no presentment.",
      ),
      lineItemVeto: notApplicableRule(
        "This game profile has no executive veto.",
      ),
      override: {
        kind: "not-applicable",
        note: "This game profile has no executive veto.",
        source,
      },
      source,
    },
    enactment: {
      effectiveDateDistinctFromEnactment: knownRule(false, source),
      defaultEffectiveRule: knownRule(
        "Effective on passage (game profile).",
        source,
      ),
      source,
    },
    session: {
      sessionLabel: `${unit.name} local legislative year (game profile)`,
      adjournmentRule: unknownRule(
        "The game profile has no fixed adjournment date.",
      ),
      measuresDieAtAdjournment: unknownRule(
        "The game profile does not fix expiration at adjournment.",
      ),
      source,
    },
    sources: anchor?.bodySizeSource
      ? [source, anchor.bodySizeSource]
      : [source],
    unresolvedGaps: [
      "Actual local charter and ordinance procedure have not been sourced; this is a disclosed game profile.",
    ],
  };
}

export function localOrdinanceGameRulePackById(
  packId: string,
): LegislativeRulePack | null {
  const suffix = `:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
  if (!packId.endsWith(suffix)) return null;
  const unit = governmentUnit(packId.slice(0, -suffix.length));
  return unit ? localOrdinanceGameRulePack(unit) : null;
}

/** The publisher id, not a place name or a county-area id, fixes this key. */
export function localGovernmentGameProfileKey(
  unit: GovernmentUnitIdentity,
): string {
  return unit.id;
}

function body(unit: GovernmentUnitIdentity): { name: string; seats: number } {
  switch (unit.unitType) {
    case "county":
      return { name: "County board", seats: 5 };
    case "township":
      return { name: "Township board", seats: 3 };
    case "municipality":
      return { name: "Municipal council", seats: 5 };
  }
}

export function localGovernmentGameProfile(
  unit: GovernmentUnitIdentity,
): MunicipalGovernment | null {
  if (!unit.functionalActive) return null;
  const key = localGovernmentGameProfileKey(unit);
  const council = body(unit);
  const name = `${unit.name} (${unit.unitType})`;
  const profileNote = `${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}: fictional shared procedure for play; no local charter or ordinance rule is asserted.`;
  const reading: MunicipalReading = {
    key,
    state: unit.stateUsps,
    displayName: name,
    evidence: "game-profile",
    facts: [],
    asOf: "2026-09-24",
    form: null,
    basisType: profileNote,
    controllingAuthority: null,
    formEffectiveDate: null,
    bodyName: council.name,
    bodySize: council.seats,
    composition: {
      pattern: "game-profile",
      districtSeats: null,
      atLargeSeats: null,
      wardSeats: null,
      note: profileNote,
    },
    presidingOffice: "Presiding member (game profile)",
    executiveSelection: null,
    presidingRules: [],
    partisanship: [],
    terms: [],
    vacancyMechanism: null,
    separation: null,
    mayor: null,
    manager: null,
    departmentHeadAuthority: null,
    consolidationType: null,
    predecessorUnits: [],
    powers: [
      {
        power: "ORDINANCE_ADOPTION",
        heldByRole: "COUNCIL",
        held: true,
        heldState: "GAME_PROFILE",
        target: "general-policy ordinance",
        conditions: [profileNote],
        exceptions: [],
        threshold: majority,
      },
    ],
    procedure: {
      measureTypes: ["general-policy ordinance"],
      introductionSponsorship:
        "A seated member may introduce an ordinance (game profile).",
      readings: 1,
      quorumText:
        "A majority of the profile's full board is present (game profile).",
      quorumRule: majority,
      passageText: "A majority of seated members votes yea (game profile).",
      passageAbsence: null,
      amendment: "Floor amendments may be considered (game profile).",
      publicHearing: null,
      mayoralAction: null,
      mayoralActionState: "NOT_APPLICABLE",
      mayoralActionWindow: null,
      override: null,
      overrideState: "NOT_APPLICABLE",
      overrideAbsence: "The game profile has no executive veto.",
      effectivePublication:
        "Takes effect from the date of its passage (game profile).",
      committeeReferral: null,
      committeeReferralState: "NO_REQUIREMENT_FOUND",
      introductionToPassage: {
        basis: "ELAPSED_DAYS",
        minimumElapsedDays: 1,
        sameDayException: null,
      },
      betweenReadings: null,
    },
    budget: {
      fiscalYear: null,
      prepares: null,
      proposes: null,
      amends: null,
      adopts: null,
      submissionDeadline: null,
      adoptionDeadline: null,
      balancedBudgetConstraint: null,
    },
    meetingSeries: [],
    meetingPlaces: [],
    sources: [],
    unresolved: [
      "Local charter, council size, hearing, fiscal authority, and executive action have not been sourced; this is a disclosed game profile.",
    ],
  };
  return {
    key,
    state: unit.stateUsps,
    displayName: name,
    placeGeoid: unit.placeGeoid,
    placeName: null,
    identity: {
      countyEquivalentGeoid: null,
      countyAreaGeoid: unit.countyGeoid,
      censusGovernmentUnitId: null,
      publisherId: unit.publisherId,
      publisherUnitName: unit.name,
      governmentUnit: {
        unitType: unit.unitType,
        functionalActive: unit.functionalActive,
        webAddress: null,
        countyAreaName: null,
        evidence: { asOf: unit.asOf, row: null },
      },
      basis: "Census government-unit identity plus disclosed game procedure",
    },
    candidatePlace: null,
    readings: [reading],
  };
}

export function localGovernmentGameProfileByKey(
  key: string,
): MunicipalGovernment | null {
  const unit = governmentUnit(key);
  return unit ? localGovernmentGameProfile(unit) : null;
}

export function localGovernmentGameProfileForPlace(
  geoid: string,
): MunicipalGovernment | null {
  const units = governmentUnitsForPlace(geoid).filter(
    (unit) => unit.unitType === "municipality" && unit.functionalActive,
  );
  return units.length === 1 ? localGovernmentGameProfile(units[0]!) : null;
}
