/**
 * Candidate guidance, as a person would say it.
 *
 * `campaign-life-activities.ts` records what a host went over about running
 * for office as one packed line per office: the chamber, then the minimum
 * age, residency and term, each followed by its rule citation in brackets.
 * That line is the record and stays as written. A generated rule's citation
 * is an audit key ("MINIMUM_AGE for a LOWER_CHAMBER in US-WA"), and a count
 * of one was written "1 years"; neither is something anybody said at a
 * kitchen table.
 *
 * This reads that recorded line back into sentences. It adds nothing: every
 * age, term and residency rule is the one recorded, the citations are left
 * out (the record keeps them for anyone auditing), and a line in any other
 * shape passes through untouched.
 */

const UNKNOWN = "not known to this game";
/** A bracketed citation, allowing one level of brackets inside it. */
const CITATION = String.raw`(?: \((?:[^()]|\([^()]*\))*\))?`;
const OFFICE_CLAUSE = new RegExp(
  String.raw`(^|\. )([^.:;]+): minimum age (\d+|${UNKNOWN})${CITATION}; residency (${UNKNOWN}|[^;()]+?)${CITATION}; term in years (\d+|${UNKNOWN})${CITATION}(?=\.)`,
  "g",
);

function years(count: number): string {
  return `${count} ${count === 1 ? "year" : "years"}`;
}

/** "1 years" is how a count of one was once written; it is one year. */
function singularOne(text: string): string {
  return text.replace(/\b1 years\b/g, "1 year");
}

function officeSentence(
  chamber: string,
  age: string,
  residency: string,
  term: string,
): string {
  const ageText =
    age === UNKNOWN
      ? "the minimum age is not known to this game"
      : `you must be at least ${age}`;
  const residencyText =
    residency === UNKNOWN
      ? "the residency rule is not known to this game"
      : `you must have lived ${singularOne(residency.trim()).replace(/\bimmediately preceding filing\b/, "immediately before filing")}`;
  const termText =
    term === UNKNOWN
      ? "the term length is not known to this game"
      : `a term is ${years(Number(term))}`;
  return `To stand for the ${chamber.trim()}, ${ageText}; ${residencyText}; and ${termText}`;
}

export function plainCandidateGuidance(recorded: string): string {
  return recorded.replace(
    OFFICE_CLAUSE,
    (_match, lead: string, chamber, age, residency, term) =>
      `${lead}${officeSentence(chamber, age, residency, term)}`,
  );
}
