/**
 * A state legislative district's own 2024 general-election vote
 * (`data/research/elections/medsl-2024-legislative-district-results.json`,
 * MIT Election Data and Science Lab). The source prints district labels its
 * own way; each is matched to the Census district by its code or its name.
 * A district the source lacks, or one a party did not contest, has no result
 * here and the caller leans it like the rest (`legislativeSeatMargin`).
 */
import results from "../../data/research/elections/medsl-2024-legislative-district-results.json" with { type: "json" };
import { districtIdentityCatalog } from "../districts/catalog";

export interface DistrictResult {
  readonly democratic: number;
  readonly republican: number;
}

export const LEGISLATIVE_RESULTS_CITATION =
  "MIT Election Data and Science Lab, State Precinct-Level Returns 2024 (doi:10.7910/DVN/DODOBJ)";

/** A district label or code reduced to comparable words. */
function labelKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bdistrict\s+(\d+)\s+seat\s+[a-z]\b/g, "$1")
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
    .replace(
      /\b(state|house|senate|senatorial|assembly|legislative|district|representative|delegate|of|the)\b/g,
      " ",
    )
    .replace(/\d+/g, (digits) => String(Number(digits)))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Row = readonly [string, string, string, number, number, number];

const index = (() => {
  const byKey = new Map<string, { democratic: number; republican: number }>();
  for (const [usps, chamber, label, democratic, republican] of (
    results as unknown as { rows: Row[] }
  ).rows) {
    const key = `${usps}|${chamber}|${labelKey(label)}`;
    const held = byKey.get(key);
    if (held) {
      held.democratic += democratic;
      held.republican += republican;
    } else byKey.set(key, { democratic, republican });
  }
  return byKey;
})();

const identities = (() => {
  const byCode = new Map<string, string | null>();
  for (const d of districtIdentityCatalog())
    if (d.chamber !== "congressional")
      byCode.set(
        `${d.stateUsps}|${d.chamber === "state-lower" ? "lower" : "upper"}|${d.districtCode}`,
        d.sourceName,
      );
  return byCode;
})();

/**
 * The district's 2024 vote when both major parties contested it, else null.
 * A unicameral legislature is read as the upper chamber, as the Census files
 * it.
 */
export function legislativeDistrictResult(
  usps: string,
  chamber: "upper" | "lower" | "unicameral",
  districtCode: string,
): DistrictResult | null {
  const side = chamber === "lower" ? "lower" : "upper";
  const name = identities.get(`${usps}|${side}|${districtCode}`);
  const found =
    index.get(`${usps}|${side}|${labelKey(districtCode)}`) ??
    (name ? index.get(`${usps}|${side}|${labelKey(name)}`) : undefined);
  return found && found.democratic > 0 && found.republican > 0 ? found : null;
}

/** The chamber and district code a legislative seat id names. */
export function legislativeSeatParts(seatId: string): {
  usps: string;
  chamber: "upper" | "lower" | "unicameral";
  district: string;
} | null {
  const match =
    /^seat:[A-Z]{2}-([A-Z]{2}):(upper|lower|unicameral):([^:]+):\d+$/.exec(
      seatId,
    );
  return match
    ? {
        usps: match[1]!,
        chamber: match[2] as "upper" | "lower" | "unicameral",
        district: match[3]!,
      }
    : null;
}
