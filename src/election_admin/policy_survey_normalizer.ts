import { makePolicySurveyRecordId, normalizeJurisdictionId } from "./ids";
import { createElectionAdminProvenance } from "./provenance";
import type { PolicySurveyRecord, SourceCompletenessFlag } from "./types";

export interface RawPolicySurveyInput {
  readonly vintageYear: number;
  readonly stateAbbr: string;
  readonly fips: string;
  readonly jurisdictionName: string;
  readonly statutoryEffectiveDate: string;
  readonly retrievalDate: string;
  readonly sourceUrl: string;
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
    readonly preregistrationAge?: number | null;
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
    readonly dropBoxMandate?: string | null;
    readonly prepaidReturnPostage: boolean;
    readonly witnessOrNotaryRequired: boolean;
    readonly curePeriodAllowed: boolean;
    readonly curePeriodDays?: number | null;
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
  readonly completeness?: SourceCompletenessFlag;
  readonly notes?: string;
}

export function normalizePolicySurveyRecord(
  input: RawPolicySurveyInput,
): PolicySurveyRecord {
  const jurisdictionId = normalizeJurisdictionId(input.stateAbbr);
  const id = makePolicySurveyRecordId(input.vintageYear, jurisdictionId);

  const payloadToHash = {
    id,
    vintageYear: input.vintageYear,
    jurisdictionId,
    fips: input.fips,
    statutoryEffectiveDate: input.statutoryEffectiveDate,
    registrationPolicy: input.registrationPolicy,
    voterIdPolicy: input.voterIdPolicy,
    earlyVotingPolicy: input.earlyVotingPolicy,
    mailVotingPolicy: input.mailVotingPolicy,
    postElectionAuditPolicy: input.postElectionAuditPolicy,
    recountPolicy: input.recountPolicy,
    felonDisenfranchisementPolicy: input.felonDisenfranchisementPolicy,
    governanceStructure: input.governanceStructure,
  };

  const provenance = createElectionAdminProvenance({
    source: "U.S. Election Assistance Commission",
    publisher: "EAVS Policy Survey",
    dataset: `EAVS Policy Survey ${input.vintageYear}`,
    vintageYear: input.vintageYear,
    retrievalDate: input.retrievalDate,
    sourceUrl: input.sourceUrl,
    payloadToHash,
    notes: input.notes,
  });

  return {
    id,
    vintageYear: input.vintageYear,
    sourceType: "administrative_official",
    jurisdictionId,
    jurisdictionName: input.jurisdictionName,
    fips: input.fips,
    statutoryEffectiveDate: input.statutoryEffectiveDate,
    registrationPolicy: {
      deadlineDaysBeforeElection:
        input.registrationPolicy.deadlineDaysBeforeElection ?? null,
      automaticVoterRegistration:
        input.registrationPolicy.automaticVoterRegistration,
      onlineVoterRegistration:
        input.registrationPolicy.onlineVoterRegistration,
      sameDayRegistration: input.registrationPolicy.sameDayRegistration,
      sameDayRegistrationLocations:
        input.registrationPolicy.sameDayRegistrationLocations ?? [],
      preregistrationAge: input.registrationPolicy.preregistrationAge ?? null,
    },
    voterIdPolicy: {
      inPersonRequirement: input.voterIdPolicy.inPersonRequirement,
      provisionalCureAllowed: input.voterIdPolicy.provisionalCureAllowed,
      acceptableIdTypes: input.voterIdPolicy.acceptableIdTypes,
      affidavitAllowed: input.voterIdPolicy.affidavitAllowed,
    },
    earlyVotingPolicy: {
      inPersonEarlyVotingAllowed:
        input.earlyVotingPolicy.inPersonEarlyVotingAllowed,
      earlyVotingWindowDays:
        input.earlyVotingPolicy.earlyVotingWindowDays ?? null,
      weekendVotingMandatory: input.earlyVotingPolicy.weekendVotingMandatory,
      weekendVotingAllowed: input.earlyVotingPolicy.weekendVotingAllowed,
      uniformHoursMandatory: input.earlyVotingPolicy.uniformHoursMandatory,
    },
    mailVotingPolicy: {
      model: input.mailVotingPolicy.model,
      excusesAllowed: input.mailVotingPolicy.excusesAllowed ?? [],
      dropBoxesAllowed: input.mailVotingPolicy.dropBoxesAllowed,
      dropBoxMandate: input.mailVotingPolicy.dropBoxMandate ?? null,
      prepaidReturnPostage: input.mailVotingPolicy.prepaidReturnPostage,
      witnessOrNotaryRequired:
        input.mailVotingPolicy.witnessOrNotaryRequired,
      curePeriodAllowed: input.mailVotingPolicy.curePeriodAllowed,
      curePeriodDays: input.mailVotingPolicy.curePeriodDays ?? null,
      ballotTrackingAvailable:
        input.mailVotingPolicy.ballotTrackingAvailable,
    },
    postElectionAuditPolicy: {
      auditRequired: input.postElectionAuditPolicy.auditRequired,
      auditType: input.postElectionAuditPolicy.auditType,
      statutoryTrigger: input.postElectionAuditPolicy.statutoryTrigger,
    },
    recountPolicy: {
      automaticRecountMarginPercent:
        input.recountPolicy.automaticRecountMarginPercent ?? null,
      candidateRequestedAllowed:
        input.recountPolicy.candidateRequestedAllowed,
      candidatePaysCostIfUnchanged:
        input.recountPolicy.candidatePaysCostIfUnchanged,
    },
    felonDisenfranchisementPolicy: {
      restorationTiming:
        input.felonDisenfranchisementPolicy.restorationTiming,
      description: input.felonDisenfranchisementPolicy.description,
    },
    governanceStructure: {
      chiefStateElectionOfficial:
        input.governanceStructure.chiefStateElectionOfficial,
      localAdministrationStructure:
        input.governanceStructure.localAdministrationStructure,
    },
    completeness: input.completeness ?? "complete",
    provenance,
  };
}
