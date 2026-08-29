import {
  makeEavsRecordId,
  normalizeJurisdictionId,
  parseJurisdictionLevel,
} from "./ids";
import { createElectionAdminProvenance } from "./provenance";
import type {
  EavsJurisdictionRecord,
  EavsSectionARegistration,
  EavsSectionBUocava,
  EavsSectionCMailVoting,
  EavsSectionDInPersonAndPolling,
  EavsSectionEProvisional,
  EavsSectionFVotingTechnology,
  SourceCompletenessFlag,
} from "./types";

export interface RawEavsInput {
  readonly vintageYear: number;
  readonly stateAbbr: string;
  readonly countyFips?: string;
  readonly fips: string;
  readonly jurisdictionName: string;
  readonly parentJurisdictionId?: string | null;
  readonly retrievalDate: string;
  readonly sourceUrl: string;
  readonly sectionA?: Partial<{
    totalRegistered: number | null | string;
    activeRegistered: number | null | string;
    inactiveRegistered: number | null | string;
    newRegistrationsTotal: number | null | string;
    newByMail: number | null | string;
    newInPerson: number | null | string;
    newOnline: number | null | string;
    newMotorVoter: number | null | string;
    newOther: number | null | string;
    removalsTotal: number | null | string;
    removalsMoved: number | null | string;
    removalsDeceased: number | null | string;
    removalsFelony: number | null | string;
    removalsInactivity: number | null | string;
    removalsOther: number | null | string;
  }>;
  readonly sectionB?: Partial<{
    transmitted: number | null | string;
    returned: number | null | string;
    counted: number | null | string;
    rejected: number | null | string;
    rejectionRate: number | null | string;
    rejectionReasons?: {
      late: number | null | string;
      missingSignature: number | null | string;
      other: number | null | string;
    };
  }>;
  readonly sectionC?: Partial<{
    transmitted: number | null | string;
    returned: number | null | string;
    counted: number | null | string;
    rejected: number | null | string;
    rejectionRate: number | null | string;
    rejectionReasons?: Partial<{
      late: number | null | string;
      missingSignature: number | null | string;
      signatureMismatch: number | null | string;
      missingWitnessOrNotary: number | null | string;
      missingSecrecyEnvelope: number | null | string;
      other: number | null | string;
    }>;
  }>;
  readonly sectionD?: Partial<{
    totalParticipants: number | null | string;
    inPersonElectionDayVotes: number | null | string;
    inPersonEarlyVotes: number | null | string;
    mailVotesCounted: number | null | string;
    provisionalVotesCounted: number | null | string;
    physicalPollingPlaces: number | null | string;
    earlyVotingLocations: number | null | string;
    voteCenters: number | null | string;
    activePrecincts: number | null | string;
    pollWorkersCount: number | null | string;
    pollWorkerAgeBreakdown?: Partial<{
      under18: number | null | string;
      age18to25: number | null | string;
      age26to40: number | null | string;
      age41to60: number | null | string;
      age61to70: number | null | string;
      age71plus: number | null | string;
    }>;
    pollWorkerRecruitmentDifficulty?:
      | "very_easy"
      | "somewhat_easy"
      | "somewhat_difficult"
      | "very_difficult"
      | null;
  }>;
  readonly sectionE?: Partial<{
    provisionalBallotsCast: number | null | string;
    countedInFull: number | null | string;
    countedInPart: number | null | string;
    rejected: number | null | string;
    rejectionRate: number | null | string;
    rejectionReasons?: Partial<{
      voterNotRegistered: number | null | string;
      wrongJurisdiction: number | null | string;
      wrongPrecinct: number | null | string;
      missingRequiredId: number | null | string;
      ballotAlreadyCast: number | null | string;
      other: number | null | string;
    }>;
  }>;
  readonly sectionF?: Partial<{
    primaryVotingSystem:
      | "paper_optical_scan"
      | "dre_with_vvpat"
      | "dre_without_vvpat"
      | "ballot_marking_device"
      | "hybrid"
      | null;
    electronicPollBooksUsed: boolean | null;
    votingSystemVendors?: readonly string[];
    accessibleVotingEquipmentCount: number | null | string;
  }>;
  readonly completenessOverrides?: Partial<{
    sectionA: SourceCompletenessFlag;
    sectionB: SourceCompletenessFlag;
    sectionC: SourceCompletenessFlag;
    sectionD: SourceCompletenessFlag;
    sectionE: SourceCompletenessFlag;
    sectionF: SourceCompletenessFlag;
    overall: SourceCompletenessFlag;
  }>;
  readonly notes?: string;
}

/**
 * Safely parses an administrative number without coercing missing values to 0.
 */
export function parseAdminNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (Number.isNaN(val) || val === -999999 || val === -1) return null;
    return val;
  }
  if (typeof val === "string") {
    const clean = val.trim();
    if (
      clean === "" ||
      clean === "NA" ||
      clean === "N/A" ||
      clean === "-999999" ||
      clean === "Data not available" ||
      clean === "Does not apply"
    ) {
      return null;
    }
    const num = Number(clean.replace(/,/g, ""));
    return Number.isNaN(num) ? null : num;
  }
  return null;
}

