// Shipped allowlist; full research records live only in data/source.
declare const data: {
  schema: string;
  asOfDate: string;
  calibrationRows: Array<{
    office: string;
    contestKey: string;
    stateUsps: string;
    referenceDate: string;
    referenceAffiliation: string | null;
    observedContestType: string;
    totalVotes: number | null;
    twoPartyMargin: number | null;
    democraticTwoPartyShare: number | null;
    sourceRef: string;
    uncertaintyReason: string | null;
  }>;
  presidentialByState: Array<{
    stateUsps: string;
    totalVotes: number | null;
    totalsByParty: Record<string, number>;
  }>;
};
export default data;
