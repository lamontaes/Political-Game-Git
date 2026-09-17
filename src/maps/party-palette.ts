/**
 * Party color slots keyed by the World's actual party organization ids.
 *
 * WORLD owns the order (`partyColorOrder`, party-registry). Until that reader
 * lands on main this module mirrors its published rule: the setting's parties
 * in their authored order, then any other party by founding date and id.
 * A slot is only a color; it never implies a party count, a two-party
 * system, or a side.
 */

import type { EntityId, World } from "../simulation/types";
import { organizationProfileHistory } from "../simulation/life-queries";
import {
  LIVING_WORLD_KEYS,
  LIVING_WORLD_SCENARIO_PROFILE,
} from "../simulation/living-world";

/** Fill tokens for slots; beyond the last, colors repeat with a pattern index. */
export const PARTY_SLOT_COUNT = 8;

export interface PartySlot {
  readonly organizationId: EntityId;
  readonly slot: number;
  /** 0 for the first pass through the palette; higher adds a hatch. */
  readonly patternIndex: number;
}

function settingOrder(world: World): EntityId[] {
  return LIVING_WORLD_SCENARIO_PROFILE.majorParties.flatMap((party) => {
    const stableKey = LIVING_WORLD_KEYS.nationalParty(party.key);
    const organization = world.history.organizations.find(
      (candidate) => candidate.stableKey === stableKey,
    );
    return organization ? [organization.id] : [];
  });
}

/**
 * Stable slot for every party id the caller will show. Ids not recognized as
 * a setting party follow in founding order, so a party founded later never
 * changes an older party's color.
 */
export function partySlots(
  world: World,
  partyIds: Iterable<EntityId>,
): ReadonlyMap<EntityId, PartySlot> {
  const wanted = new Set(partyIds);
  const setting = settingOrder(world);
  const rest = [...wanted]
    .filter((id) => !setting.includes(id))
    .sort((a, b) => {
      const left = world.history.organizations.find((o) => o.id === a);
      const right = world.history.organizations.find((o) => o.id === b);
      return (
        (left?.formedAt ?? "").localeCompare(right?.formedAt ?? "") ||
        (left?.sequence ?? 0) - (right?.sequence ?? 0) ||
        a.localeCompare(b)
      );
    });
  const order = [...setting, ...rest];
  const slots = new Map<EntityId, PartySlot>();
  order.forEach((organizationId, index) => {
    if (!wanted.has(organizationId)) return;
    slots.set(organizationId, {
      organizationId,
      slot: index % PARTY_SLOT_COUNT,
      patternIndex: Math.floor(index / PARTY_SLOT_COUNT),
    });
  });
  return slots;
}

/** The party's recorded public name on a date, never a key or an id. */
export function partyNameAt(
  world: World,
  organizationId: EntityId,
  asOf: string,
): string {
  const profile = organizationProfileHistory(world, organizationId, {
    asOfDate: asOf as World["currentDate"],
    historySequenceExclusive: world.history.nextSequence,
  }).at(-1);
  if (profile) return profile.name;
  const setting = LIVING_WORLD_SCENARIO_PROFILE.majorParties.find(
    (party) =>
      world.history.organizations.find((o) => o.id === organizationId)
        ?.stableKey === LIVING_WORLD_KEYS.nationalParty(party.key),
  );
  return setting?.name ?? "Unnamed party record";
}
