/**
 * Core type definitions for the Election Administration & Participation Source Compiler.
 *
 * CRITICAL SEMANTIC INVARIANTS:
 * 1. EAVS ADMINISTRATIVE COUNTS != CPS SURVEY ESTIMATES.
 *    Administrative counts and survey estimates have distinct types and are never forced to match.
 * 2. Missing data must NEVER be coerced to 0. Use null with explicit completeness flags.
 * 3. All survey estimates must preserve weights, universe (VAP vs CVAP), SE, and 90% MOE.
 * 4. Pure source data: no simulation logic, no voter-by-voter preference modeling.
 */

export type SourceType = "administrative_official" | "survey_sample_estimate";

export type SourceCompletenessFlag =
  | "complete"
  | "partial"
  | "item_nonresponse"
  | "unreported"
  | "not_applicable"
  | "suppressed_for_sample_size";

export interface ElectionAdminProvenance {
  readonly source: string;
  readonly publisher: string;
  readonly dataset: string;
  readonly vintageYear: number;
  readonly retrievalDate: string;
  readonly sourceUrl: string;
  readonly contentHash: string;
  readonly schemaVersion: string;
  readonly notes?: string;
}

// ---------------------------------------------------------------------------
// 1. EAVS Administrative Records (State & Local County/Jurisdiction)
// ---------------------------------------------------------------------------

export interface EavsSectionARegistration {
  readonly totalRegistered: number | null;
  readonly activeRegistered: number | null;
  readonly inactiveRegistered: number | null;
  readonly newRegistrations: {
    readonly total: number | null;
    readonly byMail: number | null;
    readonly inPerson: number | null;
    readonly online: number | null;
    readonly motorVoter: number | null;
    readonly other: number | null;
  };
  readonly listMaintenanceRemovals: {
    readonly total: number | null;
    readonly moved: number | null;
    readonly deceased: number | null;
    readonly felonyDisqualification: number | null;
    readonly failureToVoteInactivity: number | null;
    readonly other: number | null;
  };
}

export interface EavsSectionBUocava {
  readonly transmitted: number | null;
  readonly returned: number | null;
  readonly counted: number | null;
  readonly rejected: number | null;
  readonly rejectionRate: number | null;
  readonly rejectionReasons?: {
    readonly late: number | null;
    readonly missingSignature: number | null;
    readonly other: number | null;
  };
}

export interface EavsSectionCMailVoting {
  readonly transmitted: number | null;
  readonly returned: number | null;
  readonly counted: number | null;
  readonly rejected: number | null;
  readonly rejectionRate: number | null;
  readonly rejectionReasons: {
    readonly late: number | null;
    readonly missingSignature: number | null;
    readonly signatureMismatch: number | null;
    readonly missingWitnessOrNotary: number | null;
    readonly missingSecrecyEnvelope: number | null;
    readonly other: number | null;
  };
}

export interface EavsSectionDInPersonAndPolling {
  readonly totalParticipants: number | null;
  readonly inPersonElectionDayVotes: number | null;
  readonly inPersonEarlyVotes: number | null;
  readonly mailVotesCounted: number | null;
  readonly provisionalVotesCounted: number | null;
  readonly physicalPollingPlaces: number | null;
  readonly earlyVotingLocations: number | null;
  readonly voteCenters: number | null;
  readonly activePrecincts: number | null;
  readonly pollWorkersCount: number | null;
  readonly pollWorkerAgeBreakdown?: {
    readonly under18: number | null;
    readonly age18to25: number | null;
    readonly age26to40: number | null;
    readonly age41to60: number | null;
    readonly age61to70: number | null;
    readonly age71plus: number | null;
  };
  readonly pollWorkerRecruitmentDifficulty?:
    | "very_easy"
    | "somewhat_easy"
    | "somewhat_difficult"
    | "very_difficult"
    | null;
}

export interface EavsSectionEProvisional {
  readonly provisionalBallotsCast: number | null;
  readonly countedInFull: number | null;
  readonly countedInPart: number | null;
  readonly rejected: number | null;
  readonly rejectionRate: number | null;
  readonly rejectionReasons: {
    readonly voterNotRegistered: number | null;
    readonly wrongJurisdiction: number | null;
    readonly wrongPrecinct: number | null;
    readonly missingRequiredId: number | null;
    readonly ballotAlreadyCast: number | null;
    readonly other: number | null;
  };
}

export interface EavsSectionFVotingTechnology {
  readonly primaryVotingSystem:
    | "paper_optical_scan"
    | "dre_with_vvpat"
    | "dre_without_vvpat"
    | "ballot_marking_device"
    | "hybrid"
    | null;
  readonly electronicPollBooksUsed: boolean | null;
  readonly votingSystemVendors: readonly string[];
  readonly accessibleVotingEquipmentCount: number | null;
}

