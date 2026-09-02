/**
 * Official U.S. Bureau of Labor Statistics (BLS) LAUS Corpus Sidecar Types
 */

export const LAUS_CORPUS_VERSION = "1.0.0";

export type SeasonalAdjustment = "S" | "U";

export type ObservationStatus =
  | "FINAL"
  | "PRELIMINARY"
  | "REVISED"
  | "MISSING"
  | "SUPPRESSED";

export interface RawSourceArtifact {
  artifactId: string;
  sourceUrl: string;
  relativeFilePath: string;
  sha256Hex: string;
  bytes: number;
  retrievedAt: string;
  vintage: string;
}

export interface LausAreaType {
  areaTypeCode: string;
  areaTypeText: string;
}

export interface LausMeasure {
  measureCode: string;
  measureText: string;
}

export interface LausFootnote {
  footnoteCode: string;
  footnoteText: string;
}

export interface RawLausAreaRecord {
  area_type_code: string;
  area_code: string;
  area_text: string;
  display_level: string;
  selectable: string;
  sort_sequence: string;
}

export interface RawLausSeriesRecord {
  series_id: string;
  area_type_code: string;
  area_code: string;
  measure_code: string;
  seasonal: string;
  srd_code: string;
  series_title: string;
  footnote_codes: string;
  begin_year: string;
  begin_period: string;
  end_year: string;
  end_period: string;
}

export interface RawLausDataRecord {
  series_id: string;
  year: string;
  period: string;
  value: string;
  footnote_codes: string;
}

export interface LausArea {
  areaCode: string;
  areaTypeCode: string;
  areaText: string;
  stateFips: string | null;
  countyFips: string | null;
  displayLevel: number;
  selectable: boolean;
  sortSequence: number;
}

export interface LausSeries {
  seriesId: string;
  areaTypeCode: string;
  areaCode: string;
  measureCode: string;
  seasonal: SeasonalAdjustment;
  srdCode: string;
  seriesTitle: string;
  footnoteCodes: string[];
  beginYear: number;
  beginPeriod: string;
  endYear: number;
  endPeriod: string;
}

export interface LausObservation {
  seriesId: string;
  areaCode: string;
  areaTypeCode: string;
  measureCode: string;
  seasonal: SeasonalAdjustment;
  year: number;
  period: string;
  periodName: string;
  value: number | null;
  status: ObservationStatus;
  footnoteCodes: string[];
  footnoteTexts: string[];
}

export interface LausCountsSumCheck {
  expectedLaborForce: number | null;
  difference: number | null;
  matches: boolean;
}

export interface LausReconciliation {
  areaCode: string;
  year: number;
  period: string;
  seasonal: SeasonalAdjustment;
  laborForce: number | null;
  employment: number | null;
  unemployment: number | null;
  publishedRate: number | null;
  calculatedRate: number | null;
  rateDifference: number | null;
  countsSumCheck: LausCountsSumCheck;
  isReconciled: boolean;
  discrepancyNote?: string;
}

export interface LausReconciliationSummary {
  totalPeriodsChecked: number;
  reconciledCount: number;
  discrepancyCount: number;
}

export interface LausCorpusManifest {
  corpusId: string;
  title: string;
  version: string;
  compiledAt: string;
  blsReleaseVintage: string;
  sourceArtifacts: RawSourceArtifact[];
  totalAreas: number;
  totalSeries: number;
  totalObservations: number;
  reconciliationSummary: LausReconciliationSummary;
}

export interface LausCompiledCorpus {
  manifest: LausCorpusManifest;
  areaTypes: Record<string, string>;
  measures: Record<string, string>;
  footnotes: Record<string, string>;
  areas: LausArea[];
  series: LausSeries[];
  observations: LausObservation[];
  reconciliations: LausReconciliation[];
}

export interface LausQueryFilter {
  areaCode?: string | string[];
  areaTypeCode?: string | string[];
  stateFips?: string;
  countyFips?: string;
  year?: number | number[];
  period?: string | string[];
  measureCode?: string | string[];
  seasonal?: SeasonalAdjustment;
  status?: ObservationStatus | ObservationStatus[];
}

export interface LausQueryResult {
  filter: LausQueryFilter;
  totalMatchedObservations: number;
  areas: LausArea[];
  observations: LausObservation[];
  reconciliations: LausReconciliation[];
}

export interface LausBriefingCard {
  headline: string;
  areaName: string;
  areaCode: string;
  periodLabel: string;
  unemploymentRateText: string;
  laborForceText: string;
  employmentText: string;
  unemploymentText: string;
  seasonalAdjustmentText: string;
  statusText: string;
  reconciliationNote: string;
  provenanceDisclaimer: string;
}
