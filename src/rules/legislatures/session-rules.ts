import type { IsoDate, EntityId } from "../../simulation/types";
import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import type { LegislativeStartingProcedureEntry } from "../../simulation/legislative-starting-procedures";
import { regularSessionDateStatus } from "./procedure-steps";
export function regularSessionYearForWorld(
  entry: LegislativeStartingProcedureEntry | null,
  jurisdictionId: EntityId,
  year: number,
): boolean {
  if (!entry || entry.sessionCadence === "annual") return true;
  return (year % 2 === 0 ? "even" : "odd") === entry.sessionYearParity;
}

export function regularSessionRefusalText(
  pack: LegislativeRulePack,
  onDate: IsoDate,
): string | null {
  const status = regularSessionDateStatus(pack, onDate);
  if (status.kind === "outside-regular-session-year") {
    return `The regular session is not scheduled in ${onDate.slice(0, 4)}.`;
  }
  if (status.kind === "past-outer-limit") {
    return `The regular session cannot continue after ${status.deadline}, and nothing calls this legislature into a special session.`;
  }
  return null;
}