export interface EavsJurisdictionRecord {
  readonly id: string;
  readonly vintageYear: number;
  readonly sourceType: "administrative_official";
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly level: "national" | "state" | "county" | "territory";
  readonly fips: string;
  readonly stateFips: string;
  readonly parentJurisdictionId: string | null;
  readonly sectionA_registration: EavsSectionARegistration;
  readonly sectionB_uocava: EavsSectionBUocava;
  readonly sectionC_mailVoting: EavsSectionCMailVoting;
  readonly sectionD_inPersonAndPolling: EavsSectionDInPersonAndPolling;
  readonly sectionE_provisional: EavsSectionEProvisional;
  readonly sectionF_votingTechnology: EavsSectionFVotingTechnology;
  readonly completeness: {
    readonly sectionA: SourceCompletenessFlag;
    readonly sectionB: SourceCompletenessFlag;
    readonly sectionC: SourceCompletenessFlag;
    readonly sectionD: SourceCompletenessFlag;
    readonly sectionE: SourceCompletenessFlag;
    readonly sectionF: SourceCompletenessFlag;
    readonly overall: SourceCompletenessFlag;
  };
  readonly provenance: ElectionAdminProvenance;
}

// ---------------------------------------------------------------------------
// 2. EAVS Policy Survey Records (State Level)
// ---------------------------------------------------------------------------

export interface PolicySurveyRecord {
  readonly id: string;
  readonly vintageYear: number;
  readonly sourceType: "administrative_official";
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly fips: string;
  readonly statutoryEffectiveDate: string;
  readonly registrationPolicy: {
    readonly deadlineDaysBeforeElection: number | null;
    readonly automaticVoterRegistration: boolean;
    readonly onlineVoterRegistration: boolean;
    readonly sameDayRegistration: boolean;
    readonly sameDayRegistrationLocations?: readonly (
      | "election_day_polls"
      | "early_voting_sites"
      | "county_office"
    )[];
    readonly preregistrationAge: number | null;
  };
  readonly voterIdPolicy: {
    readonly inPersonRequirement:
      | "strict_photo"
      | "non_strict_photo"
      | "strict_non_photo"
      | "non_strict_non_photo"
      | "no_document_signature_only";
    readonly provisionalCureAllowed: boolean;
    readonly acceptableIdTypes: readonly string[];
    readonly affidavitAllowed: boolean;
  };
  readonly earlyVotingPolicy: {
    readonly inPersonEarlyVotingAllowed: boolean;
    readonly earlyVotingWindowDays: number | null;
    readonly weekendVotingMandatory: boolean;
    readonly weekendVotingAllowed: boolean;
    readonly uniformHoursMandatory: boolean;
  };
  readonly mailVotingPolicy: {
    readonly model:
      | "universal_all_mail"
      | "no_excuse_absentee"
      | "excuse_required_absentee";
    readonly excusesAllowed?: readonly string[];
    readonly dropBoxesAllowed: boolean;
    readonly dropBoxMandate: string | null;
    readonly prepaidReturnPostage: boolean;
    readonly witnessOrNotaryRequired: boolean;
    readonly curePeriodAllowed: boolean;
    readonly curePeriodDays: number | null;
    readonly ballotTrackingAvailable: boolean;
  };
  readonly postElectionAuditPolicy: {
    readonly auditRequired: boolean;
    readonly auditType:
      | "risk_limiting"
      | "traditional_percentage"
      | "procedural"
      | "none";
    readonly statutoryTrigger: string;
  };
  readonly recountPolicy: {
    readonly automaticRecountMarginPercent: number | null;
    readonly candidateRequestedAllowed: boolean;
    readonly candidatePaysCostIfUnchanged: boolean;
  };
  readonly felonDisenfranchisementPolicy: {
    readonly restorationTiming:
      | "immediate_upon_release"
      | "completion_of_parole_probation"
      | "governor_pardon_executive_order"
      | "lifetime_ban_selected_crimes"
      | "no_disenfranchisement";
    readonly description: string;
  };
  readonly governanceStructure: {
    readonly chiefStateElectionOfficial:
      | "elected_secretary_of_state"
      | "appointed_secretary_of_state"
      | "state_board_of_elections"
      | "bipartite_commission"
      | "territory_election_commission";
    readonly localAdministrationStructure:
      | "elected_county_clerk"
      | "appointed_elections_administrator"
      | "county_board_of_elections"
      | "municipal_clerks"
      | "combined_clerk_board";
  };
  readonly completeness: SourceCompletenessFlag;
  readonly provenance: ElectionAdminProvenance;
}

// ---------------------------------------------------------------------------
// 3. Census CPS Voting & Registration Supplement Records
// ---------------------------------------------------------------------------

export interface DemographicBreakdown {
  readonly category: string;
  readonly label: string;
  readonly universeCount: number;
  readonly registeredCount: number;
  readonly registeredRatePercent: number;
  readonly registeredRateMOE: number;
  readonly votedCount: number;
  readonly votedRatePercent: number;
  readonly votedRateMOE: number;
}

export interface SurveyReasonBreakdown {
  readonly reasonKey: string;
  readonly label: string;
  readonly estimateCount: number;
  readonly percentOfNonVoters: number;
}

