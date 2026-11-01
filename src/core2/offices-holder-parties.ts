/**
 * The party the research reads for a seat whose roster names none
 * (data/research/offices/unrecorded-holder-parties-2026.json): a territory's
 * governor and legislators, a statewide executive, a legislative seat the
 * roster leaves vacant (the departing member's party), or none for an office
 * elected without party labels. One reader for every engine: the offices
 * engine seats another place's holder with it at the opening, and the
 * officials engine reads it when it fills a holder in as a person.
 */
import holderParties from "../../data/research/offices/unrecorded-holder-parties-2026.json" with { type: "json" };

const HOLDER_PARTIES = holderParties as unknown as {
  places: Record<
    string,
    {
      seats: Record<
        string,
        {
          party: string | null;
          appliesTo: "office" | "opening";
          sourceId: string;
        }
      >;
    }
  >;
};

/**
 * The researched party of a seat's holder, with its source: a row that
 * applies to the office (no party labels) holds for every holder; one that
 * names the opening's holder holds only for a holder in office at the
 * opening. Undefined where the research has no row that applies.
 */
export function researchedHolderParty(
  stateKey: string,
  seatId: string,
  reached: string,
): { party: string | null; partySource: string } | undefined {
  const read = HOLDER_PARTIES.places[stateKey]?.seats[seatId];
  if (
    !read ||
    (read.appliesTo !== "office" && reached !== "in office at the opening")
  )
    return undefined;
  return {
    party: read.party,
    partySource: `unrecorded-holder-parties-2026 ${read.sourceId}`,
  };
}
