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
  SessionState,
  SponsorshipType
} from "../types.js";
import {
  buildActionId,
  buildMeasureId,
  buildSessionId,
  buildSponsorId,
  buildTextVersionId,
  buildVoteId,
  normalizeJurisdictionKey
} from "../ids.js";
import { buildSourceProvenance } from "../provenance.js";
import { inferLegislativeLifecycle } from "../lifecycle.js";
import type {
  LegislativeProviderAdapter,
  MeasureNormalizationResult,
  NormalizeMeasureOptions
} from "./adapter_interface.js";

interface OpenStatesSourceLink {
  url?: string;
  note?: string;
}

interface OpenStatesActionRaw {
  date?: string;
  description?: string;
  classification?: string[];
  organization?: {
    name?: string;
    classification?: string;
  };
  order?: number;
  sources?: OpenStatesSourceLink[];
}

interface OpenStatesVoteRaw {
  id?: string;
  identifier?: string;
  motion_text?: string;
  start_date?: string;
  result?: string;
  organization?: {
    name?: string;
    classification?: string;
  };
  counts?: Array<{
    option?: string;
    value?: number;
  }>;
  votes?: Array<{
    option?: string;
    voter_name?: string;
    voter_id?: string;
  }>;
  sources?: OpenStatesSourceLink[];
}

interface OpenStatesVersionRaw {
  note?: string;
  date?: string;
  links?: Array<{
    url?: string;
    media_type?: string;
  }>;
}

interface OpenStatesSponsorRaw {
  name?: string;
  entity_type?: string;
  primary?: boolean;
  classification?: string;
  person_id?: string;
}

interface OpenStatesBillRaw {
  id?: string;
  identifier?: string;
  title?: string;
  jurisdiction?: {
    id?: string;
    name?: string;
    classification?: string;
  };
  session?: string;
  classification?: string[];
  subject?: string[];
  from_organization?: {
    classification?: string;
    name?: string;
  } | string;
  openstates_url?: string;
  sources?: OpenStatesSourceLink[];
  abstracts?: Array<{ abstract?: string }>;
  versions?: OpenStatesVersionRaw[];
  actions?: OpenStatesActionRaw[];
  votes?: OpenStatesVoteRaw[];
  sponsors?: OpenStatesSponsorRaw[];
}

interface OpenStatesJurisdictionRaw {
  id?: string;
  name?: string;
  classification?: string;
  url?: string;
  legislative_sessions?: Array<{
    identifier?: string;
    name?: string;
    start_date?: string;
    end_date?: string;
    classification?: string;
  }>;
  chambers?: Record<string, { name?: string; title?: string }>;
}

export class OpenStatesAdapter implements LegislativeProviderAdapter {
  readonly providerName = "openstates";

  normalizeJurisdiction(
    raw: unknown,
    retrievalTimestamp: string = "2026-08-28T00:00:00Z"
  ): LegislativeJurisdictionSourceRecord {
    if (!raw || typeof raw !== "object") {
      throw new Error("OpenStatesAdapter: Invalid raw jurisdiction payload.");
    }
    const data = raw as OpenStatesJurisdictionRaw;
    if (!data.id || !data.name) {
      throw new Error("OpenStatesAdapter: Jurisdiction payload missing required 'id' or 'name'.");
    }

    const sourceKey = normalizeJurisdictionKey(data.id || data.name);

    let classification: JurisdictionClassification = "state";
    if (data.classification === "district" || sourceKey === "us_dc") {
      classification = "district";
    } else if (data.classification === "territory" || sourceKey === "us_pr") {
      classification = "territory";
    } else if (data.classification === "country" || sourceKey === "us_fed") {
      classification = "federal";
    }

    let chamberStructure: ChamberStructure = "bicameral";
    if (sourceKey === "us_ne") {
      chamberStructure = "nonpartisan_unicameral";
    } else if (sourceKey === "us_dc") {
      chamberStructure = "council";
    } else if (data.chambers && Object.keys(data.chambers).length === 1) {
      chamberStructure = "unicameral";
    }

    const officialUrl = data.url || null;
    const providerUrl = `https://openstates.org/${sourceKey.replace("us_", "")}/`;

    return {
      sourceKey,
      provider: "openstates",
      providerJurisdictionId: data.id,
      name: data.name,
      classification,
      chamberStructure,
      sourceUrl: providerUrl,
      officialWebsiteUrl: officialUrl,
      retrievalTimestamp,
      asOfDate: retrievalTimestamp.split("T")[0] || null,
      provenance: buildSourceProvenance({
        provider: "openstates",
        providerId: data.id,
        officialUrl,
        providerUrl,
        retrievalTimestamp,
        confidence: "provider_standardized",
        contentForHash: data
      })
    };
  }

