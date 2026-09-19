/** Verified bounded provisions from the already retrieved declared corpus.
 * Missing surrounding procedure remains UNKNOWN; no neighbouring pack is copied.
 */
import { packsForResearchCorpus } from "./national-packs";
import type { Cell, MunicipalPackInput } from "./parse";
import type { ResearchGovernment } from "./national-research";

const sourceKey = "or-portland-charter-2-102";
const excerpt =
  "The City Council of the City of Portland consists of twelve (12) Councilors. There are four (4) City Council districts. Each district is represented by three (3) Councilors. The Mayor is not a member of Council.";
const government: ResearchGovernment = {
  key: "us-or-portland",
  state: "OR",
  displayName: "Portland",
  residentName: "Portland",
  attestedAsOf: "2026-09-08",
  packetId: sourceKey,
  sources: [],
  form: null,
  body: {
    name: "City Council",
    size: 12,
    composition: {
      pattern: "OTHER",
      districtSeats: 12,
      atLargeSeats: 0,
      wardSeats: 0,
      note: "Four districts, three Councilors per district. The Mayor is not a Council member.",
    },
    presidingOffice: null,
    executiveSelection: null,
    sourceKey,
  },
  separation: null,
  mayor: null,
  manager: null,
  partisanship: null,
  terms: [],
  powers: [],
  consolidation: null,
  meetingPlaces: [],
  meetingSeries: [],
  placeCrosswalk: null,
  unresolved: [
    "Only Charter § 2-102 is compiled in this reading; it does not establish ordinance, budget, appointment, or meeting procedure.",
  ],
};
const pack = packsForResearchCorpus({
  packets: [sourceKey],
  attestedAsOf: "2026-09-08",
  readOn: "2026-09-09",
  evidenceClass: "secondary-synthesis",
  governments: [government],
}).packs[0]!;
function annotate(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(annotate);
  if (!node || typeof node !== "object") return node;
  if ("status" in node) {
    const cell = node as Cell;
    return cell.status === "KNOWN"
      ? { ...cell, excerpt, legalLocator: "Portland City Charter § 2-102" }
      : {
          ...cell,
          reason: "Not established by the retrieved Charter § 2-102.",
        };
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, annotate(value)]),
  );
}
const annotated = annotate(pack) as MunicipalPackInput;
const articleSourceKey = "or-portland-charter-2-1";
const quorumExcerpt =
  "At any meeting of the Council seven (7) Councilors constitute a quorum, but a lesser number may adjourn or recess from time to time, and may compel the attendance of absent members.";
const meetingsExcerpt =
  "All regular and special meetings of the Council shall be public. The Council meets the first week of January following each general election and thereafter meets at the time and place fixed by ordinance. The Council shall keep a journal of its proceedings which shall be a public record.";
function articleFact(value: unknown, section: string, excerpt: string): Cell {
  return {
    status: "KNOWN",
    value,
    sourceKey: articleSourceKey,
    legalLocator: `Portland City Charter § ${section}`,
    excerpt,
    effectiveDate: "2026-09-19",
  };
}
const portland: MunicipalPackInput = {
  ...annotated,
  asOf: "2026-09-19",
  legislativeProcedure: {
    ...annotated.legislativeProcedure,
    quorum: articleFact(
      "Seven Councilors constitute a quorum at any Council meeting.",
      "2-114",
      quorumExcerpt,
    ),
    quorumRule: articleFact(
      {
        numerator: 7,
        denominator: 12,
        denominatorBasis: "FIXED_COUNT",
        fixedVotesRequired: 7,
      },
      "2-114",
      quorumExcerpt,
    ),
  },
  meetingSeries: (["REGULAR_MEETING", "SPECIAL_MEETING"] as const).map(
    (kind) => ({
      seriesKey: `us-or-portland-${kind.toLowerCase()}`,
      kind,
      bodyName: annotated.electedStructure.bodyName,
      cadence: {
        status: "UNKNOWN",
        reason:
          "The charter leaves meeting times to ordinance; no current schedule has been acquired.",
      },
      venue: {
        status: "UNKNOWN",
        reason:
          "The charter leaves meeting places to ordinance; no current venue has been acquired.",
      },
      publicAttendance: articleFact(
        {
          openToPublic: true,
          publicCommentOffered: "UNKNOWN",
          note: "Regular and special Council meetings are public; this provision does not establish a public-comment rule.",
        },
        "2-112",
        meetingsExcerpt,
      ),
    }),
  ),
  unresolved: [
    "Charter §§ 2-102, 2-112 and 2-114 establish composition, public meetings and quorum. Meeting schedules and venues, ordinance passage, budget and appointment procedure remain uncompiled.",
  ],
};
export const SUPPLEMENTAL_PRODUCTION_PACKS = [portland];
