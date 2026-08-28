import type {
  ChamberStructure,
  ChamberType,
  JurisdictionClassification,
  LegislativeActionSourceRecord,
  LegislativeJurisdictionSourceRecord,
  LegislativeMeasureSourceRecord,
  LegislativeSessionSourceRecord,
  LegislativeSponsorSourceRecord,
  LegislativeTextVersionSourceRecord,
  LegislativeVoteSourceRecord,
  MeasureClassification,
  RollCallEntry,
  SessionClassification,
  SponsorshipType,
} from "../types.js";
import {
  buildActionId,
  buildMeasureId,
  buildSessionId,
  buildSponsorId,
  buildTextVersionId,
  buildVoteId,
  normalizeJurisdictionKey,
} from "../ids.js";
import { buildSourceProvenance } from "../provenance.js";
import { inferLegislativeLifecycle } from "../lifecycle.js";
import type {
  LegislativeProviderAdapter,
  MeasureNormalizationResult,
  NormalizeMeasureOptions,
} from "./adapter_interface.js";

interface LegiScanSessionRaw {
  session_id?: number;
  state_id?: number;
  state_name?: string;
  state_abbr?: string;
  year_start?: number;
  year_end?: number;
  special?: number;
  session_tag?: string;
  session_title?: string;
  session_name?: string;
}

interface LegiScanHistoryRaw {
  date?: string;
  action?: string;
  chamber?: string;
  chamber_id?: number;
  importance?: number;
}

interface LegiScanSponsorRaw {
  people_id?: number;
  name?: string;
  party?: string;
  role?: string;
  sponsor_type_id?: number;
  sponsor_order?: number;
}

interface LegiScanVoteEntryRaw {
  people_id?: number;
  name?: string;
  vote_id?: number;
  vote_text?: string;
}

interface LegiScanRollCallRaw {
  roll_call_id?: number;
  date?: string;
  desc?: string;
  yea?: number;
  nay?: number;
  nv?: number;
  absent?: number;
  total?: number;
  passed?: number;
  chamber?: string;
  url?: string;
  state_link?: string;
  roll_call?: LegiScanVoteEntryRaw[];
}

interface LegiScanTextRaw {
  doc_id?: number;
  date?: string;
  type?: string;
  mime?: string;
  url?: string;
  state_link?: string;
}

interface LegiScanBillRaw {
  bill_id?: number;
  state?: string;
  state_id?: number;
  bill_number?: string;
  bill_type?: string;
  body?: string;
  current_body?: string;
  title?: string;
  description?: string;
  status?: number;
  status_date?: string;
  url?: string;
  state_link?: string;
  session?: LegiScanSessionRaw;
  session_id?: number;
  history?: LegiScanHistoryRaw[];
  sponsors?: LegiScanSponsorRaw[];
  votes?: LegiScanRollCallRaw[];
  texts?: LegiScanTextRaw[];
}

interface LegiScanJurisdictionRaw {
  state_id?: number;
  state_abbr?: string;
  state_name?: string;
  website?: string;
  sessions?: LegiScanSessionRaw[];
}

export class LegiScanAdapter implements LegislativeProviderAdapter {
  readonly providerName = "legiscan";

  normalizeJurisdiction(
    raw: unknown,
    retrievalTimestamp: string = "2026-08-28T00:00:00Z",
  ): LegislativeJurisdictionSourceRecord {
    if (!raw || typeof raw !== "object") {
      throw new Error("LegiScanAdapter: Invalid raw jurisdiction payload.");
    }
    const data = raw as LegiScanJurisdictionRaw;
    const rawName = data.state_name || data.state_abbr;
    if (!rawName) {
      throw new Error(
        "LegiScanAdapter: Jurisdiction payload missing state name or abbreviation.",
      );
    }

    const sourceKey = normalizeJurisdictionKey(
      data.state_abbr || data.state_name || "",
    );

    let classification: JurisdictionClassification = "state";
    if (sourceKey === "us_dc") {
      classification = "district";
    } else if (sourceKey === "us_pr") {
      classification = "territory";
    } else if (sourceKey === "us_fed") {
      classification = "federal";
    }

    let chamberStructure: ChamberStructure = "bicameral";
    if (sourceKey === "us_ne") {
      chamberStructure = "nonpartisan_unicameral";
    } else if (sourceKey === "us_dc") {
      chamberStructure = "council";
    }

    const officialUrl = data.website || null;
    const providerUrl = `https://legiscan.com/${data.state_abbr || sourceKey.replace("us_", "").toUpperCase()}`;

    return {
      sourceKey,
      provider: "legiscan",
      providerJurisdictionId: String(
        data.state_id || data.state_abbr || sourceKey,
      ),
      name: data.state_name || data.state_abbr || sourceKey,
      classification,
      chamberStructure,
      sourceUrl: providerUrl,
      officialWebsiteUrl: officialUrl,
      retrievalTimestamp,
      asOfDate: retrievalTimestamp.split("T")[0] || null,
      provenance: buildSourceProvenance({
        provider: "legiscan",
        providerId: String(data.state_id || sourceKey),
        officialUrl,
        providerUrl,
        retrievalTimestamp,
        confidence: "provider_standardized",
        contentForHash: data,
      }),
    };
  }

