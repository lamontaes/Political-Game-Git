// Roadmap M2-10's seating rule: a race's winner serves from the race's real
// seating day, and a U.S. seat elected in November 2026 is seated on January
// 3, 2027. Kept apart from the check so the rule has its own test.
export interface SeatedRace {
  seatId: string;
  office: string;
  seatedOn: string;
  winnerParty: string | null;
}
/** Someone holding the seat, and the day they began. */
export interface Holder {
  party: string | null;
  from: string;
}
export const CONGRESS_2027 = "2027-01-03";

export function seatingProblems(
  race: SeatedRace,
  holders: readonly Holder[],
  sideOf: (party: string | null) => number,
): string[] {
  const out: string[] = [];
  if (race.office.startsWith("us-") && race.seatedOn !== CONGRESS_2027)
    out.push(`${race.seatId} seats on ${race.seatedOn}, not January 3, 2027`);
  if (
    !holders.some(
      (h) =>
        h.from === race.seatedOn &&
        sideOf(h.party) === sideOf(race.winnerParty),
    )
  )
    out.push(
      `${race.seatId} is not held by the ${race.winnerParty} winner from ${race.seatedOn} (${JSON.stringify(holders)})`,
    );
  return out;
}
