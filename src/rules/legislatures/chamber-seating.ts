import type { EntityId } from "../../simulation/types";
import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import type {
  SeatedBody,
  SeatedMember,
} from "../../simulation/legislation-scenarios";
export interface ChamberLeadershipFacts {
  readonly seated: ReadonlyMap<string, { readonly body: SeatedBody } | null>;
}
export const seatedLeaders = (
  facts: ChamberLeadershipFacts,
  pack: LegislativeRulePack,
) => {
  const leadersOf = new Map<string, ReadonlySet<EntityId> | "everyone">();
  for (const chamber of pack.chambers) {
    const seated = facts.seated.get(chamber.chamberKey);
    if (!seated || seated.body.members.length === 0) return null;
    const sizes = new Map<string, number>();
    for (const member of seated.body.members)
      sizes.set(member.caucusLabel, (sizes.get(member.caucusLabel) ?? 0) + 1);
    const ranked = [...sizes.values()].sort((l, r) => r - l);
    if (ranked.length > 1 && ranked[0] === ranked[1]) {
      leadersOf.set(chamber.chamberKey, "everyone");
      continue;
    }
    const largest = [...sizes.entries()].find(
      ([, size]) => size === ranked[0],
    )![0];
    leadersOf.set(
      chamber.chamberKey,
      new Set(
        seated.body.members.flatMap((member) =>
          member.caucusLabel === largest && member.personId
            ? [member.personId]
            : [],
        ),
      ),
    );
  }
  return leadersOf;
};
const CAUCUS_LABELS = ["Majority", "Minority", "Unaffiliated"] as const;

export function seatChamber(
  chamberKey: string,
  chamberName: string,
  seats: number,
  linkedPeople: readonly {
    readonly personId: EntityId;
    readonly name: string;
  }[],
  nonpartisan: boolean,
): SeatedBody {
  const members: SeatedMember[] = [];
  for (let index = 0; index < seats; index += 1) {
    const linked = linkedPeople[index];
    members.push({
      memberKey: `${chamberKey}-seat-${String(index + 1).padStart(3, "0")}`,
      name: linked ? linked.name : `Member for District ${index + 1}`,
      personId: linked ? linked.personId : null,
      caucusLabel: nonpartisan
        ? "Nonpartisan"
        : CAUCUS_LABELS[index % 2 === 0 ? 0 : 1]!,
    });
  }
  return { chamberKey, chamberName, members };
}

// stopgapId: "SG-P14-legislatures-largest-caucus-leadership"
