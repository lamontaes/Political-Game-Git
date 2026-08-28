/**
 * Campaign Finance Corpus Coverage Manifest Builder
 */

import { computeSha256 } from "./provenance";
import type { FecCampaignFinanceCorpus } from "./types";

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
  coverage: {
    cycles: number[];
    offices: {
      houseCandidates: number;
      senateCandidates: number;
      presidentialCandidates: number;
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
    generatedAt: new Date().toISOString(),
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
    coverage: {
      cycles: Array.from(cyclesSet).sort((a, b) => a - b),
      offices: {
        houseCandidates: houseCands,
        senateCandidates: senateCands,
        presidentialCandidates: presCands,
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
