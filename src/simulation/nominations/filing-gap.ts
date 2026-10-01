import nominationRules from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };

/**
 * ESTIMATED FROM AVERAGE: the median number of days between the candidate
 * filing deadline and the primary over the places with a usable 2026 row in
 * `data/research/elections/party-nomination-rules-2026.json` (the FEC's 2026
 * Congressional Primary Dates and Candidate Filing Deadlines for Ballot
 * Access: 85 days, range 63 to 149). Used wherever a place's own filing lead
 * is unread.
 *
 * On its own so a reader that must not pull in the whole nomination rule
 * reader (the town election calendar) counts the same number.
 */
export const MEDIAN_FILING_GAP_DAYS: number = (() => {
  const places = nominationRules.places as Record<
    string,
    { readonly filing?: { readonly daysBeforePrimary?: number | null } }
  >;
  const gaps = Object.values(places)
    .map((row) => row.filing?.daysBeforePrimary)
    .filter((gap): gap is number => typeof gap === "number")
    .sort((a, b) => a - b);
  const middle = Math.floor(gaps.length / 2);
  return gaps.length % 2
    ? gaps[middle]!
    : Math.round((gaps[middle - 1]! + gaps[middle]!) / 2);
})();

/** Where {@link MEDIAN_FILING_GAP_DAYS} comes from, for the record. */
export const MEDIAN_FILING_GAP_SOURCE =
  "ESTIMATED FROM AVERAGE: median candidate filing lead before the primary, " +
  "FEC 2026 Congressional Primary Dates and Candidate Filing Deadlines for Ballot Access " +
  "(data/research/elections/party-nomination-rules-2026.json). Not a claim about this place's law.";
