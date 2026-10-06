import filingTermsData from "../../data/research/elections/candidate-filing-terms.json";
import { STATES } from "./state-reference";

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
