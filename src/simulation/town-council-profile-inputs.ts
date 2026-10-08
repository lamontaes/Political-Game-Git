import { TOWN_COUNCIL_PROFILE_INPUTS } from "./town-council-profile-inputs.generated";
import type { MunicipalReading } from "./municipal-government";

export type TownCouncilProfileReading = Pick<
  MunicipalReading,
  "bodyName" | "bodySize" | "form" | "evidence"
>;

/** The same source fields, available before the municipal inventory loads. */
export function townCouncilProfileReading(
  unitId: string,
): TownCouncilProfileReading | null {
  const readings: Readonly<Record<string, TownCouncilProfileReading>> =
    TOWN_COUNCIL_PROFILE_INPUTS;
  return readings[unitId] ?? null;
}
