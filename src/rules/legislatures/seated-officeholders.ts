import type { EntityId } from "../../simulation/types";
import type { StateLegislatorView } from "../../simulation/nationwide-world/state-legislature-opening";
import type { CongressView } from "../../simulation/living-world/contract";
export interface StateSeatingFacts {
  readonly packs: ReadonlyMap<string, { readonly packId: string }>;
  readonly establishedPackIds: ReadonlySet<string>;
  readonly membersByPack: ReadonlyMap<string, readonly StateLegislatorView[]>;
}
export interface FederalColleagueFacts {
  readonly congress: CongressView | null;
  readonly stateExecutiveHolders: readonly { readonly personId: EntityId }[];
}
export function seatedStateLegislators(
  facts: StateSeatingFacts,
  stateUsps: string,
): readonly StateLegislatorView[] | null {
  const pack = facts.packs.get(`US-${stateUsps}`);
  if (!pack || !facts.establishedPackIds.has(pack.packId)) return null;
  const members = facts.membersByPack.get(pack.packId) ?? [];
  return members.length > 0 ? members : null;
}
export function federalColleaguesOf(
  facts: FederalColleagueFacts,
): readonly EntityId[] {
  const congress = facts.congress;
  const ids = new Set<EntityId>();
  for (const seat of [
    ...(congress?.house.seats ?? []),
    ...(congress?.senate.seats ?? []),
  ])
    if (seat.occupant.kind === "member") ids.add(seat.occupant.member.personId);
  for (const holder of facts.stateExecutiveHolders) ids.add(holder.personId);
  return [...ids].sort();
}
