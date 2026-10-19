/** Explicit allowlist: research identities and prose never enter runtime data. */
export function projectElectoralCalibration(corpus) {
  return {
    schema: corpus.schema,
    asOfDate: corpus.asOfDate,
    calibrationRows: corpus.calibrationRows.map((row) => ({
      office: row.office,
      contestKey: row.contestKey,
      stateUsps: row.stateUsps,
      referenceDate: row.referenceDate,
      referenceAffiliation: row.referenceAffiliation,
      observedContestType: row.observedContestType,
      totalVotes: row.totalVotes,
      twoPartyMargin: row.twoPartyMargin,
      democraticTwoPartyShare: row.democraticTwoPartyShare,
      sourceRef: row.sourceRef,
      uncertaintyReason: row.uncertaintyReason,
    })),
    presidentialByState: corpus.presidentialByState.map((row) => ({
      stateUsps: row.stateUsps,
      totalVotes: row.totalVotes,
      totalsByParty: Object.fromEntries(Object.entries(row.totalsByParty)),
    })),
  };
}
