import filingTermsData from "../../data/research/elections/candidate-filing-terms.json" with { type: "json" };
import { addDays } from "./dates";
import {
  filingLeadDays,
  MEDIAN_FILING_GAP_SOURCE,
} from "./nominations/filing-gap";
import { STATES } from "./state-reference";
import type { IsoDate } from "./types";

export type FilingOfficeFamily =
  "statewideExecutive" | "stateLegislative" | "federalLegislative" | "local";

export interface CandidateFilingTerms {
  readonly feeMinorUnits: number;
  readonly signatures:
    number | { readonly percent: number; readonly base: string };
  readonly feeInLieuOfSignatures: boolean;
  /** Recurring month and day, applied to the election cycle by its consumer. */
  readonly circulationOpens: string;
  /** Recurring month and day, applied to the election cycle by its consumer. */
  readonly deadline: string;
  readonly sameDistrictOnly: boolean;
  readonly onePerSigner: boolean;
  readonly estimated: boolean;
  readonly estimatedFrom: string;
}

type FilingTermsCorpus = {
  readonly places: Readonly<
    Record<string, Readonly<Record<FilingOfficeFamily, CandidateFilingTerms>>>
  >;
};

const corpus = filingTermsData as FilingTermsCorpus;

function validTerms(terms: CandidateFilingTerms | null | undefined): boolean {
  if (!terms) return false;
  const signatures =
    typeof terms.signatures === "number"
      ? terms.signatures > 0
      : terms.signatures.percent > 0 && terms.signatures.base.trim().length > 0;
  return (
    Number.isInteger(terms.feeMinorUnits) &&
    terms.feeMinorUnits >= 0 &&
    signatures &&
    /^\d{2}-\d{2}$/.test(terms.circulationOpens) &&
    /^\d{2}-\d{2}$/.test(terms.deadline) &&
    terms.estimatedFrom.trim().length > 0
  );
}

/**
 * The single filing-terms reader for every supported state, federal district,
 * and territory. Missing research is a disclosed estimate in data, never a
 * blank rule or a reason to refuse a candidate.
 */
export function candidateFilingTerms(
  stateUsps: string,
  officeFamily: FilingOfficeFamily,
): CandidateFilingTerms {
  const normalized = stateUsps.toUpperCase();
  if (!Object.hasOwn(STATES, normalized))
    throw new Error(`Unsupported filing place: ${stateUsps}`);
  const terms = corpus.places[normalized]?.[officeFamily];
  if (!terms || !validTerms(terms))
    throw new Error(
      `Candidate filing terms are incomplete for ${normalized}/${officeFamily}.`,
    );
  return terms;
}

export function filingTermsCoverage(): readonly string[] {
  return Object.keys(STATES).filter((usps) =>
    (
      [
        "statewideExecutive",
        "stateLegislative",
        "federalLegislative",
        "local",
      ] as const
    ).every((family) => validTerms(corpus.places[usps]?.[family])),
  );
}

/** A filing deadline on the calendar of one election. */
export interface FilingDeadline {
  readonly date: IsoDate;
  readonly daysBeforeElection: number;
  readonly estimatedFrom: string;
}

/**
 * ESTIMATED FROM AVERAGE: a local race's filing deadline, dated before its
 * own election. The month and day in the filing terms are one shared estimate
 * that can fall after a spring election; the lead time each place gave
 * candidates before its 2026 primary is a real interval, so it is applied to
 * the election instead. A place the compilation lacks takes the median lead.
 */
export function filingDeadlineBefore(
  stateUsps: string,
  electionDate: IsoDate,
): FilingDeadline {
  const normalized = stateUsps.toUpperCase();
  if (!Object.hasOwn(STATES, normalized))
    throw new Error(`Unsupported filing place: ${stateUsps}`);
  const lead = filingLeadDays(normalized);
  return {
    date: addDays(electionDate, -lead.days),
    daysBeforeElection: lead.days,
    estimatedFrom: lead.read
      ? "This place's 2026 candidate filing lead before its primary (FEC, 2026 Congressional Primary Dates and Candidate Filing Deadlines), applied to this election"
      : MEDIAN_FILING_GAP_SOURCE,
  };
}
