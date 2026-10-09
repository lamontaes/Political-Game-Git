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
