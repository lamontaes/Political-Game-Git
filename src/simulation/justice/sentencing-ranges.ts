import research from "../../../data/research/justice/sentencing-ranges-2026.json" with { type: "json" };
import type { CourtCase } from "./court-reasoning";

interface ResearchTerm {
  readonly minMonths?: number;
  readonly maxMonths?: number | null;
  readonly maxLife?: boolean;
  readonly presumptiveMonths?: number;
  readonly citation?: string;
  readonly source?: string;
  readonly basis?: string;
  readonly method?: string;
  readonly fedByMin?: readonly string[];
  readonly fedByMax?: readonly string[];
}
interface ResearchPlace {
  readonly basis: string;
  readonly system: string;
  readonly classes: Readonly<Record<string, ResearchTerm>>;
  readonly offenses: Readonly<
    Record<
      string,
      ResearchTerm & { readonly class?: string; readonly offense: string }
    >
  >;
}
const places = research.places as Readonly<Record<string, ResearchPlace>>;

/** Federal maximums for the B14 public-trust offenses, applied only where the
 * referenced federal statute's elements are met. Place-specific rows take
 * precedence when researched. */
const FEDERAL_PUBLIC_TRUST_RANGES: Readonly<
  Record<
    string,
    {
      readonly maxMonths: number;
      readonly citation: string;
      readonly offenseGrade: string;
    }
  >
> = {
  "public-bribery": {
    maxMonths: 180,
    citation:
      "https://uscode.house.gov/view.xhtml?req=(title:18%20section:201%20edition:prelim)",
    offenseGrade: "18 U.S.C. § 201(b) bribery; statutory elements apply",
  },
  "public-kickback": {
    maxMonths: 120,
    citation:
      "https://uscode.house.gov/view.xhtml?req=(title:18%20section:666%20edition:prelim)",
    offenseGrade:
      "18 U.S.C. § 666; covered organization and federal-funds elements apply",
  },
  "protected-job-patronage": {
    maxMonths: 120,
    citation:
      "https://uscode.house.gov/view.xhtml?req=(title:18%20section:666%20edition:prelim)",
    offenseGrade:
      "18 U.S.C. § 666; covered organization and federal-funds elements apply",
  },
  "public-funds-embezzlement": {
    maxMonths: 120,
    citation:
      "https://uscode.house.gov/view.xhtml?req=(title:18%20section:641%20edition:prelim)",
    offenseGrade:
      "18 U.S.C. § 641; ten-year maximum applies above the statutory $1,000 threshold",
  },
  "theft-of-public-money": {
    maxMonths: 120,
    citation:
      "https://uscode.house.gov/view.xhtml?req=(title:18%20section:641%20edition:prelim)",
    offenseGrade:
      "18 U.S.C. § 641; ten-year maximum applies above the statutory $1,000 threshold",
  },
  "extortion-under-color-of-official-right": {
    maxMonths: 240,
    citation:
      "https://uscode.house.gov/view.xhtml?req=(title:18%20section:1951%20edition:prelim)",
    offenseGrade:
      "18 U.S.C. § 1951 extortion under color of official right; statutory elements apply",
  },
  "honest-services-contract-steering": {
    maxMonths: 240,
    citation:
      "https://uscode.house.gov/view.xhtml?req=(title:18%20section:1343%20edition:prelim)",
    offenseGrade:
      "18 U.S.C. §§ 1343 and 1346; honest-services fraud requires a bribe or kickback theory",
  },
  "unreported-official-gift": {
    maxMonths: 24,
    citation:
      "https://uscode.house.gov/view.xhtml?req=(title:18%20section:201%20edition:prelim)",
    offenseGrade:
      "18 U.S.C. § 201(c) unlawful gratuity; nondisclosure alone is not a federal offense",
  },
};

