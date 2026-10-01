import research from "../../../data/research/justice/sentencing-ranges-2026.json";
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
  if (!place || !row) return null;
  const applicability = courtCase.sentencingApplicability;
  const facts = applicability?.allegations ?? {};
  const recordedGrade = facts.grade?.value;
  if (recordedGrade !== undefined && recordedGrade !== row.offense) return null;
  // The matrix's robbery row is the unenhanced base charge. Missing facts
  // mean not alleged, not a finding that a weapon/injury did not happen.
  if (courtCase.offenseKey === "crime:robbery") {
    if (facts.weapon?.value === true || facts.injury?.value === "serious")
      return null;
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
