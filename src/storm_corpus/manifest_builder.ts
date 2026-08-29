/**
 * Coverage Manifest Builder for NOAA Storm Events Corpus
 *
 * Generates an authoritative national and jurisdiction-level coverage manifest
 * detailing historical collection procedures, eras, and record counts.
 */

import { HISTORICAL_COVERAGE_ERAS } from "./coverage";
import type {
  JurisdictionCoverageSummary,
  StormCorpus,
  StormCoverageEra,
  StormCoverageManifest,
  StormEventFamily,
} from "./types";

export function buildCoverageManifest(
  corpus: StormCorpus,
): StormCoverageManifest {
  const jurisdictionMap = new Map<
    string,
    {
      stateFips: string;
      stateName: string;
      dates: string[];
      totalEvents: number;
      episodeIds: Set<number>;
      familyCounts: Record<StormEventFamily, number>;
      eraCounts: Record<StormCoverageEra, number>;
    }
  >();

  const allFamilies: StormEventFamily[] = [
    "tornado",
    "flood",
    "winter_storm",
    "tropical_hurricane",
    "heat_cold",
    "severe_storm",
    "wildfire",
    "drought_environment",
    "marine_coastal",
    "other",
  ];

  const allEras: StormCoverageEra[] = [
    "1950-1954_tornado_only",
    "1955-1992_severe_convective_publication_keyed",
    "1993-1995_severe_convective_unformatted_text",
    "1996-present_nws_standard_48",
  ];

  for (const event of corpus.events) {
    let summary = jurisdictionMap.get(event.stateFips);
    if (!summary) {
      const familyCounts = Object.fromEntries(
        allFamilies.map((f) => [f, 0]),
      ) as Record<StormEventFamily, number>;

      const eraCounts = Object.fromEntries(
        allEras.map((e) => [e, 0]),
      ) as Record<StormCoverageEra, number>;

      summary = {
        stateFips: event.stateFips,
        stateName: event.state,
        dates: [],
        totalEvents: 0,
        episodeIds: new Set<number>(),
        familyCounts,
        eraCounts,
      };
      jurisdictionMap.set(event.stateFips, summary);
    }

    summary.dates.push(event.beginDateTime);
    summary.totalEvents += 1;
    summary.episodeIds.add(event.episodeId);
    summary.familyCounts[event.eventFamily] =
      (summary.familyCounts[event.eventFamily] ?? 0) + 1;
    summary.eraCounts[event.coverageEra] =
      (summary.eraCounts[event.coverageEra] ?? 0) + 1;
  }

  const jurisdictions: JurisdictionCoverageSummary[] = Array.from(
    jurisdictionMap.values(),
  )
    .map((item) => {
      const sortedDates = [...item.dates].sort();
      return {
        stateFips: item.stateFips,
        stateName: item.stateName,
        earliestEventDate: sortedDates[0] ?? "",
        latestEventDate: sortedDates.at(-1) ?? "",
        totalEvents: item.totalEvents,
        totalEpisodes: item.episodeIds.size,
        eventCountByFamily: item.familyCounts,
        eventCountByEra: item.eraCounts,
      };
    })
    .sort((a, b) => a.stateFips.localeCompare(b.stateFips));

  return {
    schemaVersion: "1.0.0",
    generatedAt: corpus.generatedAt,
    vintage: corpus.vintage,
    eras: HISTORICAL_COVERAGE_ERAS,
    jurisdictions,
    totalEventsInCorpus: corpus.totalEvents,
    totalEpisodesInCorpus: corpus.totalEpisodes,
  };
}
