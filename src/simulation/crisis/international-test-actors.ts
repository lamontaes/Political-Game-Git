import type { World } from "../types";
import type { DeclareInternationalCrisisInput } from "./international";

/** Test actors are real person records in the fixture world, never labels alone. */
export function internationalTestActors(
  world: World,
  stableKey: string,
  allyLabels: readonly string[],
): Pick<
  DeclareInternationalCrisisInput,
  "counterpartyLeaderPersonId" | "allianceRecords"
> {
  const uncontrolled = world.personOrder.filter(
    (personId) =>
      world.control.kind !== "person" || world.control.personId !== personId,
  );
  const [counterpartyLeaderPersonId, ...alliedPeople] = uncontrolled;
  if (!counterpartyLeaderPersonId)
    throw new Error("International crisis tests need a recorded leader.");
  return {
    counterpartyLeaderPersonId,
    allianceRecords: allyLabels.map((allyLabel, index) => ({
      stableKey: `${stableKey}:alliance:${index}`,
      allyPersonId: alliedPeople[index] ?? counterpartyLeaderPersonId,
      allyLabel,
      supportOptions: ["diplomatic", "economic", "force-posture"],
      source: "test fixture treaty record",
    })),
  };
}
