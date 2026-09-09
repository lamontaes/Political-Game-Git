import { createResourcePosition, money } from "./resources";
import { sameEndpoint } from "./resource-queries";
import type { CurrencyCode, EntityId, World } from "./types";

/** Start tracking only recorded money, never inferred initial wealth. Earlier
 * outcomes become a documented opening checkpoint because resourcePositionAt
 * intentionally counts only outcomes appended after a position's sequence. */
export function ensureLifePathPersonalPosition(
  world: World,
  personId: EntityId,
  currency: CurrencyCode,
): World {
  const owner = { kind: "person" as const, personId };
  if (
    world.history.resourcePositions.some(
      (p) =>
        sameEndpoint(p.owner, owner) && p.openingBalance.currency === currency,
    )
  )
    return world;
  let balance = 0;
  const carried: EntityId[] = [];
  for (const outcome of world.history.resourceTransferOutcomes) {
    if (
      outcome.occurredAt > world.currentDate ||
      outcome.transferredAmount.currency !== currency ||
      outcome.transferredAmount.minorUnits === 0
    )
      continue;
    const flow = world.history.resourceFlows.find(
      (f) => f.id === outcome.resourceFlowId,
    );
    if (!flow) continue;
    const direction =
      Number(sameEndpoint(flow.recipient, owner)) -
      Number(sameEndpoint(flow.source, owner));
    if (!direction) continue;
    balance += direction * outcome.transferredAmount.minorUnits;
    if (!Number.isSafeInteger(balance))
      throw new Error("Tracked money exceeds exact integer range.");
    carried.push(outcome.id);
  }
  return createResourcePosition(world, {
    stableKey: `life-paths2:personal-position:${personId}:${currency}`,
    owner,
    openedAt: world.currentDate,
    openingBalance: money(balance, currency),
    provenance: {
      kind: "authored",
      note: `Recorded-money checkpoint only; no initial wealth inferred. Carried transfer outcomes: ${carried.join(", ") || "none"}.`,
    },
  });
}