  normalizeSession(
    raw: unknown,
    jurisdictionKey: string,
    retrievalTimestamp: string = "2026-08-28T00:00:00Z",
  ): LegislativeSessionSourceRecord {
    if (!raw || typeof raw !== "object") {
      throw new Error("LegiScanAdapter: Invalid raw session payload.");
    }
    const data = raw as LegiScanSessionRaw;
    const rawTag =
      data.session_tag ||
      data.session_name ||
      (data.year_start ? `${data.year_start} Regular Session` : null);
    if (!rawTag && !data.session_id) {
      throw new Error(
        "LegiScanAdapter: Session payload missing session tag or ID.",
      );
    }

    const sessionTag = rawTag || String(data.session_id);
    const normJurKey = normalizeJurisdictionKey(jurisdictionKey);
    const sessionId = buildSessionId(normJurKey, sessionTag);

    const classification: SessionClassification =
      data.special === 1 ? "special" : "regular";
    const startDate = data.year_start ? `${data.year_start}-01-01` : null;
    const endDate = data.year_end ? `${data.year_end}-12-31` : null;
    const providerUrl = `https://legiscan.com/${normJurKey.replace("us_", "").toUpperCase()}/session/${data.session_id || sessionTag}`;

    return {
      sessionId,
      jurisdictionKey: normJurKey,
      providerSessionId: String(data.session_id || sessionTag),
      name: data.session_title || data.session_name || sessionTag,
      startDate,
      endDate,
      classification,
      sessionState: "adjourned_sine_die",
      sineDie: true,
      provenance: buildSourceProvenance({
        provider: "legiscan",
        providerId: String(data.session_id || sessionTag),
        officialUrl: null,
        providerUrl,
        retrievalTimestamp,
        confidence: "provider_standardized",
        contentForHash: data,
      }),
    };
  }

