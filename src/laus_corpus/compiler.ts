/**
 * Compiler for BLS LAUS Source Corpus
 */

import {
  parseAreaFile,
  parseAreaTypeFile,
  parseDataFile,
  parseFootnoteFile,
  parseMeasureFile,
  parseSeriesFile,
} from "./parser.js";
import { reconcileCorpus } from "./reconciliation.js";
import type {
  LausArea,
  LausCompiledCorpus,
  LausCorpusManifest,
  LausObservation,
  LausReconciliation,
  LausSeries,
  RawSourceArtifact,
} from "./types.js";

export interface CompileOptions {
  blsReleaseVintage?: string;
  sourceArtifacts?: RawSourceArtifact[];
}

/**
 * Compiles raw BLS LAUS flat file texts into a deterministic compiled corpus.
 */
export function compileCorpus(
  rawFiles: {
    areaType?: string;
    measure?: string;
    footnote?: string;
    area?: string;
    series?: string;
    data?: string;
  },
  options: CompileOptions = {},
): LausCompiledCorpus {
  const areaTypes = rawFiles.areaType
    ? parseAreaTypeFile(rawFiles.areaType)
    : {};
  const measures = rawFiles.measure ? parseMeasureFile(rawFiles.measure) : {};
  const footnotes = rawFiles.footnote
    ? parseFootnoteFile(rawFiles.footnote)
    : {};

  const areas = rawFiles.area ? parseAreaFile(rawFiles.area) : [];
  const series = rawFiles.series ? parseSeriesFile(rawFiles.series) : [];

  const seriesMap = new Map<string, LausSeries>();
  for (const s of series) {
    seriesMap.set(s.seriesId, s);
  }

  const observations = rawFiles.data
    ? parseDataFile(rawFiles.data, seriesMap, footnotes)
    : [];

  const { reconciliations, summary: reconciliationSummary } =
    reconcileCorpus(observations);

  // Deterministic sorting
  areas.sort((a: LausArea, b: LausArea) =>
    a.areaCode.localeCompare(b.areaCode),
  );
  series.sort((a: LausSeries, b: LausSeries) =>
    a.seriesId.localeCompare(b.seriesId),
  );
  observations.sort((a: LausObservation, b: LausObservation) => {
    if (a.seriesId !== b.seriesId) return a.seriesId.localeCompare(b.seriesId);
    if (a.year !== b.year) return a.year - b.year;
    return a.period.localeCompare(b.period);
  });
  reconciliations.sort((a: LausReconciliation, b: LausReconciliation) => {
    if (a.areaCode !== b.areaCode) return a.areaCode.localeCompare(b.areaCode);
    if (a.year !== b.year) return a.year - b.year;
    if (a.period !== b.period) return a.period.localeCompare(b.period);
    return a.seasonal.localeCompare(b.seasonal);
  });

  const manifest: LausCorpusManifest = {
    corpusId: "bls-laus-local-unemployment-v1",
    title: "Official BLS Local Area Unemployment Statistics (LAUS) Corpus",
    version: "1.0.0",
    compiledAt: new Date().toISOString(),
    blsReleaseVintage: options.blsReleaseVintage || "2026-08",
    sourceArtifacts: options.sourceArtifacts || [],
    totalAreas: areas.length,
    totalSeries: series.length,
    totalObservations: observations.length,
    reconciliationSummary,
  };

  return {
    manifest,
    areaTypes,
    measures,
    footnotes,
    areas,
    series,
    observations,
    reconciliations,
  };
}
