/**
 * How a bill's vote reads in the path check: a bill that never reached the
 * floor was decided in committee, so it prints that tally, not a floor 0–0.
 */
export function billTally(
  floor: readonly { vote: string }[],
  committee?: { heard: boolean; yes: number; no: number },
): string {
  if (!floor.length && committee)
    return committee.heard
      ? `committee ${committee.yes}–${committee.no}`
      : "committee held it, not heard";
  const yes = floor.filter((v) => v.vote === "yes").length;
  const no = floor.filter((v) => v.vote === "no").length;
  return `${yes}–${no}`;
}
