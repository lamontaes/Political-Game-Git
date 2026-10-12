import { ECONOMY_RULE_PARAMETERS as P } from "./parameters";
// stopgapId: "economy.first-lease-bedroom-proxy"
export function bedroomsForHousehold(people: number): number {
  if (!Number.isSafeInteger(people) || people < 1)
    throw new Error("First lease requires recorded household members");
  return people === 1
    ? 0
    : Math.min(
        P.firstLeaseBedroomCap.value,
        Math.ceil(people / P.peoplePerBedroom.value),
      );
}

// stopgapId: "economy.inclusionary-rounding-tolerance"
export function inclusionarySetAsideOpen(
  affordableLet: number,
  coveredHomes: number,
  recordedShare: number,
): boolean {
  return (
    affordableLet <
    Math.ceil(
      coveredHomes * recordedShare - P.inclusionaryRoundingTolerance.value,
    )
  );
}
