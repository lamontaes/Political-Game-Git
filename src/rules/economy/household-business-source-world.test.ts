import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { HOUSEHOLD_MIX_ROWS } from "../../simulation/household-mix.generated";
import { householdMixForJurisdiction as nativeMix } from "../../simulation/household-mix";
import { IRS_TOWN_BUSINESS_BOOKS } from "../../simulation/living-world/town-business-books.generated";
import * as nativeBooks from "../../simulation/living-world/town-business-books";
import { householdMixForJurisdiction } from "./household-source";
import {
  otherCostsAtSales,
  townBusinessHasRoomToHire,
  townBusinessLaysOff,
} from "./business-books";
import { createOrganization } from "../../simulation/life";
import type { TownBusinessBooks } from "../../simulation/living-world/town-finance-types";
describe("economy full household source mix and business cost/hiring source closure", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:household-books:" + usps,
      });
      const ids = base.world.jurisdictionOrder;
      const facts = {
        rows: HOUSEHOLD_MIX_ROWS,
        places: new Map(ids.map((id) => [id, lifePlaceByJurisdictionId(id)])),
      };
      for (const id of [...ids, null])
        expect(householdMixForJurisdiction(facts, id)).toEqual(nativeMix(id));
      const world = createOrganization(base.world, {
        stableKey: "rules2:books:employer",
        formedAt: base.world.currentDate,
        provenance: {
          kind: "authored",
          note: "Labeled saved business-book amounts and hiring boundaries; not ordinary business opening.",
        },
        initialProfile: {
          name: "Saved books employer",
          classification: "enterprise:retail",
          locationJurisdictionId: base.jurisdictionId,
        },
      });
      const organizationId = world.history.organizations.at(-1)!.id;
      const source = { rows: IRS_TOWN_BUSINESS_BOOKS };
      for (const kind of [
        ...Object.keys(nativeBooks.TOWN_BUSINESS_KIND_BOOKS),
        "missing-kind",
      ])
        for (const capacity of [0, 100000])
          for (const revenue of [0, 75000, 250000]) {
            const books: TownBusinessBooks = {
              organizationId,
              openedAt: world.currentDate,
              cash: 1000,
              debt: 0,
              annualRevenue: revenue,
              kind,
              capacity,
              annualOtherCosts: 35000,
              margin: nativeBooks.townBusinessKindBooks(kind).margin,
              ownDemandLog: 0,
              openingShare: 1,
              openingMarketSales: revenue,
              bankId: null,
              lineLimit: 0,
              lastQuarterNet: 0,
              lastQuarterPay: 10000,
              lastRound: "labeled-control",
            };
            expect(otherCostsAtSales(source, books)).toEqual(
              nativeBooks.otherCostsAtSales(books),
            );
            for (const staff of [0, 1, 3, 10])
              for (const pay of [0, 45000]) {
                expect(
                  townBusinessHasRoomToHire(source, books, staff, pay),
                ).toEqual(
                  nativeBooks.townBusinessHasRoomToHire(books, staff, pay),
                );
                expect(townBusinessLaysOff(source, books, staff)).toEqual(
                  nativeBooks.townBusinessLaysOff(books, staff),
                );
              }
          }
      expect(townBusinessHasRoomToHire(source, undefined, 1)).toEqual(
        nativeBooks.townBusinessHasRoomToHire(undefined, 1),
      );
      expect(townBusinessLaysOff(source, undefined, 1)).toEqual(
        nativeBooks.townBusinessLaysOff(undefined, 1),
      );
    });
});
