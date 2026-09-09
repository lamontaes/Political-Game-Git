/** Complete attributed report coverage beside the structured declarations.
 * Research observations remain separate cells. They grant no legal capability,
 * and a heading never creates a Census place or government-unit crosswalk.
 */
import structure from "./research-structure.json";
import type { GovernmentForm, CompositionPattern } from "./types";
import inventory from "../../../../data/source/municipal-governance/research-inventory.json";
import type { ResearchGovernment } from "./national-research";

const PACKET_URLS: Readonly<Record<string, string>> = {
  "43A":
    "https://docs.google.com/document/d/1cpmq9z2Dje-CeomODu8u02pqyjiyTnyruWdtYXU6S98/edit",
  "44": "https://docs.google.com/document/d/1NLddpuRckHQvpjDVUjhVx_HItEubfmDUTAvzrPiBprk/edit",
  "45": "https://docs.google.com/document/d/1Q4oy9o0D0En8of_M3xI3iNCvePy7l0Lj2f5pPC31zt0/edit",
  "46": "https://docs.google.com/document/d/1hRILbHvy7vjqeQvJWQYDweOJKeQtc7EIsdnqRRWpwLE/edit",
  "92I":
    "https://docs.google.com/document/d/1K1cZdA-cPvp-G3lF6-Iatd6xT7hjBgOb/edit",
};
function slug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f’‘ʻ']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
// These are report-title aliases inside this research library, not geographic joins.
const ALIASES: Readonly<Record<string, string>> = {
  "us-hi-city-and-county-of-honolulu": "us-hi-honolulu",
  "us-ak-anchorage-municipality": "us-ak-anchorage",
  "us-ak-juneau-city-and-borough": "us-ak-juneau",
  "us-ak-fairbanks-city": "us-ak-fairbanks",
  "us-ak-north-pole-city": "us-ak-north-pole",
  "us-in-indianapolis-marion-county": "us-in-indianapolis-marion",
  "us-la-baton-rouge-east-baton-rouge-parish": "us-la-baton-rouge",
  "us-ky-louisville-jefferson-county-metro": "louisville-jefferson-metro",
  "us-ky-lexington-fayette-urban-county-government":
    "lexington-fayette-urban-county",
};

export function includeExistingResearch(
  base: readonly ResearchGovernment[],
): readonly ResearchGovernment[] {
  const governments = new Map(
    base.map((government) => [government.key, government]),
  );
  for (const report of inventory.reports) {
    if (report.status === "PENDING" || !report.text) continue;
    const titleKey = `us-${report.state.toLowerCase()}-${slug(report.name)}`;
    const key = ALIASES[titleKey] ?? titleKey;
    // Kentucky's deeper 92I authored packs remain their existing records; do not duplicate them here.
    if (report.state === "KY") continue;
    const sourceKey = `research-packet-${report.packet}`;
    const declaration = structure.find(
      (row) =>
        row.state === report.state &&
        row.name === report.name &&
        row.packet === report.packet,
    );
    if (declaration && !report.text.includes(declaration.anchor))
      throw new Error(
        `Research declaration no longer matches ${report.heading}: ${declaration.anchor}`,
      );
    const source = {
      key: sourceKey,
      authorityType: "Research Synthesis",
      title: `Municipal research packet ${report.packet}`,
      issuingAuthority: "Existing project research library",
      url: PACKET_URLS[report.packet]!,
      claimSupported:
        "The attributed report text exists in this packet; no independent verification of current law is implied.",
    };
    const previous = governments.get(key);
    const government: ResearchGovernment = previous ?? {
      key,
      state: report.state,
      displayName: report.name,
      residentName: report.name,
      attestedAsOf: "2026-08-25",
      packetId: report.packet,
      sources: [],
      form: null,
      body: {
        name: null,
        size: null,
        composition: null,
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
        "This entry preserves the existing attributed research. Individual structured rules and government/place identity links require their own verified evidence; report headings grant nothing.",
      ],
    };
    const composition =
      declaration &&
      [declaration.district, declaration.atLarge, declaration.ward].some(
        (count) => count !== null,
      )
        ? {
            pattern: (declaration.atLarge &&
            (declaration.district || declaration.ward)
              ? "HYBRID_DISTRICT_AT_LARGE"
              : declaration.atLarge &&
                  !declaration.district &&
                  !declaration.ward
                ? "AT_LARGE"
                : declaration.ward && declaration.size === declaration.ward
                  ? "WARD"
                  : declaration.district &&
                      /one from each|one representing each/.test(
                        declaration.anchor,
                      )
                    ? "SINGLE_MEMBER_DISTRICT"
                    : "OTHER") as CompositionPattern,
            districtSeats: declaration.district,
            atLargeSeats: declaration.atLarge,
            wardSeats: declaration.ward,
            note: declaration.note ?? declaration.anchor,
          }
        : null;
    governments.set(key, {
      ...government,
      form:
        government.form ??
        (declaration?.form
          ? {
              value: declaration.form as GovernmentForm,
              basisType: "Attributed research description",
              controllingAuthority: null,
              commencementDate: key === "us-or-portland" ? "2025-01-01" : null,
              sourceKey,
            }
          : null),
      body: declaration
        ? {
            ...government.body,
            name: government.body.name ?? declaration.body,
            size: government.body.size ?? declaration.size,
            composition: government.body.composition ?? composition,
            sourceKey:
              government.body.name !== null
                ? government.body.sourceKey
                : sourceKey,
          }
        : government.body,
      sources: government.sources.some((entry) => entry.key === sourceKey)
        ? government.sources
        : [...government.sources, source],
      observations: [
        ...(government.observations ?? []),
        {
          sourceKey,
          locator: `${report.heading}; captured text line ${report.line}`,
          text: `Research report ${report.packet}, ${report.heading}:\n${report.text}`,
        },
      ],
    });
  }
  return [...governments.values()].sort((a, b) => a.key.localeCompare(b.key));
}
