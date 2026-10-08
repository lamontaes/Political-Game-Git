import { resourcePositionAt } from "../../src/simulation/resource-queries";
import {
  createResourcePosition,
  makeCurrencyCode,
  money,
} from "../../src/simulation/resources";
import type { EntityId, World } from "../../src/simulation/types";

/**
 * Test fixture: a person whose savings today are exactly `minorUnits`.
 *
 * An opening records savings for some people and not others, so a test that
 * needs an exact balance cannot rely on which place or seed it drew. A person
 * the game already tracks gets their account's opening balance moved by the
 * difference, which leaves the history's sequence and ids untouched. A person
 * it does not track gets a new account.
 */
export function withPersonalSavings(
  world: World,
  personId: EntityId,
  minorUnits: number,
  stableKey = `fixture:personal-savings:${personId}`,
): World {
  const owner = { kind: "person" as const, personId };
  const currency = makeCurrencyCode("USD");
  const current = resourcePositionAt(world, owner, currency);
  if (!current) {
    return createResourcePosition(world, {
      stableKey,
      owner,
      openedAt: world.currentDate,
      openingBalance: money(minorUnits, "USD"),
      provenance: { kind: "authored", note: "Fixture savings." },
    });
  }
  const shift = minorUnits - current.liquidBalance.minorUnits;
  return {
    ...world,
    history: {
      ...world.history,
      resourcePositions: world.history.resourcePositions.map((position) =>
        position.id === current.positionId
          ? {
              ...position,
              openingBalance: {
                ...position.openingBalance,
                minorUnits: position.openingBalance.minorUnits + shift,
              },
            }
          : position,
      ),
    },
  };
}

/** Whether the game tracks any money for this person. */
export function tracksPersonalMoney(world: World, personId: EntityId): boolean {
  return (
    world.history.resourcePositions.some(
      (position) =>
        position.owner.kind === "person" &&
        position.owner.personId === personId,
    ) ||
    world.history.resourceFlows.some(
      (flow) =>
        (flow.source.kind === "person" && flow.source.personId === personId) ||
        (flow.recipient.kind === "person" &&
          flow.recipient.personId === personId),
    )
  );
}

/**
 * Test fixture: a World in which the game tracks no money for this person.
 *
 * A begun life always has savings on record, so the screen state for "no
 * money on record" can no longer come from a generated life. This moves the
 * person's accounts and flows to a stand-in who has none, leaving every id and
 * sequence in the history where it was.
 */
export function withMoneyTrackedForSomeoneElse(
  world: World,
  personId: EntityId,
): World {
  const standIn = world.personOrder.find(
    (candidate) =>
      candidate !== personId && !tracksPersonalMoney(world, candidate),
  );
  if (!standIn) throw new Error("No person without tracked money to stand in.");
  const move = <T extends { readonly kind: string }>(side: T): T =>
    side.kind === "person" &&
    (side as { personId?: EntityId }).personId === personId
      ? ({ ...side, personId: standIn } as T)
      : side;
  return {
    ...world,
    history: {
      ...world.history,
      resourcePositions: world.history.resourcePositions.map((position) => ({
        ...position,
        owner: move(position.owner),
      })),
      resourceFlows: world.history.resourceFlows.map((flow) => ({
        ...flow,
        source: move(flow.source),
        recipient: move(flow.recipient),
      })),
    },
  };
}