export interface CpsCalibrationRecord {
  readonly id: string;
  readonly vintageYear: number;
  readonly sourceType: "survey_sample_estimate";
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly fips: string;
  readonly surveyUniverse:
    | "voting_age_population"
    | "citizen_voting_age_population";
  readonly sampleSizeUnweighted: number;
  readonly weightingVariable: string;
  readonly reportedRegistration: {
    readonly estimateCount: number;
    readonly ratePercent: number;
    readonly standardError: number;
    readonly marginOfError90Percent: number;
  };
  readonly reportedVoting: {
    readonly estimateCount: number;
    readonly ratePercent: number;
    readonly standardError: number;
    readonly marginOfError90Percent: number;
  };
  readonly demographics?: {
    readonly byAge?: readonly DemographicBreakdown[];
    readonly bySex?: readonly DemographicBreakdown[];
    readonly byRaceHispanic?: readonly DemographicBreakdown[];
    readonly byEducation?: readonly DemographicBreakdown[];
    readonly byFamilyIncome?: readonly DemographicBreakdown[];
    readonly byDurationOfResidence?: readonly DemographicBreakdown[];
  };
  readonly votingMethod?: {
    readonly electionDayInPersonPercent: number;
    readonly earlyInPersonPercent: number;
    readonly byMailPercent: number;
    readonly notReportedPercent: number;
  };
  readonly registrationMethod?: {
    readonly dmvMotorVoterPercent: number;
    readonly byMailPercent: number;
    readonly inPersonElectionOfficePercent: number;
    readonly onlineInternetPercent: number;
    readonly pollingPlaceElectionDayPercent: number;
    readonly schoolCommunityDrivePercent: number;
    readonly otherPercent: number;
  };
  readonly reasonsForNotVoting?: readonly SurveyReasonBreakdown[];
  readonly reasonsForNotRegistering?: readonly SurveyReasonBreakdown[];
  readonly methodologyNotes: string;
  readonly completeness: SourceCompletenessFlag;
  readonly provenance: ElectionAdminProvenance;
}

// ---------------------------------------------------------------------------
// 4. Longitudinal Historical Turnout Series Records (1964–2024)
// ---------------------------------------------------------------------------

export interface HistoricalTurnoutEntry {
  readonly year: number;
  readonly electionType: "presidential" | "midterm";
  readonly votingAgePopulation: number | null;
  readonly citizenVotingAgePopulation: number | null;
  readonly officialAdministrativeTurnout: {
    readonly highestOfficeVotesCast: number | null;
    readonly totalBallotsCounted: number | null;
    readonly vapTurnoutRatePercent: number | null;
    readonly cvapTurnoutRatePercent: number | null;
    readonly sourceType: "administrative_official";
  };
  readonly cpsSurveyReportedTurnout: {
    readonly reportedVotedCount: number;
    readonly reportedVotedRatePercent: number;
    readonly marginOfError90Percent: number;
    readonly sourceType: "survey_sample_estimate";
  };
  readonly notes?: string;
}

export interface HistoricalTurnoutSeriesRecord {
  readonly id: string;
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly fips: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly seriesEntries: readonly HistoricalTurnoutEntry[];
  readonly provenance: ElectionAdminProvenance;
}

// ---------------------------------------------------------------------------
// 5. Corpus Container & Manifest Types
// ---------------------------------------------------------------------------

export interface NormalizedElectionAdminCorpus {
  readonly schemaVersion: string;
  readonly compiledAt: string;
  readonly eavsRecords: readonly EavsJurisdictionRecord[];
  readonly policySurveys: readonly PolicySurveyRecord[];
  readonly cpsCalibrations: readonly CpsCalibrationRecord[];
  readonly historicalSeries: readonly HistoricalTurnoutSeriesRecord[];
  readonly manifest: ElectionAdminManifest;
}

export interface ElectionAdminManifest {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly summary: {
    readonly totalEavsRecords: number;
    readonly totalStateEavsRecords: number;
    readonly totalCountyEavsRecords: number;
    readonly totalPolicySurveys: number;
    readonly totalCpsCalibrations: number;
    readonly totalHistoricalSeries: number;
    readonly totalJurisdictionsCovered: number;
  };
  readonly jurisdictionCoverage: readonly {
    readonly jurisdictionId: string;
    readonly jurisdictionName: string;
    readonly fips: string;
    readonly level: "national" | "state" | "county" | "territory";
    readonly hasEavs: boolean;
    readonly hasPolicySurvey: boolean;
    readonly hasCpsCalibration: boolean;
    readonly hasHistoricalSeries: boolean;
    readonly completenessSummary: SourceCompletenessFlag;
  }[];
  readonly corpusFileHashes: {
    readonly normalizedCorpusSha256: string;
    readonly eavsPartitionSha256: string;
    readonly policySurveyPartitionSha256: string;
    readonly cpsPartitionSha256: string;
    readonly historicalTurnoutPartitionSha256: string;
  };
}
