// Hand-maintained shape of electoral-calibration.generated.json. TypeScript reads this instead of typing the
// whole file literally (the file is data; this is its contract).
declare const data: {
  asOfDate: string;
  calibrationRows: Array<{
    contestKey: string;
    democraticTwoPartyShare: null | number;
    observedContestType: string;
    office: string;
    referenceAffiliation: string;
    referenceDate: string;
    sourceRef: string;
    stateUsps: string;
    totalVotes: null | number;
    twoPartyMargin: null | number;
    uncertaintyReason: null | string;
  }>;
  compiler: string;
  compilerVersion: string;
  congress: number;
  fieldNotes: {
    ambiguous: string;
    calibrationRows: string;
    candidateTotalsByParty: string;
    certifiedWinnerParty: string;
    decidingCount: string;
    democraticTwoPartyShare: string;
    governors: string;
    nonCandidateLines: string;
    totalVotes: string;
    uncontested: string;
    winnerBasis: string;
  };
  governors: {
    firstPrintedTermStart: string;
    notes: string[];
    officeholderName: string;
    party: string;
    sourceIds: string[];
    stateUsps: string;
    status: string;
    termStart: string;
  }[];
  house: Array<{
    ambiguous: boolean;
    candidateTotalsByParty: Record<string, number>;
    certifiedWinnerParty: string;
    decidingCount: null | {
      kind: string;
      totalsByParty: {
        democratic: number;
        republican: number;
      };
    };
    democraticTwoPartyShare: null | number;
    districtCode: string;
    districtGeoid: string;
    districtIdentityVintage: string;
    electionDate: string;
    nonCandidateLines: {
      blank?: number;
      "over-votes"?: number;
      "under-votes"?: number;
      "continuing-ballots"?: number;
      "exhausted-ballots"?: number;
      void?: number;
    };
    notes: string[];
    rawLabels: string[];
    recapTotal?: null | number;
    seatKey: string;
    sourceId: string;
    sourcePage: number;
    stateUsps: string;
    totalVotes: null | number;
    uncontested: boolean;
    winnerBasis: string;
    recapTotalIncludesNonCandidateLines?: boolean;
  }>;
  presidentialByState: Array<{
    democraticTwoPartyShare: number;
    nonCandidateLines: {
      "over-votes"?: number;
      "under-votes"?: number;
      blank?: number;
      "none-of-these-candidates"?: number;
      void?: number;
    };
    notes: string[];
    printedSectionTotal: null | number;
    rawLabels: string[];
    recapTotal?: number;
    sourceId: string;
    stateUsps: string;
    totalVotes: number;
    totalsByParty: Record<string, number>;
    recapTotalIncludesNonCandidateLines?: boolean;
  }>;
  provenanceClass: string;
  reconciliation: {
    checks: string[];
    clerkPoliticalDivisions119: {
      congress: number;
      houseDemocrats: number;
      houseOther: number;
      houseRepublicans: number;
      houseTotal: number;
      houseVacant: number;
      note: string;
      printedRow: string;
      senateDemocrats: number;
      senateOther: number;
      senateRepublicans: number;
      senateTotal: number;
      senateVacant: number;
      years: string;
    };
    houseWinners: {
      democratic: number;
      republican: number;
    };
    senateLastElectionWinners: {
      democratic: number;
      independent: number;
      republican: number;
    };
  };
  schema: string;
  senate: Array<{
    ambiguous: boolean;
    candidateTotalsByParty: Record<string, number>;
    certifiedWinnerParty: string;
    decidingCount: null | {
      kind: string;
      totalsByParty: {
        democratic: number;
        republican: number;
      };
    };
    democraticTwoPartyShare: null | number;
    electionKind: string;
    lastElectionYear: number;
    nonCandidateLines: {
      blank?: number;
      "over-votes"?: number;
      "under-votes"?: number;
      "none-of-these-candidates"?: number;
      void?: number;
    };
    notes: string[];
    rawLabels: string[];
    seatKey: string;
    senateClass: number;
    sourceId: string;
    stateUsps: string;
    totalVotes: number;
    uncontested: boolean;
    winnerBasis: string;
  }>;
  sources: Array<{
    byteLength: number;
    id: string;
    publishedNote: string;
    retrievedAt: null | string;
    sha256: string;
    url: string;
  }>;
};
export default data;
