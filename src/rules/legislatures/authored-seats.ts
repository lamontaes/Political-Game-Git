import type { LegislativeRulePack } from "../../simulation/legislature-rules";
export function authoredScenarioSeatCount(
  authoredCounts: Readonly<Record<string, Readonly<Record<string, number>>>>,
  pack: LegislativeRulePack,
  chamberKey: string,
): number {
  const formal = pack.chambers.find(
    (chamber) => chamber.chamberKey === chamberKey,
  )?.seats;
  const seats =
    formal?.kind === "known"
      ? formal.value
      : authoredCounts[pack.packId]?.[chamberKey];
  if (!Number.isSafeInteger(seats) || (seats ?? 0) <= 0) {
    throw new Error(
      `No positive authored scenario seat count exists for '${pack.packId}/${chamberKey}'.`,
    );
  }
  return seats!;
}

// stopgapId: "SG-P14-legislatures-authored-scenario-seats"