  normalizeSession(
    raw: unknown,
    jurisdictionKey: string,
    retrievalTimestamp: string = "2026-08-28T00:00:00Z"
  ): LegislativeSessionSourceRecord {
    if (!raw || typeof raw !== "object") {
      throw new Error("OpenStatesAdapter: Invalid raw session payload.");
    }
    const data = raw as {
      identifier?: string;
      name?: string;
      start_date?: string;
      end_date?: string;
      classification?: string;
      session_state?: string;
    };

    if (!data.identifier) {
      throw new Error("OpenStatesAdapter: Session payload missing required 'identifier'.");
    }

    const normJurKey = normalizeJurisdictionKey(jurisdictionKey);
    const sessionId = buildSessionId(normJurKey, data.identifier);

    let classification: SessionClassification = "regular";
    const rawClass = (data.classification || "").toLowerCase();
    if (rawClass.includes("special") || (data.identifier.toLowerCase().includes("s") && !data.identifier.toLowerCase().includes("rs"))) {
      classification = "special";
    } else if (rawClass.includes("extraordinary")) {
      classification = "extraordinary";
    } else if (rawClass.includes("organizational")) {
      classification = "organizational";
    }

    let sessionState: SessionState = "historical";
    if (data.session_state === "active") {
      sessionState = "active";
    } else if (data.session_state === "adjourned_sine_die" || data.end_date) {
      sessionState = "adjourned_sine_die";
    }

    const providerUrl = `https://openstates.org/${normJurKey.replace("us_", "")}/bills/?session=${encodeURIComponent(data.identifier)}`;

    return {
      sessionId,
      jurisdictionKey: normJurKey,
      providerSessionId: data.identifier,
      name: data.name || data.identifier,
      startDate: data.start_date || null,
      endDate: data.end_date || null,
      classification,
      sessionState,
      sineDie: sessionState === "adjourned_sine_die" || !!data.end_date,
      provenance: buildSourceProvenance({
        provider: "openstates",
        providerId: data.identifier,
        officialUrl: null,
        providerUrl,
        retrievalTimestamp,
        confidence: "provider_standardized",
        contentForHash: data
      })
    };
  }

