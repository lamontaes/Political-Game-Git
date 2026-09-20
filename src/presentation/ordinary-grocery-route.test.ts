import { describe, expect, it } from "vitest";
import {
  addSimulationMinutes,
  createScheduledActivity,
  deserializeWorld,
  serializeWorld,
  simulationMinutesBetween,
} from "../simulation";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  currentGroceryArrival,
  ordinaryGroceryRoute,
} from "./ordinary-grocery-route";
import { travelToPlace } from "./place-travel";
import { projectLivingSceneSurface } from "./living-scene-surfaces";

function start(placeKey: string, startAge = 34) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed: `grocery:${placeKey}:${startAge}`,
      startKind: "custom",
      startAge,
      household: "shares-a-home",
    }),
  ).game!;
  return {
    ...game,
    world: openOrdinaryLifeRecords(game.world, game.playerPersonId),
  };
}

describe("authored ordinary grocery journey", () => {
  it.each(["2743000", "1150000"])(
    "records travel, readable sign and a saved return in %s without buying groceries",
    (placeKey) => {
      const { world, playerPersonId: personId } = start(placeKey);
      const before = serializeWorld(world);
      expect(ordinaryGroceryRoute(world, personId, "grocery").kind).toBe(
        "available",
      );
      expect(serializeWorld(world)).toBe(before);
      const shop = travelToPlace(
        world,
        personId,
        "grocery",
        ordinaryGroceryRoute,
      );
      expect(
        simulationMinutesBetween(world.currentMoment, shop.currentMoment),
      ).toBe(15);
      const arrival = currentGroceryArrival(shop, personId)!;
      expect(arrival.context.location?.setting).toBe("grocery");
      expect(shop.history.workItemStates).toEqual(world.history.workItemStates);
      const sign = projectLivingSceneSurface(shop, personId, {
        kind: "venue-sign",
        arrivalEventId: arrival.id,
      });
      expect(sign.status).toBe("bound");
      expect(sign.heading).toBe("Local grocery store");
      expect(sign.detail?.kind).toBe("record");
      const loaded = deserializeWorld(serializeWorld(shop));
      expect(ordinaryGroceryRoute(loaded, personId, "home")).toEqual(
        ordinaryGroceryRoute(shop, personId, "home"),
      );
      const home = travelToPlace(
        loaded,
        personId,
        "home",
        ordinaryGroceryRoute,
      );
      expect(
        simulationMinutesBetween(shop.currentMoment, home.currentMoment),
      ).toBe(15);
      expect(home.history.events.at(-1)?.context.location?.setting).toBe(
        "home",
      );
      expect(currentGroceryArrival(home, personId)).toBeNull();
      expect(
        projectLivingSceneSurface(home, personId, {
          kind: "venue-sign",
          arrivalEventId: arrival.id,
        }).status,
      ).toBe("withheld");
      expect(home.history.workItemStates).toEqual(world.history.workItemStates);
    },
  );
  it("cannot travel as another person or through a conflicting commitment", () => {
    const { world, playerPersonId: personId } = start("2309585");
    const other = world.personOrder.find((id) => id !== personId)!;
    expect(ordinaryGroceryRoute(world, other, "grocery").kind).toBe(
      "unavailable",
    );
    expect(travelToPlace(world, other, "grocery", ordinaryGroceryRoute)).toBe(
      world,
    );
    const busy = createScheduledActivity(world, {
      stableKey: "fixture:grocery-blocker",
      title: "Existing commitment",
      summary: "An actual overlapping fixture commitment.",
      kind: "confirmed",
      start: world.currentMoment,
      end: addSimulationMinutes(world.currentMoment, 30),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: "home",
        label: "Home",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
      },
      sourceEntityIds: [personId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    expect(travelToPlace(busy, personId, "grocery", ordinaryGroceryRoute)).toBe(
      busy,
    );
    expect(currentGroceryArrival(busy, personId)).toBeNull();
  });
  it("does not offer this independent adult errand to a child", () => {
    const { world, playerPersonId } = start("2743000", 10);
    expect(ordinaryGroceryRoute(world, playerPersonId, "grocery").kind).toBe(
      "unavailable",
    );
  });
});
