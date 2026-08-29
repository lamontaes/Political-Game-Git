/**
 * Campaign Finance Corpus Coverage Manifest Builder
 *
 * Produces an auditable coverage manifest with source vs synthetic inventory,
 * exact candidate math, and cryptographic integrity digests.
 */

import { computeSha256 } from "./provenance";
import type { FecCampaignFinanceCorpus } from "./types";

export interface EntityClassCount {
  actualOpenFec: number;
  transformedOfficial: number;
  syntheticFixture: number;
  total: number;
}

export interface CampaignFinanceManifest {
  manifestVersion: string;
  generatedAt: string;
  vintage: string;
  totals: {
    candidates: number;
    committees: number;
    relationships: number;
    filings: number;
    activeFilings: number;
    supersededFilings: number;
    receipts: number;
    disbursements: number;
    loans: number;
    debts: number;
    independentExpenditures: number;
  };
  sourceVsSyntheticInventory: {
    candidates: EntityClassCount;
    committees: EntityClassCount;
    relationships: EntityClassCount;
    filings: EntityClassCount;
    receipts: EntityClassCount;
    disbursements: EntityClassCount;
    loans: EntityClassCount;
    debts: EntityClassCount;
    independentExpenditures: EntityClassCount;
    aggregateAllEntities: {
      actualOpenFec: number;
      transformedOfficial: number;
      syntheticFixture: number;
      total: number;
      empiricalSharePercent: number;
    };
  };
  coverage: {
    cycles: number[];
    offices: {
      houseCandidates: number;
      senateCandidates: number;
      presidentialCandidates: number;
      totalCandidates: number;
      mathCheckPassed: boolean;
    };
    committeeTypes: Record<string, number>;
    statesRepresented: string[];
  };
  integrity: {
    corpusChecksum: string;
    totalActiveReceiptsVolume: number;
    totalActiveDisbursementsVolume: number;
    totalIndependentExpendituresVolume: number;
  };
}

function countByClass<T extends { recordClass?: string }>(
  items: T[],
): EntityClassCount {
  let actual = 0;
  let transformed = 0;
  let synthetic = 0;

  for (const item of items) {
    if (item.recordClass === "actual_openfec") actual++;
    else if (item.recordClass === "transformed_official") transformed++;
    else if (item.recordClass === "synthetic_fixture") synthetic++;
    else actual++; // Default official if omitted
  }

  return {
    actualOpenFec: actual,
    transformedOfficial: transformed,
    syntheticFixture: synthetic,
    total: items.length,
  };
}

