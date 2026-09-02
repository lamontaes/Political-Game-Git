/**
 * Federal Legislative Source Corpus - Compiler
 *
 * Compiles raw and fixture Congress.gov & GovInfo data payloads into a deterministic,
 * validated FederalCorpusBundle.
 */

import {
  parseCongressGovBillPayload,
  parseCongressGovHouseVotePayload,
  type CongressGovBillPayload,
  type CongressGovHouseVotePayload,
} from "./adapters/congress_gov_adapter.js";
import {
  mergeGovInfoTextVersions,
  type GovInfoPackageSummary,
} from "./adapters/govinfo_adapter.js";
import {
  createFederalProvenanceMetadata,
  hashDataStructure,
  FEDERAL_SCHEMA_VERSION,
} from "./provenance.js";
import type {
  FederalCongressRecord,
  FederalCorpusBundle,
  FederalHouseVoteRecord,
  FederalMeasureRecord,
} from "./types.js";

export interface FederalCompilerInput {
  congresses?: FederalCongressRecord[];
  billPayloads: CongressGovBillPayload[];
  govinfoSummaries?: GovInfoPackageSummary[];
  houseVotePayloads?: CongressGovHouseVotePayload[];
  generationTimestamp?: string;
}

/**
 * Standard Congress definition presets.
 */
export const STANDARD_FEDERAL_CONGRESSES: FederalCongressRecord[] = [
  {
    congressNumber: 116,
    name: "116th United States Congress",
    startYear: 2019,
    endYear: 2021,
    sessions: [
      {
        sessionNumber: 1,
        startDate: "2019-01-03",
        endDate: "2020-01-03",
        sineDie: true,
      },
      {
        sessionNumber: 2,
        startDate: "2020-01-03",
        endDate: "2021-01-03",
        sineDie: true,
      },
    ],
  },
  {
    congressNumber: 117,
    name: "117th United States Congress",
    startYear: 2021,
    endYear: 2023,
    sessions: [
      {
        sessionNumber: 1,
        startDate: "2021-01-03",
        endDate: "2022-01-03",
        sineDie: true,
      },
      {
        sessionNumber: 2,
        startDate: "2022-01-03",
        endDate: "2023-01-03",
        sineDie: true,
      },
    ],
  },
  {
    congressNumber: 118,
    name: "118th United States Congress",
    startYear: 2023,
    endYear: 2025,
    sessions: [
      {
        sessionNumber: 1,
        startDate: "2023-01-03",
        endDate: "2024-01-03",
        sineDie: true,
      },
      {
        sessionNumber: 2,
        startDate: "2024-01-03",
        endDate: "2025-01-03",
        sineDie: true,
      },
    ],
  },
];

/**
 * Compiles federal source payloads into a deterministic normalized FederalCorpusBundle.
 */