export function normalizeEavsRecord(input: RawEavsInput): EavsJurisdictionRecord {
  const jurisdictionId = normalizeJurisdictionId(input.stateAbbr, input.countyFips);
  const stateFips = input.fips.length === 5 ? input.fips.slice(0, 2) : input.fips;
  const level = parseJurisdictionLevel(jurisdictionId, input.fips);

  // Section A Normalization
  const rawA = input.sectionA ?? {};
  const sectionA: EavsSectionARegistration = {
    totalRegistered: parseAdminNumber(rawA.totalRegistered),
    activeRegistered: parseAdminNumber(rawA.activeRegistered),
    inactiveRegistered: parseAdminNumber(rawA.inactiveRegistered),
    newRegistrations: {
      total: parseAdminNumber(rawA.newRegistrationsTotal),
      byMail: parseAdminNumber(rawA.newByMail),
      inPerson: parseAdminNumber(rawA.newInPerson),
      online: parseAdminNumber(rawA.newOnline),
      motorVoter: parseAdminNumber(rawA.newMotorVoter),
      other: parseAdminNumber(rawA.newOther),
    },
    listMaintenanceRemovals: {
      total: parseAdminNumber(rawA.removalsTotal),
      moved: parseAdminNumber(rawA.removalsMoved),
      deceased: parseAdminNumber(rawA.removalsDeceased),
      felonyDisqualification: parseAdminNumber(rawA.removalsFelony),
      failureToVoteInactivity: parseAdminNumber(rawA.removalsInactivity),
      other: parseAdminNumber(rawA.removalsOther),
    },
  };

  // Section B Normalization (UOCAVA)
  const rawB = input.sectionB ?? {};
  const bTransmitted = parseAdminNumber(rawB.transmitted);
  const bReturned = parseAdminNumber(rawB.returned);
  const bCounted = parseAdminNumber(rawB.counted);
  const bRejected = parseAdminNumber(rawB.rejected);
  const bRate =
    parseAdminNumber(rawB.rejectionRate) ??
    (bReturned && bRejected !== null && bReturned > 0
      ? Number((bRejected / bReturned).toFixed(4))
      : null);

  const sectionB: EavsSectionBUocava = {
    transmitted: bTransmitted,
    returned: bReturned,
    counted: bCounted,
    rejected: bRejected,
    rejectionRate: bRate,
    rejectionReasons: rawB.rejectionReasons
      ? {
          late: parseAdminNumber(rawB.rejectionReasons.late),
          missingSignature: parseAdminNumber(rawB.rejectionReasons.missingSignature),
          other: parseAdminNumber(rawB.rejectionReasons.other),
        }
      : undefined,
  };

  // Section C Normalization (Mail Voting)
  const rawC = input.sectionC ?? {};
  const cTransmitted = parseAdminNumber(rawC.transmitted);
  const cReturned = parseAdminNumber(rawC.returned);
  const cCounted = parseAdminNumber(rawC.counted);
  const cRejected = parseAdminNumber(rawC.rejected);
  const cRate =
    parseAdminNumber(rawC.rejectionRate) ??
    (cReturned && cRejected !== null && cReturned > 0
      ? Number((cRejected / cReturned).toFixed(4))
      : null);

  const rawCReasons = rawC.rejectionReasons ?? {};
  const sectionC: EavsSectionCMailVoting = {
    transmitted: cTransmitted,
    returned: cReturned,
    counted: cCounted,
    rejected: cRejected,
    rejectionRate: cRate,
    rejectionReasons: {
      late: parseAdminNumber(rawCReasons.late),
      missingSignature: parseAdminNumber(rawCReasons.missingSignature),
      signatureMismatch: parseAdminNumber(rawCReasons.signatureMismatch),
      missingWitnessOrNotary: parseAdminNumber(rawCReasons.missingWitnessOrNotary),
      missingSecrecyEnvelope: parseAdminNumber(rawCReasons.missingSecrecyEnvelope),
      other: parseAdminNumber(rawCReasons.other),
    },
  };

  // Section D Normalization (In-Person & Polling)
  const rawD = input.sectionD ?? {};
  const rawDAge = rawD.pollWorkerAgeBreakdown;
  const sectionD: EavsSectionDInPersonAndPolling = {
    totalParticipants: parseAdminNumber(rawD.totalParticipants),
    inPersonElectionDayVotes: parseAdminNumber(rawD.inPersonElectionDayVotes),
    inPersonEarlyVotes: parseAdminNumber(rawD.inPersonEarlyVotes),
    mailVotesCounted: parseAdminNumber(rawD.mailVotesCounted),
    provisionalVotesCounted: parseAdminNumber(rawD.provisionalVotesCounted),
    physicalPollingPlaces: parseAdminNumber(rawD.physicalPollingPlaces),
    earlyVotingLocations: parseAdminNumber(rawD.earlyVotingLocations),
    voteCenters: parseAdminNumber(rawD.voteCenters),
    activePrecincts: parseAdminNumber(rawD.activePrecincts),
    pollWorkersCount: parseAdminNumber(rawD.pollWorkersCount),
    pollWorkerAgeBreakdown: rawDAge
      ? {
          under18: parseAdminNumber(rawDAge.under18),
          age18to25: parseAdminNumber(rawDAge.age18to25),
          age26to40: parseAdminNumber(rawDAge.age26to40),
          age41to60: parseAdminNumber(rawDAge.age41to60),
          age61to70: parseAdminNumber(rawDAge.age61to70),
          age71plus: parseAdminNumber(rawDAge.age71plus),
        }
      : undefined,
    pollWorkerRecruitmentDifficulty:
      rawD.pollWorkerRecruitmentDifficulty ?? null,
  };

  // Section E Normalization (Provisional Ballots)
  const rawE = input.sectionE ?? {};
  const eCast = parseAdminNumber(rawE.provisionalBallotsCast);
  const eCountedFull = parseAdminNumber(rawE.countedInFull);
  const eCountedPart = parseAdminNumber(rawE.countedInPart);
  const eRejected = parseAdminNumber(rawE.rejected);
  const eRate =
    parseAdminNumber(rawE.rejectionRate) ??
    (eCast && eRejected !== null && eCast > 0
      ? Number((eRejected / eCast).toFixed(4))
      : null);

  const rawEReasons = rawE.rejectionReasons ?? {};
  const sectionE: EavsSectionEProvisional = {
    provisionalBallotsCast: eCast,
    countedInFull: eCountedFull,
    countedInPart: eCountedPart,
    rejected: eRejected,
    rejectionRate: eRate,
    rejectionReasons: {
      voterNotRegistered: parseAdminNumber(rawEReasons.voterNotRegistered),
      wrongJurisdiction: parseAdminNumber(rawEReasons.wrongJurisdiction),
      wrongPrecinct: parseAdminNumber(rawEReasons.wrongPrecinct),
      missingRequiredId: parseAdminNumber(rawEReasons.missingRequiredId),
      ballotAlreadyCast: parseAdminNumber(rawEReasons.ballotAlreadyCast),
      other: parseAdminNumber(rawEReasons.other),
    },
  };

  // Section F Normalization (Technology)
  const rawF = input.sectionF ?? {};
  const sectionF: EavsSectionFVotingTechnology = {
    primaryVotingSystem: rawF.primaryVotingSystem ?? null,
    electronicPollBooksUsed:
      rawF.electronicPollBooksUsed !== undefined
        ? rawF.electronicPollBooksUsed
        : null,
    votingSystemVendors: rawF.votingSystemVendors ?? [],
    accessibleVotingEquipmentCount: parseAdminNumber(
      rawF.accessibleVotingEquipmentCount,
    ),
  };

  // Completeness flags
  const completeness = {
    sectionA:
      input.completenessOverrides?.sectionA ??
      assessCompleteness([
        sectionA.totalRegistered,
        sectionA.activeRegistered,
        sectionA.newRegistrations.total,
      ]),
    sectionB:
      input.completenessOverrides?.sectionB ??
      assessCompleteness([
        sectionB.transmitted,
        sectionB.returned,
        sectionB.counted,
      ]),
    sectionC:
      input.completenessOverrides?.sectionC ??
      assessCompleteness([
        sectionC.transmitted,
        sectionC.returned,
        sectionC.counted,
      ]),
    sectionD:
      input.completenessOverrides?.sectionD ??
      assessCompleteness([
        sectionD.totalParticipants,
        sectionD.inPersonElectionDayVotes,
        sectionD.physicalPollingPlaces,
      ]),
    sectionE:
      input.completenessOverrides?.sectionE ??
      assessCompleteness([
        sectionE.provisionalBallotsCast,
        sectionE.countedInFull,
        sectionE.rejected,
      ]),
    sectionF:
      input.completenessOverrides?.sectionF ??
      (sectionF.primaryVotingSystem !== null ? "complete" : "unreported"),
    overall:
      input.completenessOverrides?.overall ??
      "complete",
  };

  const id = makeEavsRecordId(input.vintageYear, jurisdictionId);

  const payloadToHash = {
    id,
    vintageYear: input.vintageYear,
    jurisdictionId,
    fips: input.fips,
    sectionA,
    sectionB,
    sectionC,
    sectionD,
    sectionE,
    sectionF,
  };

  const provenance = createElectionAdminProvenance({
    source: "U.S. Election Assistance Commission",
    publisher: "Election Administration and Voting Survey (EAVS)",
    dataset: `EAVS ${input.vintageYear}`,
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
    level,
    fips: input.fips,
    stateFips,
    parentJurisdictionId: input.parentJurisdictionId ?? null,
    sectionA_registration: sectionA,
    sectionB_uocava: sectionB,
    sectionC_mailVoting: sectionC,
    sectionD_inPersonAndPolling: sectionD,
    sectionE_provisional: sectionE,
    sectionF_votingTechnology: sectionF,
    completeness,
    provenance,
  };
}

function assessCompleteness(values: readonly (number | null)[]): SourceCompletenessFlag {
  const nonNull = values.filter((v) => v !== null).length;
  if (nonNull === values.length) return "complete";
  if (nonNull > 0) return "partial";
  return "unreported";
}
