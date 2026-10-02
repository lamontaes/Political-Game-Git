import { householdMembershipsAt } from "./life-queries";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  recordedHouseholdHousingBillsAt,
  estimatedHouseholdLivingCostsAt,
  livingCostsFlowFor,
  settleLivingCosts,
  initializeLivingCostsFlow,
} from "./cost-of-living";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";
import { createResourcePosition, money } from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import { serializeWorld, deserializeWorld } from "./serialization";
import { personName } from "./people";
import { SeededRng } from "./rng";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  hudRentRowFor,
  startTownLeases,
  townLeases,
} from "./living-world/town-rent";
import { lifePlaceByKey } from "./life-places";

const seed = "team4-m12-recorded-bills-20260930";
const largest = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, population] = pair.split(":") as [string, string];
  const state = key.slice(0, 2);
  if ((largest.get(state)?.[1] ?? -1) < Number(population))
    largest.set(state, [key, Number(population)]);
}
largest.set("11", ["1150000", 0]);
largest.set("15", ["1571550", 0]);
largest.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!largest.has(usps)) largest.set(usps, [key, 0]);
const places = [...largest.values()].map(([key]) => key);
const available = [...places];
const watched: string[] = [];
const rng = new SeededRng(seed);
while (watched.length < 5)
  watched.push(...available.splice(rng.integer(0, available.length), 1));

const rentalAvailable = places.filter((key) =>
  hudRentRowFor(lifePlaceByKey(key)!.context.jurisdiction.id),
);
const rentalPlaces: string[] = [];
while (rentalPlaces.length < 5)
  rentalPlaces.push(
    ...rentalAvailable.splice(rng.integer(0, rentalAvailable.length), 1),
  );

describe("prospective nonhousing bills preserve actual housing contracts", () => {
  it("covers all 56 jurisdictions", () => expect(places).toHaveLength(56));
  it.each(places)(
    "creates only the marked nonhousing charge in %s, never estimated rent",
    (placeKey) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey,
        seed: `${seed}:${placeKey}`,
        startAge: 30,
        startingLife: "ordinary-life",
        household: "lives-alone",
        questionnaire: "skipped",
      });
      const personId = game.playerPersonId;
      let world = game.world;
      const householdId = householdMembershipsAt(world, personId).find(
        (row) => row.state.residenceRole === "primary",
      )!.household.id;
      if (
        !world.history.resourcePositions.some(
          (position) =>
            position.owner.kind === "household" &&
            position.owner.householdId === householdId,
        )
      ) {
        world = createResourcePosition(world, {
          stableKey: `fixture:tracked:${personId}`,
          owner: { kind: "household", householdId },
          openedAt: world.currentDate,
          openingBalance: money(100_000, "USD"),
          provenance: {
            kind: "authored",
            note: "Controlled bill fixture funds; not a law cost estimate.",
          },
        });
      }
      const originalFlows = world.history.resourceFlows;
      const initialized = initializeLivingCostsFlow(world, personId);
      const changed = settleLivingCosts(world, personId);
      expect(initialized).toEqual(changed);
      expect(initializeLivingCostsFlow(initialized, personId)).toBe(
        initialized,
      );
      const flow = livingCostsFlowFor(changed, personId)!;
      expect(flow).toBeDefined();
      expect(flow.startsAt).toBe(world.currentDate);
      expect(resourceFlowTermsAt(changed, flow.id)!.amount.minorUnits).toBe(
        estimatedHouseholdLivingCostsAt(changed, personId)!.monthlyMinor,
      );
      expect(
        changed.history.resourceFlows.slice(0, originalFlows.length),
      ).toEqual(originalFlows);
      expect(changed.history.resourceTransferOutcomes).toBe(
        world.history.resourceTransferOutcomes,
      );
      expect(settleLivingCosts(changed, personId)).toBe(changed);
      // This direct opening has no priced housing contract; unknown is not $900 or zero.
      expect(
        recordedHouseholdHousingBillsAt(changed, personId, changed.currentDate),
      ).toBeNull();
      if (watched.includes(placeKey)) {
        expect(personName(changed.people[personId]!)).toBeTruthy();
        const reopened = deserializeWorld(serializeWorld(changed));
        expect(resourceFlowTermsAt(reopened, flow.id)).toEqual(
          resourceFlowTermsAt(changed, flow.id),
        );
        expect(settleLivingCosts(reopened, personId)).toBe(reopened);
        expect(initializeLivingCostsFlow(reopened, personId)).toBe(reopened);
      }
    },
  );
  it.each(rentalPlaces)(
    "reads a named household's actual rent in %s without altering its contract",
    (placeKey) => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey,
          seed: `${seed}:lease:${placeKey}`,
          startAge: 30,
          questionnaire: "skipped",
        }),
      ).game!;
      const world = startTownLeases(game.world, game.world.currentDate);
      const lease = townLeases(world).find(
        (entry) => entry.regime === "market" && !entry.ended,
      )!;
      expect(lease).toBeDefined();
      const before = serializeWorld(world);
      const bills = recordedHouseholdHousingBillsAt(
        world,
        lease.leaseholderId,
        world.currentDate,
      )!;
      const bill = bills.find((entry) => entry.flow.id === lease.flow.id)!;
      expect(bill).toBeDefined();
      expect(bill.terms).toEqual(resourceFlowTermsAt(world, lease.flow.id));
      expect(bill.terms.cadenceKind).toBe("schedule:monthly");
      expect(personName(world.people[lease.leaseholderId]!)).toBeTruthy();
      expect(serializeWorld(world)).toBe(before);
      const reopened = deserializeWorld(before);
      expect(
        recordedHouseholdHousingBillsAt(
          reopened,
          lease.leaseholderId,
          reopened.currentDate,
        ),
      ).toEqual(bills);
    },
  );
});
