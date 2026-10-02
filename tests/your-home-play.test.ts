import { describe, expect, it } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../src/simulation/dates";
import {
  createHousehold,
  startHouseholdMembership,
} from "../src/simulation/life";
import { householdMembershipsAt } from "../src/simulation/life-queries";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import {
  createDwelling,
  createHousingTenure,
  createResourcePosition,
  money,
  startDwellingOccupancy,
} from "../src/simulation/resources";
import {
  activeDwellingOccupanciesAt,
  resourceFlowTermsAt,
  resourcePositionAt,
} from "../src/simulation/resource-queries";
import {
  householdHousingFacts,
  hudRentRowFor,
  payTownRent,
  startTownLeases,
  townLeases,
} from "../src/simulation/living-world/town-rent";
import { SeededRng, pickDistinct } from "../src/simulation/rng";
import {
  deserializeWorld,
  serializeWorld,
} from "../src/simulation/serialization";

// Controlled residence and funds use canonical writers. These are records-side
// steps, not a browser run, natural purchase, or acceptance of placeholder costs.
const seed = "team4-your-home-play-20261001";
const catalog = lifePlaceStateIdentities();
const places = pickDistinct(new SeededRng(seed), catalog, 3);
const provenance = {
  kind: "authored" as const,
  note: "Your Home play-script controlled tenant, dwelling and funds.",
};

function rentedHome(place: string) {
  expect(catalog).toHaveLength(56);
  const small = smallWorld({ place, seed, date: "2026-01-01" });
  let world = createHousehold(small.world, {
    stableKey: "home-play:household",
    formedAt: small.world.currentDate,
    label: "Play-script tenant household",
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = startHouseholdMembership(world, {
    stableKey: "home-play:member",
    householdId,
    personId: small.personId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  world = createDwelling(world, {
    stableKey: "home-play:dwelling",
    establishedAt: world.currentDate,
    jurisdictionId: small.jurisdictionId,
    locationLabel: "Play-script rental home",
    classification: "residential:house",
    provenance,
  });
  const dwellingId = world.history.dwellings.at(-1)!.id;
  world = createHousingTenure(world, {
    stableKey: "home-play:tenure",
    dwellingId,
    holder: { kind: "household", householdId },
    startedAt: world.currentDate,
    kind: "lease:rented",
    context: null,
    provenance,
  });
  const tenureId = world.history.housingTenures.at(-1)!.id;
  world = startDwellingOccupancy(world, {
    stableKey: "home-play:occupancy",
    dwellingId,
    occupant: { kind: "household", householdId },
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "residence:primary",
    provenance,
  });
  return { world, small, householdId, dwellingId, tenureId };
}

describe.each(places)(
  "Your Home records play script in $jurisdictionKey",
  (place) => {
    it(`step 1: reads the saved household and occupied home (seed ${seed})`, () => {
      const fixture = rentedHome(place.jurisdictionKey);
      expect(
        householdMembershipsAt(fixture.world, fixture.small.personId),
      ).toEqual([
        expect.objectContaining({
          membership: expect.objectContaining({
            householdId: fixture.householdId,
          }),
        }),
      ]);
      const occupancies = activeDwellingOccupanciesAt(fixture.world);
      expect(occupancies).toContainEqual(
        expect.objectContaining({ dwellingId: fixture.dwellingId }),
      );
      expect(
        deserializeWorld(serializeWorld(fixture.world)).history
          .dwellingOccupancies,
      ).toEqual(fixture.world.history.dwellingOccupancies);
    });

    it(`step 2: starts the recorded rent contract, or preserves missing rent data (seed ${seed})`, () => {
      const fixture = rentedHome(place.jurisdictionKey);
      const leased = startTownLeases(fixture.world, fixture.world.currentDate);
      if (!hudRentRowFor(fixture.small.jurisdictionId)) {
        expect(leased).toBe(fixture.world);
        expect(townLeases(leased)).toHaveLength(0);
        console.info(
          `${place.jurisdictionKey} seed=${seed}: missing HUD rent; no lease invented.`,
        );
        return;
      }
      const [lease] = townLeases(leased);
      expect(lease!.tenureId).toBe(fixture.tenureId);
      expect(lease!.dwellingId).toBe(fixture.dwellingId);
      expect(lease!.leaseholderId).toBe(fixture.small.personId);
      expect(
        householdHousingFacts(leased, leased.currentDate).get(
          fixture.householdId,
        )!.rentMinor,
      ).toBe(resourceFlowTermsAt(leased, lease!.flow.id)!.amount.minorUnits);
      expect(startTownLeases(leased, leased.currentDate)).toBe(leased);
      const reopened = deserializeWorld(serializeWorld(leased));
      expect(townLeases(reopened)).toEqual(townLeases(leased));
      expect(startTownLeases(reopened, reopened.currentDate)).toBe(reopened);
    });

    it(`step 3: pays recorded rent once with actual funds and preserves the receipt on reload (seed ${seed})`, () => {
      const fixture = rentedHome(place.jurisdictionKey);
      let world = startTownLeases(fixture.world, fixture.world.currentDate);
      if (!hudRentRowFor(fixture.small.jurisdictionId)) {
        expect(payTownRent(world, world.currentDate)).toBe(world);
        expect(world.history.resourceTransferOutcomes).toHaveLength(0);
        return;
      }
      const lease = townLeases(world)[0]!;
      const rent = resourceFlowTermsAt(world, lease.flow.id)!.amount;
      const payer = { kind: "person" as const, personId: lease.leaseholderId };
      world = createResourcePosition(world, {
        stableKey: "home-play:funds",
        owner: payer,
        openedAt: world.currentDate,
        openingBalance: money(rent.minorUnits * 2, rent.currency),
        provenance,
      });
      const dueOn = makeIsoDate("2026-02-01");
      world = {
        ...world,
        currentDate: dueOn,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, dueOn),
      };
      const before = resourcePositionAt(world, payer, rent.currency)!;
      const paid = payTownRent(world, dueOn);
      const receipts = paid.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === lease.flow.id,
      );
      expect(receipts).toHaveLength(1);
      expect(receipts[0]).toMatchObject({
        status: "completed",
        transferredAmount: rent,
        periodStartsAt: dueOn,
      });
      expect(
        resourcePositionAt(paid, payer, rent.currency)!.liquidBalance
          .minorUnits,
      ).toBe(before.liquidBalance.minorUnits - rent.minorUnits);
      expect(payTownRent(paid, dueOn)).toBe(paid);
      const reopened = deserializeWorld(serializeWorld(paid));
      expect(reopened.history.resourceTransferOutcomes).toEqual(
        paid.history.resourceTransferOutcomes,
      );
      expect(payTownRent(reopened, dueOn)).toBe(reopened);
      console.info(
        `${place.jurisdictionKey} seed=${seed}: flow=${lease.flow.id}; paid=${rent.minorUnits} ${rent.currency} minor units, one receipt.`,
      );
    });
  },
);

describe("Your Home unfinished play-script steps", () => {
  it.todo(
    "step 4: an enacted housing law changes this home's market and lawful rent through its recorded terms — A57 #1572; fixed market uplifts remain on main",
  );
  it.todo(
    "step 5: household living bills come from actual categories and contracts, then settle on their saved due dates — A52 #1585; flat cost and due-date replacements remain",
  );
  it.todo(
    "step 6: buy at the recorded housing-market price and service the real mortgage through the shared loan path — Overflow 8 A54/A53; dependencies unmerged",
  );
  it.todo(
    "step 7: reach the same housing and bill receipts through the player's ordinary clock and screens — no browser or ordinary-clock proof in this records script",
  );
});
