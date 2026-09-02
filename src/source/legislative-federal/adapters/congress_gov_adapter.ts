/**
 * Federal Legislative Source Corpus - Congress.gov API Adapter
 *
 * Normalizes Congress.gov v3 API payloads into federal source corpus models.
 * Strictly preserves provider data fidelity and maintains provider separation.
 */

import {
  formatFederalAmendmentId,
  formatFederalHouseVoteId,
  formatFederalMeasureId,
  sha256Hex,
} from "../provenance.js";
import type {
  FederalActionRecord,
  FederalAmendmentRecord,
  FederalAmendmentType,
  FederalChamber,
  FederalCommitteeRecord,
  FederalHouseVoteMemberTally,
  FederalHouseVoteRecord,
  FederalMeasureRecord,
  FederalMeasureType,
  FederalRecordedVoteRef,
  FederalSponsorRecord,
  FederalTextFormat,
  FederalTextVersionRecord,
  FederalVoteCast,
} from "../types.js";
import { inferFederalLifecycle } from "../lifecycle.js";
import { createFederalProvenanceMetadata } from "../provenance.js";

export interface CongressGovBillPayload {
  congress: number;
  type: string;
  number: number | string;
  title: string;
  originChamber?: string;
  introducedDate?: string;
  policyArea?: { name: string } | string | null;
  legislativeSubjects?: Array<{ name: string } | string>;
  sponsors?: Array<{
    bioguideId?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    party?: string;
    state?: string;
    district?: number | string;
    isByRequest?: string;
  }>;
  cosponsors?: Array<{
    bioguideId?: string;
    fullName?: string;
    party?: string;
    state?: string;
    district?: number | string;
    sponsorshipDate?: string;
    sponsorshipWithdrawnDate?: string;
  }>;
  committees?: {
    count?: number;
    url?: string;
    items?: Array<{
      systemCode: string;
      chamber: string;
      name: string;
      subcommittees?: Array<{ systemCode: string; name: string }>;
      activities?: Array<{ name: string; date: string }>;
    }>;
  };
  actions?: {
    count?: number;
    url?: string;
    items?: Array<{
      actionDate: string;
      text: string;
      type?: string;
      actionCode?: string;
      sourceSystem?: { code: number | string; name: string };
      recordedVotes?: Array<{
        chamber: string;
        congress: number;
        rollNumber: number;
        sessionNumber?: number;
        url?: string;
      }>;
    }>;
  };
  amendments?: {
    count?: number;
    url?: string;
    items?: Array<{
      amendmentNumber: number | string;
      type: string;
      congress: number;
      chamber?: string;
      description?: string;
      purpose?: string;
      offeredDate?: string;
      status?: string;
      sponsor?: {
        bioguideId?: string;
        fullName?: string;
        party?: string;
        state?: string;
      };
      url?: string;
    }>;
  };
  textVersions?: {
    count?: number;
    url?: string;
    items?: Array<{
      type: string;
      date: string;
      formats?: Array<{
        type: string;
        url: string;
      }>;
    }>;
  };
  laws?: Array<{
    number: string;
    type: string;
  }>;
  url?: string;
}

export interface CongressGovHouseVotePayload {
  congress: number;
  sessionNumber: number;
  rollNumber: number;
  voteDate: string;
  voteQuestion: string;
  voteResult: string;
  voteType: string;
  totalYea: number;
  totalNay: number;
  totalPresent: number;
  totalNotVoting: number;
  partyTotals?: Record<
    string,
    { yea: number; nay: number; present: number; notVoting: number }
  >;
  members?: Array<{
    bioguideId: string;
    name: string;
    state: string;
    party: string;
    vote: string;
  }>;
  bill?: {
    congress: number;
    type: string;
    number: number | string;
  };
  sourceUrl?: string;
}

/**
 * Normalizes chamber name strings into FederalChamber.
 */
export function normalizeFederalChamber(
  rawChamber?: string | null,
): FederalChamber {
  if (!rawChamber) return "house";
  const c = rawChamber.toLowerCase().trim();
  if (c.includes("senate")) return "senate";
  if (c.includes("president") || c.includes("executive")) return "president";
  if (c.includes("joint")) return "joint";
  return "house";
}

/**
 * Normalizes measure type to standard FederalMeasureType.
 */
export function normalizeFederalMeasureType(
  rawType: string,
): FederalMeasureType {
  const t = rawType.toLowerCase().replace(/[^a-z]/g, "");
  if (t === "hr" || t === "housebill") return "hr";
  if (t === "s" || t === "senatebill") return "s";
  if (t === "hjres" || t === "housejointresolution") return "hjres";
  if (t === "sjres" || t === "senatejointresolution") return "sjres";
  if (t === "hconres" || t === "houseconcurrentresolution") return "hconres";
  if (t === "sconres" || t === "senateconcurrentresolution") return "sconres";
  if (t === "hres" || t === "houseresolution") return "hres";
  if (t === "sres" || t === "senateresolution") return "sres";
  return "hr";
}

