import { chamberByKey } from "../legislature-rules";
import { legislativeRulePackForWorld } from "../legislative-procedure-world";
import { municipalGovernmentForRulePackId } from "../municipal-government";
import { municipalSeats } from "../municipal-public-work";
import { personName } from "../people";
import type { World } from "../types";
import { seatedChamberForPack } from "./chamber-votes";
import type { SeatedChamber } from "./chamber-votes";

/** Read the actual chamber roster for an executive forecast, at any level. */
export function executiveBillChamber(
  world: World,
  rulePackId: string,
  chamberKey: string,
): SeatedChamber | null {
  const pack = legislativeRulePackForWorld(world, rulePackId);
  const chamber = chamberByKey(pack, chamberKey);
  const established = seatedChamberForPack(
    world,
    rulePackId,
    chamberKey,
    chamber.name,
  );
  if (established) return established;
  const government = municipalGovernmentForRulePackId(rulePackId);
  if (!government || chamberKey !== "council" || chamber.seats.kind !== "known")
    return null;
  const seats = municipalSeats(world, government.key).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  if (!seats.length) return null;
  return {
    seats: chamber.seats.value,
    body: {
      chamberKey,
      chamberName: chamber.name,
      members: seats.map((seat) => ({
        memberKey: `council:${seat.participationId}`,
        personId: seat.personId,
        name: personName(world.people[seat.personId]!),
        caucusLabel: "Council",
      })),
    },
  };
}
