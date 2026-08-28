import type {
  LegislativeActionSourceRecord,
  LegislativeJurisdictionSourceRecord,
  LegislativeMeasureSourceRecord,
  LegislativeSessionSourceRecord,
  LegislativeSponsorSourceRecord,
  LegislativeTextVersionSourceRecord,
  LegislativeVoteSourceRecord,
  NormalizedCorpusPackage
} from "./types.js";
import { OpenStatesAdapter } from "./adapters/openstates_adapter.js";
import { LegiScanAdapter } from "./adapters/legiscan_adapter.js";
import { buildNationalCoverageManifest, type ManifestSampleCounts } from "./manifest_builder.js";
import { COMPILER_SCHEMA_VERSION, computeSha256 } from "./provenance.js";
import type { NormalizeMeasureOptions } from "./adapters/adapter_interface.js";

export interface IngestItemInput {
  provider: "openstates" | "legiscan";
  type: "jurisdiction" | "session" | "measure";
  raw: unknown;
  options?: NormalizeMeasureOptions & {
    jurisdictionKey?: string;
  };
}

export class LegislativeCorpusCompiler {
  private openStatesAdapter = new OpenStatesAdapter();
  private legiscanAdapter = new LegiScanAdapter();

  private jurisdictions = new Map<string, LegislativeJurisdictionSourceRecord>();
  private sessions = new Map<string, LegislativeSessionSourceRecord>();
  private measures = new Map<string, LegislativeMeasureSourceRecord>();
  private textVersions = new Map<string, LegislativeTextVersionSourceRecord>();
  private actions = new Map<string, LegislativeActionSourceRecord>();
  private votes = new Map<string, LegislativeVoteSourceRecord>();
  private sponsors = new Map<string, LegislativeSponsorSourceRecord>();

  ingest(item: IngestItemInput, timestamp: string = "2026-08-28T00:00:00Z"): void {
    const adapter = item.provider === "openstates" ? this.openStatesAdapter : this.legiscanAdapter;

    if (item.type === "jurisdiction") {
      const rec = adapter.normalizeJurisdiction(item.raw, timestamp);
      this.jurisdictions.set(rec.sourceKey, rec);
    } else if (item.type === "session") {
      const jurKey = item.options?.jurisdictionKey || "us_unknown";
      const rec = adapter.normalizeSession(item.raw, jurKey, timestamp);
      this.sessions.set(rec.sessionId, rec);
    } else if (item.type === "measure") {
      const res = adapter.normalizeMeasure(item.raw, {
        ...item.options,
        retrievalTimestamp: timestamp
      });

      this.measures.set(res.measure.measureId, res.measure);
      for (const t of res.textVersions) {
        this.textVersions.set(t.textVersionId, t);
      }
      for (const a of res.actions) {
        this.actions.set(a.actionId, a);
      }
      for (const v of res.votes) {
        this.votes.set(v.voteId, v);
      }
      for (const s of res.sponsors) {
        this.sponsors.set(s.sponsorId, s);
      }
    }
  }

  compile(timestamp: string = "2026-08-28T00:00:00Z"): NormalizedCorpusPackage {
    // Sort all arrays deterministically by stable ID / key
    const sortedJurisdictions = Array.from(this.jurisdictions.values()).sort((a, b) =>
      a.sourceKey.localeCompare(b.sourceKey)
    );
    const sortedSessions = Array.from(this.sessions.values()).sort((a, b) =>
      a.sessionId.localeCompare(b.sessionId)
    );
    const sortedMeasures = Array.from(this.measures.values()).sort((a, b) =>
      a.measureId.localeCompare(b.measureId)
    );
    const sortedTextVersions = Array.from(this.textVersions.values()).sort((a, b) =>
      a.textVersionId.localeCompare(b.textVersionId)
    );
    const sortedActions = Array.from(this.actions.values()).sort((a, b) => {
      const mComp = a.measureId.localeCompare(b.measureId);
      if (mComp !== 0) return mComp;
      return a.sequenceIndex - b.sequenceIndex;
    });
    const sortedVotes = Array.from(this.votes.values()).sort((a, b) =>
      a.voteId.localeCompare(b.voteId)
    );
    const sortedSponsors = Array.from(this.sponsors.values()).sort((a, b) =>
      a.sponsorId.localeCompare(b.sponsorId)
    );

    // Compute sample counts per jurisdiction
    const countsByJur: Record<string, ManifestSampleCounts> = {};
    for (const m of sortedMeasures) {
      if (!countsByJur[m.jurisdictionKey]) {
        countsByJur[m.jurisdictionKey] = { measures: 0, actions: 0, votes: 0 };
      }
      const c = countsByJur[m.jurisdictionKey]!;
      c.measures = (c.measures || 0) + 1;
    }
    for (const a of sortedActions) {
      const jurKey = a.measureId.split("_").slice(0, 2).join("_");
      if (countsByJur[jurKey]) {
        countsByJur[jurKey]!.actions = (countsByJur[jurKey]!.actions || 0) + 1;
      }
    }
    for (const v of sortedVotes) {
      const jurKey = v.measureId.split("_").slice(0, 2).join("_");
      if (countsByJur[jurKey]) {
        countsByJur[jurKey]!.votes = (countsByJur[jurKey]!.votes || 0) + 1;
      }
    }

    const manifest = buildNationalCoverageManifest(countsByJur, timestamp);

    const rawPayloadToHash = {
      manifestSha: manifest.sha256,
      jurisdictionCount: sortedJurisdictions.length,
      sessionCount: sortedSessions.length,
      measureCount: sortedMeasures.length,
      textVersionCount: sortedTextVersions.length,
      actionCount: sortedActions.length,
      voteCount: sortedVotes.length,
      sponsorCount: sortedSponsors.length,
      firstMeasureId: sortedMeasures[0]?.measureId || null,
      lastMeasureId: sortedMeasures[sortedMeasures.length - 1]?.measureId || null
    };

    const checksum = computeSha256(rawPayloadToHash);

    return {
      manifest,
      jurisdictions: sortedJurisdictions,
      sessions: sortedSessions,
      measures: sortedMeasures,
      textVersions: sortedTextVersions,
      actions: sortedActions,
      votes: sortedVotes,
      sponsors: sortedSponsors,
      buildMetadata: {
        compiledAt: timestamp,
        compilerVersion: COMPILER_SCHEMA_VERSION,
        recordCounts: {
          jurisdictions: sortedJurisdictions.length,
          sessions: sortedSessions.length,
          measures: sortedMeasures.length,
          textVersions: sortedTextVersions.length,
          actions: sortedActions.length,
          votes: sortedVotes.length,
          sponsors: sortedSponsors.length
        },
        checksum
      }
    };
  }
}