export interface SourcedSentenceRange {
  readonly rowId: string;
  readonly offenseGrade: string;
  readonly minMonths: number;
  readonly maxMonths: number | null;
  readonly maxLife: boolean;
  readonly presumptiveMonths: number | null;
  readonly basis: "SOURCED" | "ESTIMATED FROM AVERAGE";
  readonly citations: readonly string[];
  readonly sources: readonly string[];
  readonly estimateMethod: string | null;
  readonly contributors: readonly string[];
}

/** No unrecorded predicate authorizes a weapon/dwelling/damage charge grade. */
export function sentencingRangeForCase(
  courtCase: CourtCase,
): SourcedSentenceRange | null {
  const place = courtCase.stateKey ? places[courtCase.stateKey] : undefined;
  const row = place?.offenses[courtCase.offenseKey];
  if (!row) {
    const federal = FEDERAL_PUBLIC_TRUST_RANGES[courtCase.offenseKey];
    return federal
      ? {
          rowId: `federal-public-trust-v1:${courtCase.offenseKey}`,
          offenseGrade: federal.offenseGrade,
          minMonths: 0,
          maxMonths: federal.maxMonths,
          maxLife: false,
          presumptiveMonths: null,
          basis: "SOURCED",
          citations: [federal.citation],
          sources: [
            "United States Code, House Office of the Law Revision Counsel",
          ],
          estimateMethod: null,
          contributors: [],
        }
      : null;
  }
  if (!place) return null;
  const applicability = courtCase.sentencingApplicability;
  const facts = applicability?.allegations ?? {};
  const recordedGrade = facts.grade?.value;
  if (recordedGrade !== undefined && recordedGrade !== row.offense) return null;
  // The matrix's robbery row is the unenhanced base charge. Missing facts
  // mean not alleged, not a finding that a weapon/injury did not happen.
  if (courtCase.offenseKey === "crime:robbery") {
    if (facts.weapon?.value === true || facts.injury !== undefined) return null;
  } else if (recordedGrade !== row.offense) {
    // The published other rows already assume a particular statutory grade.
    // They cannot serve as an unalleged base assault/burglary/damage row.
    return null;
  }
  if (courtCase.offenseKey === "crime:assault" && facts.weapon?.value !== true)
    return null;
  if (
    courtCase.offenseKey === "crime:burglary" &&
    facts.dwelling?.value !== true
  )
    return null;
  if (
    place.system === "grid" &&
    (applicability?.priorConvictionEventIds.length ?? 0) > 0
  )
    return null;
  const term = row.class ? place.classes[row.class] : row;
  if (
    !term ||
    term.minMonths === undefined ||
    (term.maxMonths === undefined && !term.maxLife)
  )
    return null;
  // The packet rounds short day terms to fractional months. A rounded
  // research conversion cannot authorize a calendar release date.
  if (
    !Number.isInteger(term.minMonths) ||
    (term.maxMonths !== null &&
      term.maxMonths !== undefined &&
      !Number.isInteger(term.maxMonths))
  )
    return null;
  const maxLife = term.maxLife ?? false;
  const maxMonths = maxLife ? null : (term.maxMonths ?? null);
  if (maxMonths === null && !maxLife) return null;
  return {
    rowId: `${research.version}:${courtCase.stateKey}:${courtCase.offenseKey}`,
    offenseGrade: row.offense,
    minMonths: term.minMonths,
    maxMonths,
    maxLife,
    presumptiveMonths: term.presumptiveMonths ?? null,
    basis:
      place.basis === "ESTIMATED FROM AVERAGE"
        ? "ESTIMATED FROM AVERAGE"
        : "SOURCED",
    citations: [
      ...new Set([row.citation, term.citation].filter((v): v is string => !!v)),
    ],
    sources: [
      ...new Set([row.source, term.source].filter((v): v is string => !!v)),
    ],
    estimateMethod: row.method ?? null,
    contributors: [
      ...new Set([...(row.fedByMin ?? []), ...(row.fedByMax ?? [])]),
    ],
  };
}