/**
 * Formats a user-friendly measure display number (e.g. "H.R. 5376", "S.J.Res. 30").
 */
export function formatFederalDisplayNumber(
  type: FederalMeasureType,
  number: number,
): string {
  switch (type) {
    case "hr":
      return `H.R. ${number}`;
    case "s":
      return `S. ${number}`;
    case "hjres":
      return `H.J.Res. ${number}`;
    case "sjres":
      return `S.J.Res. ${number}`;
    case "hconres":
      return `H.Con.Res. ${number}`;
    case "sconres":
      return `S.Con.Res. ${number}`;
    case "hres":
      return `H.Res. ${number}`;
    case "sres":
      return `S.Res. ${number}`;
  }
}

/**
 * Parses and maps Congress.gov bill payloads into normalized FederalMeasureRecord.
 */
export function parseCongressGovBillPayload(
  payload: CongressGovBillPayload,
  options?: { congressSineDie?: boolean; govinfoPackageId?: string | null },
): FederalMeasureRecord {
  const congress = Number(payload.congress);
  const measureType = normalizeFederalMeasureType(payload.type);
  const measureNumber = Number(payload.number);
  const measureId = formatFederalMeasureId(
    congress,
    measureType,
    measureNumber,
  );
  const displayNumber = formatFederalDisplayNumber(measureType, measureNumber);

  // 1. Sponsors and Cosponsors
  const sponsors: FederalSponsorRecord[] = [];
  if (payload.sponsors) {
    for (const sp of payload.sponsors) {
      if (!sp.bioguideId && !sp.fullName) continue;
      sponsors.push({
        bioguideId: sp.bioguideId || "unknown",
        fullName:
          sp.fullName ||
          `${sp.firstName || ""} ${sp.lastName || ""}`.trim() ||
          "Unknown Sponsor",
        chamber: measureType.startsWith("s") ? "senate" : "house",
        party: sp.party || null,
        state: sp.state || "US",
        district: sp.district !== undefined ? Number(sp.district) : null,
        isPrimary: true,
      });
    }
  }

  if (payload.cosponsors) {
    for (const cosponsor of payload.cosponsors) {
      if (!cosponsor.bioguideId && !cosponsor.fullName) continue;
      sponsors.push({
        bioguideId: cosponsor.bioguideId || "unknown",
        fullName: cosponsor.fullName || "Unknown Cosponsor",
        chamber: measureType.startsWith("s") ? "senate" : "house",
        party: cosponsor.party || null,
        state: cosponsor.state || "US",
        district:
          cosponsor.district !== undefined ? Number(cosponsor.district) : null,
        isPrimary: false,
        dateCosponsored: cosponsor.sponsorshipDate || null,
        dateWithdrawn: cosponsor.sponsorshipWithdrawnDate || null,
      });
    }
  }

  // 2. Committees
  const committees: FederalCommitteeRecord[] = [];
  if (payload.committees?.items) {
    for (const c of payload.committees.items) {
      committees.push({
        systemCode: c.systemCode,
        chamber: normalizeFederalChamber(c.chamber),
        name: c.name,
        subcommittees: c.subcommittees || [],
        activityTypes: c.activities?.map((a) => a.name) || [],
        referralDate:
          c.activities?.find((a) => a.name.toLowerCase().includes("referred"))
            ?.date || null,
        reportedDate:
          c.activities?.find((a) => a.name.toLowerCase().includes("reported"))
            ?.date || null,
      });
    }
  }

  // 3. Actions (strictly ordered and indexed)
  const actions: FederalActionRecord[] = [];
  if (payload.actions?.items) {
    // Sort raw actions chronologically by date first
    const sortedRawActions = [...payload.actions.items].sort((a, b) =>
      a.actionDate.localeCompare(b.actionDate),
    );

    sortedRawActions.forEach((item, index) => {
      let actingChamber: FederalChamber = measureType.startsWith("s")
        ? "senate"
        : "house";
      const textLower = item.text.toLowerCase();
      if (
        textLower.includes("in senate") ||
        textLower.includes("senate") ||
        item.actionCode?.startsWith("S")
      ) {
        actingChamber = "senate";
      }
      if (
        textLower.includes("in house") ||
        textLower.includes("house") ||
        item.actionCode?.startsWith("H")
      ) {
        actingChamber = "house";
      }
      if (
        textLower.includes("president") ||
        item.actionCode?.startsWith("E") ||
        textLower.includes("signed by")
      ) {
        actingChamber = "president";
      }

      let recordedVoteRef: FederalRecordedVoteRef | null = null;
      if (item.recordedVotes && item.recordedVotes.length > 0) {
        const firstVote = item.recordedVotes[0];
        if (firstVote) {
          recordedVoteRef = {
            congress: firstVote.congress || congress,
            chamber: normalizeFederalChamber(firstVote.chamber),
            rollNumber: Number(firstVote.rollNumber),
            url: firstVote.url || null,
          };
        }
      }

      actions.push({
        actionId: `${measureId}_act_${index + 1}`,
        sequence: index + 1,
        actionDate: item.actionDate,
        actingChamber,
        actionCode: item.actionCode || null,
        actionType: item.type || null,
        rawDescription: item.text,
        recordedVoteRef,
        sourceUrl: payload.url || null,
      });
    });
  }

  // 4. Amendments (strictly deduplicated by amendmentId)
  const amendmentsMap = new Map<string, FederalAmendmentRecord>();
  if (payload.amendments?.items) {
    for (const amd of payload.amendments.items) {
      const amdType: FederalAmendmentType = amd.type.toLowerCase().includes("s")
        ? "samdt"
        : "hamdt";
      const amdNum = Number(amd.amendmentNumber);
      const amdId = formatFederalAmendmentId(
        amd.congress || congress,
        amdType,
        amdNum,
      );

      if (amendmentsMap.has(amdId)) {
        continue; // deduplication invariant
      }

      const statusLower = (amd.status || "").toLowerCase();
      const isAgreedTo =
        statusLower.includes("agreed to") || statusLower.includes("passed");
      const isFailed =
        statusLower.includes("failed") || statusLower.includes("rejected");
      const isWithdrawn = statusLower.includes("withdrawn");

      amendmentsMap.set(amdId, {
        amendmentId: amdId,
        amendmentType: amdType,
        amendmentNumber: amdNum,
        congress: amd.congress || congress,
        parentMeasureId: measureId,
        chamber: amdType === "samdt" ? "senate" : "house",
        description: amd.description || null,
        purpose: amd.purpose || null,
        sponsorBioguideId: amd.sponsor?.bioguideId || null,
        sponsorName: amd.sponsor?.fullName || null,
        sponsorParty: amd.sponsor?.party || null,
        sponsorState: amd.sponsor?.state || null,
        offeredDate: amd.offeredDate || payload.introducedDate || "2021-01-01",
        rawStatus: amd.status || "offered",
        isAgreedTo,
        isFailed,
        isWithdrawn,
        sourceUrl: amd.url || null,
      });
    }
  }
  const amendments = Array.from(amendmentsMap.values()).sort(
    (a, b) => a.amendmentNumber - b.amendmentNumber,
  );

  // 5. Text Versions (deduplicated by versionCode and date)
  const textVersionsMap = new Map<string, FederalTextVersionRecord>();
  if (payload.textVersions?.items) {
    for (const tv of payload.textVersions.items) {
      const versionCode = tv.type.toLowerCase().trim();
      const key = `${versionCode}_${tv.date}`;

      if (textVersionsMap.has(key)) {
        continue; // deduplication invariant
      }

      const formats: FederalTextFormat[] = [];
      if (tv.formats) {
        for (const fmt of tv.formats) {
          const fmtType = fmt.type.toLowerCase();
          let recognizedType: FederalTextFormat["formatType"] =
            "formatted_text";
          if (fmtType.includes("xml")) recognizedType = "xml";
          else if (fmtType.includes("pdf")) recognizedType = "pdf";
          else if (fmtType.includes("html")) recognizedType = "html";
          else if (fmtType.includes("txt") || fmtType.includes("text"))
            recognizedType = "txt";

          formats.push({
            formatType: recognizedType,
            url: fmt.url,
            sha256: sha256Hex(fmt.url),
          });
        }
      }

      const versionNameMap: Record<string, string> = {
        ih: "Introduced in House",
        is: "Introduced in Senate",
        rh: "Reported in House",
        rs: "Reported in Senate",
        eh: "Engrossed in House",
        es: "Engrossed in Senate",
        eas: "Engrossed Amendment Senate",
        eah: "Engrossed Amendment House",
        enr: "Enrolled Bill",
        pl: "Public Law",
      };

      textVersionsMap.set(key, {
        versionCode,
        versionName: versionNameMap[versionCode] || tv.type,
        date: tv.date,
        govinfoPackageId: options?.govinfoPackageId || null,
        formats,
        contentSha256: formats.length > 0 ? (formats[0]?.sha256 ?? null) : null,
      });
    }
  }
  const textVersions = Array.from(textVersionsMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // 6. Public Law Identifier extraction
  let publicLawNumber: string | null = null;
  if (payload.laws && payload.laws.length > 0) {
    const pl = payload.laws.find(
      (l) =>
        l.type.toLowerCase().includes("public") ||
        l.type.toLowerCase().includes("pl"),
    );
    if (pl) {
      publicLawNumber = `Public Law ${pl.number}`;
    }
  }
  if (!publicLawNumber) {
    for (const act of actions) {
      const m = act.rawDescription.match(/Public Law No:\s*([0-9]+-[0-9]+)/i);
      if (m) {
        publicLawNumber = `Public Law ${m[1]}`;
        break;
      }
    }
  }

  // 7. Policy Area and Subjects
  let policyArea: string | null = null;
  if (typeof payload.policyArea === "string") {
    policyArea = payload.policyArea;
  } else if (payload.policyArea?.name) {
    policyArea = payload.policyArea.name;
  }

  const legislativeSubjects: string[] = [];
  if (payload.legislativeSubjects) {
    for (const sub of payload.legislativeSubjects) {
      if (typeof sub === "string") legislativeSubjects.push(sub);
      else if (sub.name) legislativeSubjects.push(sub.name);
    }
  }

  // 8. Derived Lifecycle
  const derivedLifecycle = inferFederalLifecycle({
    measureType,
    actions,
    textVersions,
    publicLawNumber,
    congressSineDie: options?.congressSineDie ?? false,
  });

  const officialCongressGovUrl =
    payload.url ||
    `https://www.congress.gov/bill/${congress}th-congress/${measureType.startsWith("h") ? "house" : "senate"}-bill/${measureNumber}`;

  const intermediateRecord = {
    measureId,
    congress,
    measureType,
    measureNumber,
    displayNumber,
    title: payload.title || "Untitled Federal Measure",
    originChamber: (measureType.startsWith("s") ? "senate" : "house") as
      "house" | "senate",
    introducedDate:
      payload.introducedDate || (actions[0]?.actionDate ?? "2021-01-01"),
    policyArea,
    legislativeSubjects,
    sponsors,
    committees,
    actions,
    amendments,
    textVersions,
    houseVotes: [],
    publicLawNumber,
    rawProviderStatus:
      actions.length > 0
        ? (actions[actions.length - 1]?.rawDescription ?? "Introduced")
        : "Introduced",
    derivedLifecycle,
    officialCongressGovUrl,
    govinfoPackageId: options?.govinfoPackageId || null,
  };

  const provenance = createFederalProvenanceMetadata(intermediateRecord);

  return {
    ...intermediateRecord,
    provenance,
  };
}

/**
 * Normalizes member vote cast string into FederalVoteCast.
 */
function normalizeVoteCast(rawVote: string): FederalVoteCast {
  const v = rawVote.trim().toLowerCase();
  if (v === "yea" || v === "aye" || v === "yes") return "Yea";
  if (v === "nay" || v === "no") return "Nay";
  if (v === "present") return "Present";
  return "Not Voting";
}

/**
 * Parses and normalizes Congress.gov House roll-call vote payload into FederalHouseVoteRecord.
 */
export function parseCongressGovHouseVotePayload(
  payload: CongressGovHouseVotePayload,
): FederalHouseVoteRecord {
  const voteId = formatFederalHouseVoteId(payload.congress, payload.rollNumber);

  const memberVotes: FederalHouseVoteMemberTally[] = [];
  if (payload.members) {
    for (const m of payload.members) {
      memberVotes.push({
        bioguideId: m.bioguideId,
        name: m.name,
        state: m.state,
        party: m.party,
        voteCast: normalizeVoteCast(m.vote),
      });
    }
  }

  let relatedMeasureId: string | null = null;
  if (payload.bill) {
    relatedMeasureId = formatFederalMeasureId(
      payload.bill.congress,
      normalizeFederalMeasureType(payload.bill.type),
      Number(payload.bill.number),
    );
  }

  return {
    voteId,
    congress: payload.congress,
    session: payload.sessionNumber || 1,
    rollNumber: payload.rollNumber,
    chamber: "house",
    voteDate: payload.voteDate,
    question: payload.voteQuestion,
    result: payload.voteResult,
    voteType: payload.voteType || "YEA-AND-NAY",
    totals: {
      yea: payload.totalYea,
      nay: payload.totalNay,
      present: payload.totalPresent,
      notVoting: payload.totalNotVoting,
    },
    partyTotals: payload.partyTotals,
    memberVotes,
    officialSourceUrl:
      payload.sourceUrl ||
      `https://clerk.house.gov/Votes/${payload.congress}${payload.rollNumber}`,
    relatedMeasureId,
  };
}