  normalizeMeasure(
    raw: unknown,
    options: NormalizeMeasureOptions = {}
  ): MeasureNormalizationResult {
    if (!raw || typeof raw !== "object") {
      throw new Error("OpenStatesAdapter: Invalid raw bill payload.");
    }
    const data = raw as OpenStatesBillRaw;

    if (!data.identifier) {
      throw new Error("OpenStatesAdapter: Bill payload missing required 'identifier'.");
    }

    const retrievalTimestamp = options.retrievalTimestamp || "2026-08-28T00:00:00Z";
    const rawJur = options.jurisdictionKey || data.jurisdiction?.id || data.jurisdiction?.name || "us_unknown";
    const jurisdictionKey = normalizeJurisdictionKey(rawJur);
    const sessionIdentifier = options.sessionIdentifier || data.session || "current";
    const sessionId = buildSessionId(jurisdictionKey, sessionIdentifier);
    const measureId = buildMeasureId(jurisdictionKey, sessionIdentifier, data.identifier);

    // Official source link preservation
    let officialUrl: string | null = null;
    if (data.sources && Array.isArray(data.sources)) {
      const primarySource = data.sources.find((s) => s.url && !s.url.includes("openstates.org"));
      if (primarySource?.url) {
        officialUrl = primarySource.url;
      }
    }

    const providerUrl = data.openstates_url || (data.id ? `https://openstates.org/bills/${data.id}` : null);

    // Measure Classification
    let classification: MeasureClassification = "bill";
    const rawClass = (data.classification || []).map((c) => c.toLowerCase());
    if (rawClass.includes("resolution")) {
      classification = "resolution";
    } else if (rawClass.includes("joint resolution") || rawClass.includes("joint_resolution")) {
      classification = "joint_resolution";
    } else if (rawClass.includes("concurrent resolution") || rawClass.includes("concurrent_resolution")) {
      classification = "concurrent_resolution";
    } else if (rawClass.includes("constitutional amendment") || rawClass.includes("constitutional_amendment")) {
      classification = "constitutional_amendment";
    }

    // Chamber Origin
    let chamberOrigin: ChamberType = "lower";
    const rawOrg = typeof data.from_organization === "string" ? data.from_organization : data.from_organization?.classification || data.from_organization?.name || "";
    const lowerOrg = rawOrg.toLowerCase();
    if (jurisdictionKey === "us_ne") {
      chamberOrigin = "unicameral";
    } else if (jurisdictionKey === "us_dc") {
      chamberOrigin = "council";
    } else if (lowerOrg.includes("upper") || lowerOrg.includes("senate")) {
      chamberOrigin = "upper";
    } else if (lowerOrg.includes("lower") || lowerOrg.includes("house") || lowerOrg.includes("assembly")) {
      chamberOrigin = "lower";
    }

    // Text Versions
    const textVersions: LegislativeTextVersionSourceRecord[] = (data.versions || []).map((v, idx) => {
      const primaryLink = (v.links || [])[0];
      const docUrl = primaryLink?.url || null;
      const mediaType = primaryLink?.media_type || "application/pdf";
      const label = v.note || `Version ${idx + 1}`;
      const textVersionId = buildTextVersionId(measureId, label);

      return {
        textVersionId,
        measureId,
        providerDocumentId: `${measureId}_ver_${idx}`,
        versionLabel: label,
        versionDate: v.date || null,
        documentUrl: docUrl,
        officialUrl: docUrl && !docUrl.includes("openstates.org") ? docUrl : null,
        mediaType,
        contentHash: null,
        provenance: buildSourceProvenance({
          provider: "openstates",
          providerId: `${data.id || measureId}_ver_${idx}`,
          officialUrl: docUrl,
          providerUrl,
          retrievalTimestamp,
          contentForHash: v
        })
      };
    });

    // Actions
    const actions: LegislativeActionSourceRecord[] = (data.actions || []).map((act, idx) => {
      const actionDate = act.date || "undated";
      const actionId = buildActionId(measureId, act.order ?? idx, actionDate);
      const orgClass = act.organization?.classification?.toLowerCase() || "";
      const orgName = act.organization?.name || null;

      let actingBody: ChamberType = "other";
      if (jurisdictionKey === "us_ne") {
        actingBody = "unicameral";
      } else if (jurisdictionKey === "us_dc") {
        actingBody = "council";
      } else if (orgClass.includes("upper") || (orgName && orgName.toLowerCase().includes("senate"))) {
        actingBody = "upper";
      } else if (orgClass.includes("lower") || (orgName && (orgName.toLowerCase().includes("house") || orgName.toLowerCase().includes("assembly")))) {
        actingBody = "lower";
      } else if (orgClass.includes("executive") || (orgName && orgName.toLowerCase().includes("governor"))) {
        actingBody = "executive";
      }

      let actOfficialUrl: string | null = null;
      if (act.sources && act.sources[0]?.url && !act.sources[0].url.includes("openstates.org")) {
        actOfficialUrl = act.sources[0].url;
      }

      return {
        actionId,
        measureId,
        actionDate,
        actingBody,
        actingBodyName: orgName,
        providerClassifications: act.classification || [],
        rawDescription: act.description || "",
        sourceUrl: providerUrl,
        officialUrl: actOfficialUrl,
        sequenceIndex: act.order ?? idx,
        provenance: buildSourceProvenance({
          provider: "openstates",
          providerId: `${data.id || measureId}_act_${idx}`,
          officialUrl: actOfficialUrl,
          providerUrl,
          retrievalTimestamp,
          contentForHash: act
        })
      };
    });

    // Votes
    const votes: LegislativeVoteSourceRecord[] = (data.votes || []).map((vote, idx) => {
      const voteDate = vote.start_date || "undated";
      const orgClass = vote.organization?.classification?.toLowerCase() || "";
      const orgName = vote.organization?.name || "";

      let chamber: ChamberType = "other";
      if (jurisdictionKey === "us_ne") {
        chamber = "unicameral";
      } else if (jurisdictionKey === "us_dc") {
        chamber = "council";
      } else if (orgClass.includes("upper") || orgName.toLowerCase().includes("senate")) {
        chamber = "upper";
      } else if (orgClass.includes("lower") || orgName.toLowerCase().includes("house") || orgName.toLowerCase().includes("assembly")) {
        chamber = "lower";
      }

      const voteId = buildVoteId(measureId, chamber, voteDate, idx);
      const passed = (vote.result || "").toLowerCase() === "pass";

      let yeas = 0;
      let nays = 0;
      const otherCounts: Record<string, number> = {};

      for (const count of vote.counts || []) {
        const opt = (count.option || "").toLowerCase();
        const val = count.value || 0;
        if (opt === "yes" || opt === "yea" || opt === "aye") {
          yeas = val;
        } else if (opt === "no" || opt === "nay") {
          nays = val;
        } else {
          otherCounts[opt || "other"] = val;
        }
      }

      const rollCall: RollCallEntry[] = (vote.votes || []).map((v) => {
        const opt = (v.option || "").toLowerCase();
        let standardOption: RollCallEntry["option"] = "other";
        if (opt === "yes" || opt === "yea" || opt === "aye") standardOption = "yes";
        else if (opt === "no" || opt === "nay") standardOption = "no";
        else if (opt === "absent") standardOption = "absent";
        else if (opt === "excused") standardOption = "excused";
        else if (opt === "nv" || opt === "not voting") standardOption = "nv";

        return {
          personId: v.voter_id || null,
          personName: v.voter_name || "Unknown Legislator",
          option: standardOption,
          rawOption: v.option
        };
      });

      let voteOfficialUrl: string | null = null;
      if (vote.sources && vote.sources[0]?.url && !vote.sources[0].url.includes("openstates.org")) {
        voteOfficialUrl = vote.sources[0].url;
      }

      return {
        voteId,
        measureId,
        chamber,
        motion: vote.motion_text || vote.identifier || "Roll Call Vote",
        date: voteDate,
        passed,
        yeas,
        nays,
        otherCounts,
        rollCall,
        providerClassification: vote.result || null,
        officialUrl: voteOfficialUrl,
        sourceUrl: providerUrl,
        provenance: buildSourceProvenance({
          provider: "openstates",
          providerId: vote.id || voteId,
          officialUrl: voteOfficialUrl,
          providerUrl,
          retrievalTimestamp,
          contentForHash: vote
        })
      };
    });

    // Sponsors
    const sponsors: LegislativeSponsorSourceRecord[] = (data.sponsors || []).map((sp, idx) => {
      const sponsorId = buildSponsorId(measureId, sp.name || `sponsor_${idx}`, idx);
      const isPrimary = sp.primary === true || (sp.classification || "").toLowerCase() === "primary";

      let sponsorshipType: SponsorshipType = "cosponsor";
      if (isPrimary) {
        sponsorshipType = "primary";
      } else if ((sp.classification || "").toLowerCase() === "author") {
        sponsorshipType = "author";
      } else if ((sp.classification || "").toLowerCase() === "joint") {
        sponsorshipType = "joint_sponsor";
      }

      return {
        sponsorId,
        measureId,
        personProviderId: sp.person_id || null,
        personName: sp.name || "Unknown Sponsor",
        sponsorshipType,
        isPrimary,
        provenance: buildSourceProvenance({
          provider: "openstates",
          providerId: sp.person_id || sponsorId,
          officialUrl: null,
          providerUrl,
          retrievalTimestamp,
          contentForHash: sp
        })
      };
    });

    // Derive Lifecycle
    const chamberStructure = options.chamberStructure || (jurisdictionKey === "us_ne" ? "nonpartisan_unicameral" : jurisdictionKey === "us_dc" ? "council" : "bicameral");
    const derivedLifecycle = inferLegislativeLifecycle({
      actions,
      votes,
      sessionState: options.sessionState || "unknown",
      chamberStructure
    });

    const summaryText = data.abstracts && data.abstracts[0]?.abstract ? data.abstracts[0].abstract : null;

    const measure: LegislativeMeasureSourceRecord = {
      measureId,
      jurisdictionKey,
      sessionId,
      providerMeasureId: data.id || measureId,
      identifier: data.identifier,
      title: data.title || data.identifier,
      classification,
      chamberOrigin,
      officialUrl,
      providerUrl,
      rawProviderStatus: (data.classification || []).join(",") || null,
      derivedLifecycle,
      subjects: data.subject || [],
      summary: summaryText,
      retrievalTimestamp,
      provenance: buildSourceProvenance({
        provider: "openstates",
        providerId: data.id || measureId,
        officialUrl,
        providerUrl,
        retrievalTimestamp,
        confidence: "provider_standardized",
        contentForHash: {
          id: data.id,
          identifier: data.identifier,
          title: data.title,
          session: data.session
        }
      })
    };

    return {
      measure,
      textVersions,
      actions,
      votes,
      sponsors
    };
  }
}
