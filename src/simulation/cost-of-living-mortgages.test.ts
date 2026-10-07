import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { recordedHouseholdHousingBillsAt } from "./cost-of-living";
import { addDays } from "./dates";
import { MORTGAGE_BASIS } from "./home-purchase";
import { LOAN_PAYMENT_BASIS, openHouseholdLoan } from "./household-loans";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import {
  createResourceFlow,
  money,
  recordResourceFlowTerms,
} from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import { SeededRng } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorldMinutes } from "./time-work";
import type { EntityId } from "./types";

const seed = "team4-a53-recorded-mortgage-housing-reader";
const states = [...lifePlaceStateIdentities()];
const rng = new SeededRng(seed);
const places = Array.from({ length: 5 }, () => {
  const state = states.splice(rng.integer(0, states.length), 1)[0]!;
  return searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0]!;
});
const provenance = {
  kind: "authored" as const,
  note: "Controlled saved-loan reader fixture; these terms are not production mortgage offers.",
};

describe("recorded shared mortgages remain household housing bills", () => {
  it("samples five distinct jurisdictions from all 56", () => {
    expect(lifePlaceStateIdentities()).toHaveLength(56);
    expect(
      new Set(places.map((place) => place.stateJurisdictionKey)).size,
    ).toBe(5);
  });

  it("opens an ordinary new game in the sampled random place", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: places[0]!.key,
        seed: `${seed}:ordinary`,
        questionnaire: "skipped",
      }),
    ).game!;
    expect(game.world.control.kind).toBe("person");
    expect(game.world.people[game.playerPersonId]).toBeDefined();
    const before = serializeWorld(game.world);
    recordedHouseholdHousingBillsAt(
      game.world,
      game.playerPersonId,
      game.world.currentDate,
    );
    expect(serializeWorld(game.world)).toBe(before);
  });

  it.each(places)(
    "reads only operative mortgage and legacy housing flows in $key",
    (place) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: place.key,
        seed: `${seed}:${place.key}`,
        startAge: 30,
        startingLife: "ordinary-life",
        household: "lives-alone",
        questionnaire: "skipped",
      });
      let world = game.world;
      const borrower = {
        kind: "person" as const,
        personId: game.playerPersonId,
      };
      const jurisdictionId =
        world.people[game.playerPersonId]!.homeJurisdictionId;
      const today = world.currentDate;
      const ids: EntityId[] = [];
      for (const kind of ["mortgage", "auto", "personal"] as const) {
        world = openHouseholdLoan(world, {
          stableKey: `fixture:${kind}`,
          borrower,
          lenderOrganizationId: null,
          lenderKind: "other",
          kind,
          principal: money(100_000, "USD"),
          marketAnnualRateBasisPoints: 500,
          rateCap: null,
          repayment: { kind: "installment", termMonths: 360 },
          lateFee: null,
          missedPaymentsToDefault: 3,
          missedPaymentsToCollections: 6,
          jurisdictionId,
          housingTenureId: null,
          provenance,
        });
        ids.push(world.history.resourceFlows.at(-1)!.id);
      }
      const lender = world.history.resourceFlows.find(
        (flow) => flow.id === ids[0],
      )!.recipient;
      for (const basisKind of [MORTGAGE_BASIS, LOAN_PAYMENT_BASIS]) {
        world = createResourceFlow(world, {
          stableKey: `fixture:unlinked:${basisKind}`,
          source: borrower,
          recipient: lender,
          startsAt: today,
          amount: money(55_000, "USD"),
          cadenceKind: "schedule:monthly",
          basisKind,
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId,
          provenance,
        });
        ids.push(world.history.resourceFlows.at(-1)!.id);
      }
      const before = serializeWorld(world);
      const bills = recordedHouseholdHousingBillsAt(
        world,
        game.playerPersonId,
        today,
      )!;
      expect(bills.map((bill) => bill.flow.id).sort()).toEqual(
        [ids[0], ids[3]].sort(),
      );
      expect(bills.find((bill) => bill.flow.id === ids[0])!.terms).toEqual(
        resourceFlowTermsAt(world, ids[0]!),
      );
      expect(
        recordedHouseholdHousingBillsAt(
          world,
          game.playerPersonId,
          addDays(today, -1),
        ),
      ).toEqual([]);
      expect(serializeWorld(world)).toBe(before);
      expect(
        recordedHouseholdHousingBillsAt(
          deserializeWorld(before),
          game.playerPersonId,
          today,
        ),
      ).toEqual(bills);
      const terms = resourceFlowTermsAt(world, ids[0]!)!;
      world = advanceWorldMinutes(world, 24 * 60);
      expect(world.currentDate).toBe(addDays(today, 1));
      const ended = recordResourceFlowTerms(world, {
        stableKey: "fixture:mortgage:ended",
        resourceFlowId: ids[0]!,
        effectiveAt: addDays(today, 1),
        status: "ended",
        amount: terms.amount,
        cadenceKind: terms.cadenceKind,
        reason: "Controlled dated contract ending for reader proof.",
        provenance,
        supersedesTermsId: terms.id,
      });
      expect(
        recordedHouseholdHousingBillsAt(ended, game.playerPersonId, today),
      ).toEqual(bills);
      expect(
        recordedHouseholdHousingBillsAt(
          ended,
          game.playerPersonId,
          addDays(today, 1),
        )!.map((bill) => bill.flow.id),
      ).toEqual([ids[3]]);
    },
  );
});
