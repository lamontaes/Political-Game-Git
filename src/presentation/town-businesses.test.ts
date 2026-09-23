import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import {
  BUSINESS_OWNER_WORK_KIND,
  BUSINESS_REVENUE_BASIS,
  LOCAL_BUSINESS_KINDS,
  OWNER_DRAW_BASIS,
  localBusinessesIn,
  refreshLocalEconomy,
} from "../simulation/local-economy";
import { isPlayableWork } from "../simulation/playable-work";
import type { EntityId, World } from "../simulation";
import { letAdultTimePass } from "./adult-life";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { projectTownBusinesses } from "./town-businesses-view";

/**
 * A town's businesses, asked for by the owner: stores, a diner, offices, each
 * with an owner, staff and revenue. Played in Boise, not the Kentucky fixture.
 */
function openedLife(seed = "town-businesses"): {
  world: World;
  personId: EntityId;
  townId: EntityId;
} {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 30,
    placeKey: "1608830",
    questionnaire: "skipped",
    priors: [],
    seed,
  } as NewGameSetup);
  const personId = created.playerPersonId;
  const world = openOrdinaryLife(created.world, personId);
  const townId = lifePlaceByJurisdictionId(
    world.people[personId]!.homeJurisdictionId,
  )!.context.jurisdiction.id;
  return { world, personId, townId };
}

const outcomesFor = (world: World, basis: string) =>
  world.history.resourceTransferOutcomes.filter(
    (outcome) =>
      world.history.resourceFlows.find(
        (flow) => flow.id === outcome.resourceFlowId,
      )?.basisKind === basis,
  );

describe("the businesses of a town", () => {
  it("seats every business with an owner and staff when a life opens", () => {
    const { world, townId } = openedLife();
    const seated = localBusinessesIn(world, townId);
    expect(seated).toHaveLength(LOCAL_BUSINESS_KINDS.length);
    const lines = projectTownBusinesses(world, townId);
    const names = lines.map((line) => line.name);
    expect(new Set(names).size).toBe(names.length);
    const market = lines.find((line) => line.name.endsWith("'s Market"))!;
    expect(market.ownerLine).toMatch(/^\S+ \S+, owner$/);
    expect(market.staffLine).toBe("3 other people work there.");
    const law = lines.find((line) => line.name.endsWith(" Law Office"))!;
    expect(law.ownerLine).toMatch(/, attorney$/);
    expect(law.staffLine).toBe("One other person works there.");
    // Owners carry their own risk; nothing here is played work.
    for (const { organization } of seated) {
      const owner = world.history.workRelationships.find(
        (work) =>
          work.organizationId === organization.id &&
          work.kind === BUSINESS_OWNER_WORK_KIND,
      )!;
      expect(owner.economicRisk).toBe("person-borne");
      expect(isPlayableWork(owner.kind)).toBe(false);
      expect(world.people[owner.personId]!.homeJurisdictionId).toBe(townId);
    }
    assertWorldIntegrity(world);
  });

  it("is seated once, and the same way from the same seed", () => {
    const first = openedLife();
    const again = refreshLocalEconomy(first.world, first.personId);
    expect(again.history.organizations.length).toBe(
      first.world.history.organizations.length,
    );
    expect(again.personOrder.length).toBe(first.world.personOrder.length);
    const second = openedLife();
    expect(
      projectTownBusinesses(second.world, second.townId).map((l) => l.name),
    ).toEqual(
      projectTownBusinesses(first.world, first.townId).map((l) => l.name),
    );
  });

  it("takes in revenue and pays its owner every month, from the day it was seated", () => {
    const { world, personId } = openedLife();
    expect(outcomesFor(world, BUSINESS_REVENUE_BASIS)).toHaveLength(0);
    let next = world;
    for (let step = 0; step < 10; step += 1) next = letAdultTimePass(next, 7);
    const months = new Set(
      outcomesFor(next, BUSINESS_REVENUE_BASIS).map((o) => o.periodStartsAt),
    );
    expect(months.size).toBeGreaterThanOrEqual(2);
    expect(outcomesFor(next, BUSINESS_REVENUE_BASIS)).toHaveLength(
      months.size * LOCAL_BUSINESS_KINDS.length,
    );
    expect(outcomesFor(next, OWNER_DRAW_BASIS)).toHaveLength(
      months.size * LOCAL_BUSINESS_KINDS.length,
    );
    for (const outcome of outcomesFor(next, OWNER_DRAW_BASIS))
      expect(outcome.status).toBe("completed");
    // Settling again, or after a reload, writes nothing new.
    const reloaded = deserializeWorld(serializeWorld(next));
    expect(
      refreshLocalEconomy(reloaded, personId).history.resourceTransferOutcomes,
    ).toHaveLength(next.history.resourceTransferOutcomes.length);
  });

  it("marks only the story routes as playable", () => {
    expect(isPlayableWork("employment:judicial-office-practice")).toBe(true);
    expect(isPlayableWork("employment:civil-service")).toBe(true);
    expect(isPlayableWork("employment:local-business")).toBe(false);
    expect(isPlayableWork("employment:part-time")).toBe(false);
  });
});
