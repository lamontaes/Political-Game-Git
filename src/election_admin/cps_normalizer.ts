import { makeCpsCalibrationRecordId, normalizeJurisdictionId } from "./ids";
import { createElectionAdminProvenance } from "./provenance";
import type {
  CpsCalibrationRecord,
  DemographicBreakdown,
  SourceCompletenessFlag,
  SurveyReasonBreakdown,
} from "./types";

export interface RawCpsInput {
  readonly vintageYear: number;
  readonly stateAbbr: string;
  readonly fips: string;
  readonly jurisdictionName: string;
  readonly categoryKey?: string;
  readonly surveyUniverse:
    | "voting_age_population"
    | "citizen_voting_age_population";
  readonly sampleSizeUnweighted: number;
  readonly weightingVariable?: string;
  readonly retrievalDate: string;
  readonly sourceUrl: string;
  readonly reportedRegistration: {
    readonly estimateCount: number;
    readonly ratePercent: number;
    readonly standardError: number;
    readonly marginOfError90Percent?: number;
  };
  readonly reportedVoting: {
    readonly estimateCount: number;
    readonly ratePercent: number;
    readonly standardError: number;
    readonly marginOfError90Percent?: number;
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
  readonly methodologyNotes?: string;
  readonly completeness?: SourceCompletenessFlag;
  readonly notes?: string;
}

export function computeMarginOfError90(standardError: number): number {
  return Number((standardError * 1.645).toFixed(4));
}

export function normalizeCpsRecord(input: RawCpsInput): CpsCalibrationRecord {
  const jurisdictionId = normalizeJurisdictionId(input.stateAbbr);
  const categoryKey = input.categoryKey ?? "overall";
  const id = makeCpsCalibrationRecordId(
    input.vintageYear,
    jurisdictionId,
    categoryKey,
  );

  const regMOE =
    input.reportedRegistration.marginOfError90Percent ??
    computeMarginOfError90(input.reportedRegistration.standardError);

  const voteMOE =
    input.reportedVoting.marginOfError90Percent ??
    computeMarginOfError90(input.reportedVoting.standardError);

  const weightingVariable = input.weightingVariable ?? "PWSSWGT";
  const methodologyNotes =
    input.methodologyNotes ??
    `Census Bureau Current Population Survey (CPS) November Voting and Registration Supplement. Weighted using ${weightingVariable}. Universe: ${input.surveyUniverse}. Standard errors calculated using Census replicate weights/generalized variance parameters.`;

  const payloadToHash = {
    id,
    vintageYear: input.vintageYear,
    jurisdictionId,
    fips: input.fips,
    surveyUniverse: input.surveyUniverse,
    sampleSizeUnweighted: input.sampleSizeUnweighted,
    weightingVariable,
    reportedRegistration: {
      ...input.reportedRegistration,
      marginOfError90Percent: regMOE,
    },
    reportedVoting: {
      ...input.reportedVoting,
      marginOfError90Percent: voteMOE,
    },
    demographics: input.demographics,
    votingMethod: input.votingMethod,
    registrationMethod: input.registrationMethod,
    reasonsForNotVoting: input.reasonsForNotVoting,
    reasonsForNotRegistering: input.reasonsForNotRegistering,
  };

  const provenance = createElectionAdminProvenance({
    source: "U.S. Census Bureau",
    publisher:
      "Current Population Survey (CPS) Voting and Registration Supplement",
    dataset: `CPS Voting and Registration Nov ${input.vintageYear}`,
    vintageYear: input.vintageYear,
    retrievalDate: input.retrievalDate,
    sourceUrl: input.sourceUrl,
    payloadToHash,
    notes: input.notes,
  });

  return {
    id,
    vintageYear: input.vintageYear,
    sourceType: "survey_sample_estimate",
    jurisdictionId,
    jurisdictionName: input.jurisdictionName,
    fips: input.fips,
    surveyUniverse: input.surveyUniverse,
    sampleSizeUnweighted: input.sampleSizeUnweighted,
    weightingVariable,
    reportedRegistration: {
      estimateCount: input.reportedRegistration.estimateCount,
      ratePercent: input.reportedRegistration.ratePercent,
      standardError: input.reportedRegistration.standardError,
      marginOfError90Percent: regMOE,
    },
    reportedVoting: {
      estimateCount: input.reportedVoting.estimateCount,
      ratePercent: input.reportedVoting.ratePercent,
      standardError: input.reportedVoting.standardError,
      marginOfError90Percent: voteMOE,
    },
    ...(input.demographics ? { demographics: input.demographics } : {}),
    ...(input.votingMethod ? { votingMethod: input.votingMethod } : {}),
    ...(input.registrationMethod
      ? { registrationMethod: input.registrationMethod }
      : {}),
    ...(input.reasonsForNotVoting
      ? { reasonsForNotVoting: input.reasonsForNotVoting }
      : {}),
    ...(input.reasonsForNotRegistering
      ? { reasonsForNotRegistering: input.reasonsForNotRegistering }
      : {}),
    methodologyNotes,
    completeness: input.completeness ?? "complete",
    provenance,
  };
}
