import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import type { EntityId } from "../../simulation/types";
import type { ChamberKey } from "../../simulation/living-world/contract";
import type { CongressView } from "../../simulation/living-world/contract";
import type {
  SeatedBody,
  SeatedMember,
} from "../../simulation/legislation-scenarios";
type SeatedCongress = { readonly body: SeatedBody; readonly seats: number };
export interface CongressSeatingFacts {
  readonly congress: CongressView | null;
  readonly parties: ReadonlyMap<EntityId, string>;
  readonly pack: LegislativeRulePack;
}
const CHAMBER_FOR_PACK: Readonly<Record<string, ChamberKey>> = {
  house: "us-house",
  senate: "us-senate",
};

export function seatCongressChamber(
  facts: CongressSeatingFacts,
  chamberKey: string,
): SeatedCongress | null {
  const congressChamber = CHAMBER_FOR_PACK[chamberKey];
  if (!congressChamber) return null;
  const congress = facts.congress;
  if (!congress) return null;
  const view =
    congressChamber === "us-house" ? congress.house : congress.senate;
  const parties = facts.parties;
  const members: SeatedMember[] = [];
  for (const seat of view.seats) {
    if (seat.occupant.kind !== "member") continue;
    const member = seat.occupant.member;
    const partyKey = member.partyOrganizationId
      ? (parties.get(member.partyOrganizationId) ?? null)
      : null;
    members.push({
      memberKey: `${facts.pack.packId}:${chamberKey}:${seat.seatKey}`,
      name: member.personName,
      personId: member.personId,
      tenureStartedAt: member.startedAt,
      seatingEventId: member.termId,
      caucusLabel: partyKey
        ? `${partyKey.charAt(0).toUpperCase()}${partyKey.slice(1)}`
        : "No party",
      partyKey,
    });
  }
  const chamberRule = facts.pack.chambers.find(
    (entry) => entry.chamberKey === chamberKey,
  )!;
  return {
    seats: view.seats.length,
    body: { chamberKey, chamberName: chamberRule.name, members },
  };
}
