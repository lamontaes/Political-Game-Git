/**
 * Federal Legislative Source Corpus - Manifest Builder
 *
 * Generates structured federal coverage manifests summarizing dataset statistics,
 * Congresses, enacted laws, vetoes, resolutions, amendments, and text versions.
 */

import type {
  FederalCorpusBundle,
  FederalCoverageManifest,
  FederalCoverageManifestCongressEntry,
} from "./types.js";

export const FEDERAL_MANIFEST_VERSION = "1.0.0";

/**
 * Builds a comprehensive coverage manifest from a FederalCorpusBundle.
 */
export function buildFederalCoverageManifest(
  bundle: FederalCorpusBundle,
): FederalCoverageManifest {
  const congressMap = new Map<number, FederalCoverageManifestCongressEntry>();

  for (const c of bundle.congresses) {
    congressMap.set(c.congressNumber, {
      congressNumber: c.congressNumber,
      name: c.name,
      startYear: c.startYear,
      endYear: c.endYear,
      measureCount: 0,
      enactedLawCount: 0,
      vetoCount: 0,
      vetoOverrideCount: 0,
      resolutionCount: 0,
      amendmentCount: 0,
      houseVoteCount: 0,
      textVersionCount: 0,
    });
  }

  let totalMeasures = 0;
  let totalEnactedLaws = 0;
  let totalVetoes = 0;
  let totalVetoOverrides = 0;
  let totalAmendments = 0;

  for (const m of bundle.measures) {
    totalMeasures += 1;
    totalAmendments += m.amendments.length;

    let entry = congressMap.get(m.congress);
    if (!entry) {
      entry = {
        congressNumber: m.congress,
        name: `${m.congress}th United States Congress`,
        startYear: 2000 + (m.congress - 106) * 2 - 1,
        endYear: 2000 + (m.congress - 106) * 2 + 1,
        measureCount: 0,
        enactedLawCount: 0,
        vetoCount: 0,
        vetoOverrideCount: 0,
        resolutionCount: 0,
        amendmentCount: 0,
        houseVoteCount: 0,
        textVersionCount: 0,
      };
      congressMap.set(m.congress, entry);
    }

    entry.measureCount += 1;
    entry.amendmentCount += m.amendments.length;
    entry.textVersionCount += m.textVersions.length;

    if (m.derivedLifecycle.status === "signed-became-law") {
      entry.enactedLawCount += 1;
      totalEnactedLaws += 1;
    } else if (m.derivedLifecycle.status === "veto-override") {
      entry.vetoOverrideCount += 1;
      totalVetoOverrides += 1;
    } else if (m.derivedLifecycle.status === "vetoed") {
      entry.vetoCount += 1;
      totalVetoes += 1;
    }

    if (
      m.measureType === "hres" ||
      m.measureType === "sres" ||
      m.measureType === "hconres" ||
      m.measureType === "sconres" ||
      m.measureType === "hjres" ||
      m.measureType === "sjres"
    ) {
      entry.resolutionCount += 1;
    }
  }

  for (const hv of bundle.houseVotes) {
    const entry = congressMap.get(hv.congress);
    if (entry) {
      entry.houseVoteCount += 1;
    }
  }

  const congresses = Array.from(congressMap.values()).sort(
    (a, b) => a.congressNumber - b.congressNumber,
  );

  return {
    manifestVersion: FEDERAL_MANIFEST_VERSION,
    generatedAt: bundle.generatedAt,
    primarySource: bundle.primarySource,
    secondaryDocumentSource: bundle.secondaryDocumentSource,
    totalMeasures,
    totalEnactedLaws,
    totalVetoes,
    totalVetoOverrides,
    totalHouseVotes: bundle.houseVotes.length,
    totalAmendments,
    congresses,
    corpusSha256: bundle.corpusSha256,
  };
}