export function buildCampaignFinanceManifest(
  corpus: FecCampaignFinanceCorpus,
  vintage = "2024-OpenFEC-v1.0",
): CampaignFinanceManifest {
  const activeFilings = corpus.filings.filter(
    (f) => f.amendmentChain.isLatestActiveAmendment,
  );
  const supersededFilings = corpus.filings.filter(
    (f) => !f.amendmentChain.isLatestActiveAmendment,
  );

  const cyclesSet = new Set<number>();
  for (const c of corpus.candidates)
    c.cycles.forEach((cy) => cyclesSet.add(cy));
  for (const f of corpus.filings) cyclesSet.add(f.cycle);

  const statesSet = new Set<string>();
  for (const c of corpus.candidates) if (c.state) statesSet.add(c.state);
  for (const com of corpus.committees) if (com.state) statesSet.add(com.state);

  const committeeTypesCount: Record<string, number> = {};
  for (const com of corpus.committees) {
    committeeTypesCount[com.committeeType] =
      (committeeTypesCount[com.committeeType] || 0) + 1;
  }

  const houseCands = corpus.candidates.filter((c) => c.office === "H").length;
  const senateCands = corpus.candidates.filter((c) => c.office === "S").length;
  const presCands = corpus.candidates.filter((c) => c.office === "P").length;
  const totalCands = corpus.candidates.length;
  const mathCheckPassed = houseCands + senateCands + presCands === totalCands;

  const invCandidates = countByClass(corpus.candidates);
  const invCommittees = countByClass(corpus.committees);
  const invRelationships = countByClass(corpus.relationships);
  const invFilings = countByClass(corpus.filings);
  const invReceipts = countByClass(corpus.receipts);
  const invDisbursements = countByClass(corpus.disbursements);
  const invLoans = countByClass(corpus.loans);
  const invDebts = countByClass(corpus.debts);
  const invIe = countByClass(corpus.independentExpenditures);

  const totalActual =
    invCandidates.actualOpenFec +
    invCommittees.actualOpenFec +
    invRelationships.actualOpenFec +
    invFilings.actualOpenFec +
    invReceipts.actualOpenFec +
    invDisbursements.actualOpenFec +
    invLoans.actualOpenFec +
    invDebts.actualOpenFec +
    invIe.actualOpenFec;

  const totalTransformed =
    invCandidates.transformedOfficial +
    invCommittees.transformedOfficial +
    invRelationships.transformedOfficial +
    invFilings.transformedOfficial +
    invReceipts.transformedOfficial +
    invDisbursements.transformedOfficial +
    invLoans.transformedOfficial +
    invDebts.transformedOfficial +
    invIe.transformedOfficial;

  const totalSynthetic =
    invCandidates.syntheticFixture +
    invCommittees.syntheticFixture +
    invRelationships.syntheticFixture +
    invFilings.syntheticFixture +
    invReceipts.syntheticFixture +
    invDisbursements.syntheticFixture +
    invLoans.syntheticFixture +
    invDebts.syntheticFixture +
    invIe.syntheticFixture;

  const grandTotal = totalActual + totalTransformed + totalSynthetic;
  const empiricalSharePercent =
    grandTotal > 0
      ? Math.round(((totalActual + totalTransformed) / grandTotal) * 1000) / 10
      : 0;

  let activeReceiptsSum = 0;
  let activeDisbursementsSum = 0;
  for (const f of activeFilings) {
    activeReceiptsSum += f.financialSummary.totalReceipts;
    activeDisbursementsSum += f.financialSummary.totalDisbursements;
  }

  const totalIeSum = corpus.independentExpenditures.reduce(
    (sum, ie) => sum + ie.amount,
    0,
  );

  const serialized = JSON.stringify(corpus);
  const corpusChecksum = computeSha256(serialized);

  return {
    manifestVersion: "1.0.0",
    generatedAt: "2026-08-29T12:00:00.000Z",
    vintage,
    totals: {
      candidates: corpus.candidates.length,
      committees: corpus.committees.length,
      relationships: corpus.relationships.length,
      filings: corpus.filings.length,
      activeFilings: activeFilings.length,
      supersededFilings: supersededFilings.length,
      receipts: corpus.receipts.length,
      disbursements: corpus.disbursements.length,
      loans: corpus.loans.length,
      debts: corpus.debts.length,
      independentExpenditures: corpus.independentExpenditures.length,
    },
    sourceVsSyntheticInventory: {
      candidates: invCandidates,
      committees: invCommittees,
      relationships: invRelationships,
      filings: invFilings,
      receipts: invReceipts,
      disbursements: invDisbursements,
      loans: invLoans,
      debts: invDebts,
      independentExpenditures: invIe,
      aggregateAllEntities: {
        actualOpenFec: totalActual,
        transformedOfficial: totalTransformed,
        syntheticFixture: totalSynthetic,
        total: grandTotal,
        empiricalSharePercent,
      },
    },
    coverage: {
      cycles: Array.from(cyclesSet).sort((a, b) => a - b),
      offices: {
        houseCandidates: houseCands,
        senateCandidates: senateCands,
        presidentialCandidates: presCands,
        totalCandidates: totalCands,
        mathCheckPassed,
      },
      committeeTypes: committeeTypesCount,
      statesRepresented: Array.from(statesSet).sort(),
    },
    integrity: {
      corpusChecksum,
      totalActiveReceiptsVolume: Math.round(activeReceiptsSum * 100) / 100,
      totalActiveDisbursementsVolume:
        Math.round(activeDisbursementsSum * 100) / 100,
      totalIndependentExpendituresVolume: Math.round(totalIeSum * 100) / 100,
    },
  };
}