  normalizeMeasure(
    raw: unknown,
    options: NormalizeMeasureOptions = {},
  ): MeasureNormalizationResult {
    if (!raw || typeof raw !== "object") {
      throw new Error("LegiScanAdapter: Invalid raw bill payload.");
    }
    const data = raw as LegiScanBillRaw;

    if (!data.bill_number) {
      throw new Error("LegiScanAdapter: Bill payload missing 'bill_number'.");
    }

    const retrievalTimestamp =
      options.retrievalTimestamp || "2026-08-28T00:00:00Z";
    const jurisdictionKey = normalizeJurisdictionKey(
      options.jurisdictionKey || data.state || "us_unknown",
    );
    const sessionTag =
      options.sessionIdentifier ||
      data.session?.session_tag ||
      data.session?.session_name ||
      String(data.session_id || "current");
    const sessionId = buildSessionId(jurisdictionKey, sessionTag);
    const measureId = buildMeasureId(
      jurisdictionKey,
      sessionTag,
      data.bill_number,
    );

    const officialUrl = data.state_link || null;
    const providerUrl =
      data.url ||
      (data.bill_id ? `https://legiscan.com/bill/${data.bill_id}` : null);

    // Classification
    let classification: MeasureClassification = "bill";
    const rawType = (data.bill_type || "").toUpperCase();
    if (rawType === "R" || rawType === "RES") {
      classification = "resolution";
    } else if (rawType === "JR") {
      classification = "joint_resolution";
    } else if (rawType === "CR") {
      classification = "concurrent_resolution";
    } else if (rawType === "CA") {
      classification = "constitutional_amendment";
    }

    // Chamber Origin
    let chamberOrigin: ChamberType = "lower";
    const body = (data.body || "").toUpperCase();
    if (jurisdictionKey === "us_ne") {
      chamberOrigin = "unicameral";
    } else if (jurisdictionKey === "us_dc") {
      chamberOrigin = "council";
    } else if (body === "S" || body === "SEN") {
      chamberOrigin = "upper";
    } else if (body === "H" || body === "HR" || body === "ASM") {
      chamberOrigin = "lower";
    }

    // Text Versions
    const textVersions: LegislativeTextVersionSourceRecord[] = (
      data.texts || []
    ).map((t, idx) => {
      const docLabel = t.type || `Version ${idx + 1}`;
      const textVersionId = buildTextVersionId(
        measureId,
        String(t.doc_id || docLabel),
      );
      return {
        textVersionId,
        measureId,
        providerDocumentId: String(t.doc_id || idx),
        versionLabel: docLabel,
        versionDate: t.date || null,
        documentUrl: t.url || null,
        officialUrl: t.state_link || null,
        mediaType: t.mime || "application/pdf",
        contentHash: null,
        provenance: buildSourceProvenance({
          provider: "legiscan",
          providerId: String(t.doc_id || textVersionId),
          officialUrl: t.state_link || null,
          providerUrl: t.url || null,
          retrievalTimestamp,
          contentForHash: t,
        }),
      };
    });

    // Actions from history
    const actions: LegislativeActionSourceRecord[] = (data.history || []).map(
      (h, idx) => {
        const actionDate = h.date || "undated";
        const actionId = buildActionId(measureId, idx, actionDate);
        const chamberChar = (h.chamber || "").toUpperCase();

        let actingBody: ChamberType = "other";
        if (jurisdictionKey === "us_ne") {
          actingBody = "unicameral";
        } else if (jurisdictionKey === "us_dc") {
          actingBody = "council";
        } else if (chamberChar === "S") {
          actingBody = "upper";
        } else if (chamberChar === "H") {
          actingBody = "lower";
        } else if (
          chamberChar === "E" ||
          (h.action || "").toLowerCase().includes("governor")
        ) {
          actingBody = "executive";
        }

        const desc = h.action || "";
        const classifications: string[] = [];
        const lowerDesc = desc.toLowerCase();
        if (lowerDesc.includes("introduced") || lowerDesc.includes("filed")) {
          classifications.push("introduction");
        }
        if (lowerDesc.includes("passed") || lowerDesc.includes("concurred")) {
          classifications.push("passage");
        }
        if (
          lowerDesc.includes("signed by governor") ||
          lowerDesc.includes("chaptered") ||
          lowerDesc.includes("acts chapter")
        ) {
          classifications.push("became-law", "executive-signature");
        }
        if (lowerDesc.includes("vetoed")) {
          classifications.push("executive-veto");
        }
        if (
          lowerDesc.includes("failed") ||
          lowerDesc.includes("defeated") ||
          lowerDesc.includes("tabled")
        ) {
          classifications.push("failure");
        }

        return {
          actionId,
          measureId,
          actionDate,
          actingBody,
          actingBodyName:
            chamberChar === "S"
              ? "Senate"
              : chamberChar === "H"
                ? "House"
                : null,
          providerClassifications: classifications,
          rawDescription: desc,
          sourceUrl: providerUrl,
          officialUrl,
          sequenceIndex: idx,
          provenance: buildSourceProvenance({
            provider: "legiscan",
            providerId: `${data.bill_id || measureId}_h_${idx}`,
            officialUrl,
            providerUrl,
            retrievalTimestamp,
            contentForHash: h,
          }),
        };
      },
    );

    // Votes
    const votes: LegislativeVoteSourceRecord[] = (data.votes || []).map(
      (v, idx) => {
        const voteDate = v.date || "undated";
        const chamberChar = (v.chamber || "").toUpperCase();

        let chamber: ChamberType = "other";
        if (jurisdictionKey === "us_ne") {
          chamber = "unicameral";
        } else if (jurisdictionKey === "us_dc") {
          chamber = "council";
        } else if (chamberChar === "S") {
          chamber = "upper";
        } else if (chamberChar === "H") {
          chamber = "lower";
        }

        const voteId = buildVoteId(measureId, chamber, voteDate, idx);
        const passed = v.passed === 1;
        const yeas = v.yea ?? 0;
        const nays = v.nay ?? 0;
        const otherCounts: Record<string, number> = {
          nv: v.nv ?? 0,
          absent: v.absent ?? 0,
        };

        const rollCall: RollCallEntry[] = (v.roll_call || []).map((rc) => {
          const text = (rc.vote_text || "").toLowerCase();
          let option: RollCallEntry["option"] = "other";
          if (text === "yea" || text === "yes" || rc.vote_id === 1)
            option = "yes";
          else if (text === "nay" || text === "no" || rc.vote_id === 2)
            option = "no";
          else if (text === "not voting" || rc.vote_id === 3) option = "nv";
          else if (text === "absent" || rc.vote_id === 4) option = "absent";

          return {
            personId: rc.people_id ? String(rc.people_id) : null,
            personName: rc.name || "Unknown Legislator",
            option,
            rawOption: rc.vote_text,
          };
        });

        return {
          voteId,
          measureId,
          chamber,
          motion: v.desc || "Roll Call",
          date: voteDate,
          passed,
          yeas,
          nays,
          otherCounts,
          rollCall,
          providerClassification: passed ? "passed" : "failed",
          officialUrl: v.state_link || null,
          sourceUrl: v.url || providerUrl,
          provenance: buildSourceProvenance({
            provider: "legiscan",
            providerId: String(v.roll_call_id || voteId),
            officialUrl: v.state_link || null,
            providerUrl: v.url || providerUrl,
            retrievalTimestamp,
            contentForHash: v,
          }),
        };
      },
    );

    // Sponsors
    const sponsors: LegislativeSponsorSourceRecord[] = (
      data.sponsors || []
    ).map((s, idx) => {
      const sponsorId = buildSponsorId(
        measureId,
        s.name || `sp_${s.people_id || idx}`,
        idx,
      );
      const isPrimary =
        s.sponsor_type_id === 1 || (s.sponsor_order ?? idx) === 1;
      const sponsorshipType: SponsorshipType = isPrimary
        ? "primary"
        : "cosponsor";

      return {
        sponsorId,
        measureId,
        personProviderId: s.people_id ? String(s.people_id) : null,
        personName: s.name || "Unknown Sponsor",
        sponsorshipType,
        isPrimary,
        provenance: buildSourceProvenance({
          provider: "legiscan",
          providerId: String(s.people_id || sponsorId),
          officialUrl: null,
          providerUrl,
          retrievalTimestamp,
          contentForHash: s,
        }),
      };
    });

    // Derive lifecycle
    const chamberStructure =
      options.chamberStructure ||
      (jurisdictionKey === "us_ne"
        ? "nonpartisan_unicameral"
        : jurisdictionKey === "us_dc"
          ? "council"
          : "bicameral");
    const derivedLifecycle = inferLegislativeLifecycle({
      actions,
      votes,
      sessionState: options.sessionState || "unknown",
      chamberStructure,
    });

    const measure: LegislativeMeasureSourceRecord = {
      measureId,
      jurisdictionKey,
      sessionId,
      providerMeasureId: String(data.bill_id || measureId),
      identifier: data.bill_number,
      title: data.title || data.bill_number,
      classification,
      chamberOrigin,
      officialUrl,
      providerUrl,
      rawProviderStatus:
        data.status !== undefined ? `status_${data.status}` : null,
      derivedLifecycle,
      subjects: [],
      summary: data.description || null,
      retrievalTimestamp,
      provenance: buildSourceProvenance({
        provider: "legiscan",
        providerId: String(data.bill_id || measureId),
        officialUrl,
        providerUrl,
        retrievalTimestamp,
        confidence: "provider_standardized",
        contentForHash: {
          bill_id: data.bill_id,
          bill_number: data.bill_number,
          title: data.title,
          status: data.status,
        },
      }),
    };

    return {
      measure,
      textVersions,
      actions,
      votes,
      sponsors,
    };
  }
}
