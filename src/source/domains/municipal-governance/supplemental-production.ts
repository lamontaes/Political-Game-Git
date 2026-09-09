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
export const SUPPLEMENTAL_PRODUCTION_PACKS = [
  annotate(pack) as MunicipalPackInput,
];
