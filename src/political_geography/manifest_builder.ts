import { createHash } from "node:crypto";
import type {
  BoundaryChamberType,
  PoliticalGeographyCorpus,
  PoliticalGeographyManifest,
  StateCoverageSummary,
  VintageSummary,
} from "./types.js";

/**
 * Builds a deterministic manifest summarizing geographic coverage, chamber topologies,
 * and cryptographic integrity across all compiled vintages.
 */
export function generatePoliticalGeographyManifest(
  corpus: PoliticalGeographyCorpus,
): PoliticalGeographyManifest {
  const vintages: Record<string, VintageSummary> = {};

  for (const vintage of corpus.sourceVintages) {
    const vintageDistricts = corpus.districts.filter(
      (d) => d.sourceVintage === vintage,
    );

    const chamberCounts: Record<BoundaryChamberType, number> = {
      congressional: 0,
      state_senate: 0,
      state_house: 0,
      unicameral: 0,
      non_voting_delegate: 0,
      council_ward: 0,
    };

    const stateMap: Record<string, StateCoverageSummary> = {};

    for (const district of vintageDistricts) {
      chamberCounts[district.chamberType] =
        (chamberCounts[district.chamberType] || 0) + 1;

      const postal = district.state.statePostal;
      if (!stateMap[postal]) {
        stateMap[postal] = {
          statePostal: postal,
          stateFips: district.state.stateFips,
          stateName: district.state.stateName,
          chambersPresent: [],
          districtCount: 0,
        };
      }

      stateMap[postal].districtCount++;
      if (!stateMap[postal].chambersPresent.includes(district.chamberType)) {
        stateMap[postal].chambersPresent.push(district.chamberType);
        stateMap[postal].chambersPresent.sort();
      }
    }

    vintages[vintage] = {
      totalDistricts: vintageDistricts.length,
      chamberCounts,
      stateCoverage: stateMap,
    };
  }

  // Cryptographic digest of all district IDs and geometry hashes
  const hashDigestStream = corpus.districts
    .map((d) => `${d.districtId}:${d.geometryHash}`)
    .join("\n");
  const sha256Digest = createHash("sha256")
    .update(hashDigestStream, "utf8")
    .digest("hex");

  return {
    schemaVersion: "1.0.0",
    generatedAt: corpus.compiledAt,
    supportedVintages: corpus.sourceVintages,
    totalDistrictsAcrossAllVintages: corpus.totalDistricts,
    vintages,
    integritySummary: {
      totalDistricts: corpus.totalDistricts,
      validGeometries: corpus.districts.length,
      sha256Digest,
    },
  };
}
