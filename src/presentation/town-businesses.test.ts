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
  BUSINESS_WAGES_BASIS,
  BUSINESS_WORKER_WORK_KIND,
  LOCAL_BUSINESS_KINDS,
  OWNER_DRAW_BASIS,
  localBusinessesIn,
  refreshLocalEconomy,
} from "../simulation/local-economy";
import { isPlayableWork } from "../simulation/playable-work";
import { resourcePositionAt } from "../simulation/resource-queries";
import { createResourcePosition, money } from "../simulation/resources";
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
    const created = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 30,
      placeKey: "1608830",
      questionnaire: "skipped",
      priors: [],
      seed: "town-businesses",
    } as NewGameSetup);
    const earlier = new Set(created.world.personOrder);
    const { world, townId } = openedLife();
    // Staff and owners are new townspeople; nobody who already lived there
    // is handed one of these jobs.
    for (const work of world.history.workRelationships)
      if (
        work.kind === BUSINESS_OWNER_WORK_KIND ||
        work.kind === BUSINESS_WORKER_WORK_KIND
      )
        expect(earlier.has(work.personId)).toBe(false);
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

  it("records each business's monthly revenue and pay without writing a ledger nobody can read", () => {
    const { world, townId } = openedLife();
    const [grocery] = localBusinessesIn(world, townId);
    const flows = world.history.resourceFlows.filter((flow) =>
      flow.stableKey.startsWith(`${grocery!.organization.stableKey}:`),
    );
    // Revenue, the owner's draw and three paychecks, each a monthly flow.
    expect(flows.map((flow) => flow.basisKind).sort()).toEqual(
      [
        BUSINESS_WAGES_BASIS,
        BUSINESS_WAGES_BASIS,
        BUSINESS_WAGES_BASIS,
        OWNER_DRAW_BASIS,
        BUSINESS_REVENUE_BASIS,
      ].sort(),
    );
    // Nobody's savings are tracked for the town's shopkeepers, so months pass
    // without adding a payment record for every job in town.
    let next = world;
    for (let step = 0; step < 10; step += 1) next = letAdultTimePass(next, 7);
    expect(outcomesFor(next, BUSINESS_REVENUE_BASIS)).toHaveLength(0);
    expect(outcomesFor(next, OWNER_DRAW_BASIS)).toHaveLength(0);
  });

  it("settles a business's months once its money is tracked, and only once", () => {
    const { world, personId, townId } = openedLife();
    const [grocery] = localBusinessesIn(world, townId);
    const business = {
      kind: "organization" as const,
      organizationId: grocery!.organization.id,
    };
    const ownerId = world.history.workRelationships.find(
      (work) =>
        work.organizationId === grocery!.organization.id &&
        work.kind === BUSINESS_OWNER_WORK_KIND,
    )!.personId;
    let tracked = world;
    for (const [key, owner] of [
      ["test:grocery-books", business],
      ["test:grocer-savings", { kind: "person" as const, personId: ownerId }],
    ] as const)
      tracked = createResourcePosition(tracked, {
        stableKey: key,
        owner,
        openedAt: tracked.currentDate,
        openingBalance: money(0, "USD"),
        provenance: { kind: "authored", note: "Test books." },
      });
    let next = tracked;
    for (let step = 0; step < 10; step += 1) next = letAdultTimePass(next, 7);
    const months = new Set(
      outcomesFor(next, BUSINESS_REVENUE_BASIS).map((o) => o.periodStartsAt),
    );
    // Ten weeks from this start crosses exactly this many month-starts.
    expect([
      world.currentDate,
      next.currentDate,
      months.size,
    ]).toMatchInlineSnapshot(`
      [
        "2026-01-05",
        "2026-03-16",
        2,
      ]
    `);
    expect(outcomesFor(next, BUSINESS_REVENUE_BASIS)).toHaveLength(months.size);
    expect(outcomesFor(next, OWNER_DRAW_BASIS)).toHaveLength(months.size);
    expect(outcomesFor(next, BUSINESS_WAGES_BASIS)).toHaveLength(
      months.size * 3,
    );
    for (const basis of [
      BUSINESS_REVENUE_BASIS,
      OWNER_DRAW_BASIS,
      BUSINESS_WAGES_BASIS,
    ])
      for (const outcome of outcomesFor(next, basis))
        expect(outcome.status).toBe("completed");
    const usd = money(0, "USD").currency;
    // $60,000 in, $5,000 to the owner and $2,800 to each of three staff.
    expect(
      resourcePositionAt(next, business, usd)!.liquidBalance.minorUnits,
    ).toBe(months.size * (6_000_000 - 500_000 - 3 * 280_000));
    expect(
      resourcePositionAt(next, { kind: "person", personId: ownerId }, usd)!
        .liquidBalance.minorUnits,
    ).toBe(months.size * 500_000);
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
