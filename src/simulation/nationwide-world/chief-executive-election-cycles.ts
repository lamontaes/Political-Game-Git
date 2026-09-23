/**
 * Which years each chief executive is regularly elected in, from research.
 *
 * Source: ChatGPT's nationwide governor election calendar, answering
 * `when-each-state-elects-its-governor`, kept verbatim with its SHA256SUMS at
 * docs/research/chatgpt-answers/2026-09-22-nationwide-2235/
 * OCD-GOVERNOR-ELECTION-CALENDAR--NATIONWIDE-52--SOURCE-STATUS--2026-09-22.md.
 * Each row is that table's "Regular election cycle (reference; interval)"
 * column, with the controlling provision it cites.
 *
 * Only the CYCLE is taken from it. The same table marks almost every term
 * start as an UNVERIFIED candidate, so commencement stays on the game's
 * disclosed profile; taking an unverified date as law would be inventing it.
 *
 * NOT MODELED: Louisiana's own election calendar, a fall primary on the
 * third-to-last Saturday of October and a general six Saturdays later if
 * needed. Blanket rule meanwhile: Louisiana elects on the November general
 * election day of its odd-numbered election years, which gets the year right
 * and the day approximately.
 *
 * Every state not listed here elects in the four-year cycle containing 2026,
 * which the calendar confirms for every state it does not list below, and New
 * Hampshire and Vermont every two years from 2026.
 */

export interface ChiefExecutiveElectionCycle {
  readonly stateUsps: string;
  /** Any one regular election year. */
  readonly referenceYear: number;
  /** The provision the calendar cites. Never a player sentence. */
  readonly citation: string;
}

export const CHIEF_EXECUTIVE_ELECTION_CYCLE_SOURCE =
  "docs/research/chatgpt-answers/2026-09-22-nationwide-2235/OCD-GOVERNOR-ELECTION-CALENDAR--NATIONWIDE-52--SOURCE-STATUS--2026-09-22.md";

/** The jurisdictions whose regular elections are not in the cycle containing 2026. */
export const CHIEF_EXECUTIVE_ELECTION_CYCLES: readonly ChiefExecutiveElectionCycle[] =
  [
    {
      stateUsps: "DE",
      referenceYear: 2024,
      citation: "Del. Const. art. III, §5",
    },
    {
      stateUsps: "IN",
      referenceYear: 2024,
      citation: "Ind. Const. art. 5, §3",
    },
    { stateUsps: "KY", referenceYear: 2027, citation: "Ky. Const. §§69, 73" },
    {
      stateUsps: "LA",
      referenceYear: 2027,
      citation: "La. Const. art. IV, §3",
    },
    {
      stateUsps: "MO",
      referenceYear: 2024,
      citation: "Mo. Const. art. IV, §2",
    },
    {
      stateUsps: "MS",
      referenceYear: 2027,
      citation: "Miss. Const. art. 5, §§116, 124",
    },
    {
      stateUsps: "MT",
      referenceYear: 2024,
      citation: "Mont. Const. art. VI, §4",
    },
    {
      stateUsps: "NC",
      referenceYear: 2028,
      citation: "N.C. Const. art. III, §§2, 7",
    },
    {
      stateUsps: "ND",
      referenceYear: 2024,
      citation: "N.D. Const. art. V, §1",
    },
    {
      stateUsps: "NJ",
      referenceYear: 2025,
      citation: "N.J. Const. art. V, §1, ¶3",
    },
    {
      stateUsps: "UT",
      referenceYear: 2024,
      citation: "Utah Const. art. VII, §1",
    },
    { stateUsps: "VA", referenceYear: 2025, citation: "Va. Const. art. V, §1" },
    {
      stateUsps: "WV",
      referenceYear: 2024,
      citation: "W. Va. Const. art. VII, §4",
    },
  ];

export function chiefExecutiveElectionCycle(
  stateUsps: string,
): ChiefExecutiveElectionCycle | null {
  return (
    CHIEF_EXECUTIVE_ELECTION_CYCLES.find(
      (row) => row.stateUsps === stateUsps,
    ) ?? null
  );
}