export function compileFederalLegislativeCorpus(
  input: FederalCompilerInput,
): FederalCorpusBundle {
  const generatedAt = input.generationTimestamp || "2026-08-28T00:00:00.000Z";
  const congresses = input.congresses || STANDARD_FEDERAL_CONGRESSES;

  // Map of congress number to sine die state
  const congressSineDieMap = new Map<number, boolean>();
  for (const c of congresses) {
    const isSineDie = c.sessions.every((s) => s.sineDie);
    congressSineDieMap.set(c.congressNumber, isSineDie);
  }

  // 1. Process House roll-call votes
  const houseVotes: FederalHouseVoteRecord[] = [];
  const houseVotesByMeasure = new Map<string, FederalHouseVoteRecord[]>();

  if (input.houseVotePayloads) {
    for (const vp of input.houseVotePayloads) {
      const voteRecord = parseCongressGovHouseVotePayload(vp);
      houseVotes.push(voteRecord);

      if (voteRecord.relatedMeasureId) {
        const list = houseVotesByMeasure.get(voteRecord.relatedMeasureId) || [];
        list.push(voteRecord);
        houseVotesByMeasure.set(voteRecord.relatedMeasureId, list);
      }
    }
  }

  // Sort House votes deterministically by congress, roll number
  houseVotes.sort((a, b) => {
    if (a.congress !== b.congress) return a.congress - b.congress;
    return a.rollNumber - b.rollNumber;
  });

  // Group GovInfo summaries by measure if possible
  const govinfoByMeasure = new Map<string, GovInfoPackageSummary[]>();
  if (input.govinfoSummaries) {
    for (const g of input.govinfoSummaries) {
      if (g.congress && g.billType && g.billNumber) {
        const typeNorm = g.billType.toLowerCase().replace(/[^a-z]/g, "");
        const key = `us_fed_${g.congress}_${typeNorm}_${g.billNumber}`;
        const list = govinfoByMeasure.get(key) || [];
        list.push(g);
        govinfoByMeasure.set(key, list);
      }
    }
  }

  // 2. Process Measures
  const measures: FederalMeasureRecord[] = [];
  for (const bp of input.billPayloads) {
    const congressNum = Number(bp.congress);
    const isSineDie = congressSineDieMap.get(congressNum) ?? true;

    // Parse base bill payload
    let measure = parseCongressGovBillPayload(bp, {
      congressSineDie: isSineDie,
    });

    // Merge GovInfo document summaries if available
    const matchedGovInfo = govinfoByMeasure.get(measure.measureId);
    if (matchedGovInfo && matchedGovInfo.length > 0) {
      const mergedTextVersions = mergeGovInfoTextVersions(
        measure.textVersions,
        matchedGovInfo,
      );
      measure = {
        ...measure,
        textVersions: mergedTextVersions,
        govinfoPackageId: matchedGovInfo[0]?.packageId ?? null,
      };
    }

    // Attach matched House roll calls
    const matchedVotes = houseVotesByMeasure.get(measure.measureId);
    if (matchedVotes && matchedVotes.length > 0) {
      measure = {
        ...measure,
        houseVotes: [...matchedVotes].sort(
          (a, b) => a.rollNumber - b.rollNumber,
        ),
      };
    }

    // Recompute deterministic provenance after enrichment
    const recordPayload = {
      measureId: measure.measureId,
      congress: measure.congress,
      measureType: measure.measureType,
      measureNumber: measure.measureNumber,
      displayNumber: measure.displayNumber,
      title: measure.title,
      originChamber: measure.originChamber,
      introducedDate: measure.introducedDate,
      policyArea: measure.policyArea,
      legislativeSubjects: measure.legislativeSubjects,
      sponsors: measure.sponsors,
      committees: measure.committees,
      actions: measure.actions,
      amendments: measure.amendments,
      textVersions: measure.textVersions,
      houseVotes: measure.houseVotes,
      publicLawNumber: measure.publicLawNumber,
      rawProviderStatus: measure.rawProviderStatus,
      derivedLifecycle: measure.derivedLifecycle,
      officialCongressGovUrl: measure.officialCongressGovUrl,
      govinfoPackageId: measure.govinfoPackageId,
    };
    measure.provenance = createFederalProvenanceMetadata(
      recordPayload,
      generatedAt,
    );

    measures.push(measure);
  }

  // Sort measures deterministically by congress, measureType, measureNumber
  measures.sort((a, b) => {
    if (a.congress !== b.congress) return a.congress - b.congress;
    if (a.measureType !== b.measureType)
      return a.measureType.localeCompare(b.measureType);
    return a.measureNumber - b.measureNumber;
  });

  const bundlePayloadWithoutHash = {
    schemaVersion: FEDERAL_SCHEMA_VERSION,
    generatedAt,
    primarySource: "Congress.gov API",
    secondaryDocumentSource: "GovInfo API",
    congresses,
    measures,
    houseVotes,
  };

  const corpusSha256 = hashDataStructure(bundlePayloadWithoutHash);

  return {
    ...bundlePayloadWithoutHash,
    corpusSha256,
  };
}
