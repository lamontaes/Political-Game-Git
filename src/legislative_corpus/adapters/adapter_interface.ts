import type {
  ChamberStructure,
  LegislativeActionSourceRecord,
  LegislativeJurisdictionSourceRecord,
  LegislativeMeasureSourceRecord,
  LegislativeSessionSourceRecord,
  LegislativeSponsorSourceRecord,
  LegislativeTextVersionSourceRecord,
  LegislativeVoteSourceRecord,
  SessionState
} from "../types.js";

export interface MeasureNormalizationResult {
  measure: LegislativeMeasureSourceRecord;
  textVersions: LegislativeTextVersionSourceRecord[];
  actions: LegislativeActionSourceRecord[];
  votes: LegislativeVoteSourceRecord[];
  sponsors: LegislativeSponsorSourceRecord[];
}

export interface NormalizeMeasureOptions {
  jurisdictionKey?: string;
  sessionIdentifier?: string;
  sessionState?: SessionState;
  chamberStructure?: ChamberStructure;
  retrievalTimestamp?: string;
}

export interface LegislativeProviderAdapter {
  readonly providerName: string;

  normalizeJurisdiction(
    raw: unknown,
    retrievalTimestamp?: string
  ): LegislativeJurisdictionSourceRecord;

  normalizeSession(
    raw: unknown,
    jurisdictionKey: string,
    retrievalTimestamp?: string
  ): LegislativeSessionSourceRecord;

  normalizeMeasure(
    raw: unknown,
    options?: NormalizeMeasureOptions
  ): MeasureNormalizationResult;
}
