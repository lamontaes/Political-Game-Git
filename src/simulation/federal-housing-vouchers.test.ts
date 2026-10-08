import { afterAll, describe, expect, it } from "vitest";
import {
  base,
  enact,
  procedure,
  provenance,
} from "../../tests/fixtures/funded-service-fixture";
import { pay } from "../../tests/fixtures/public-program-fixture";
import { createOrganization } from "./life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "./tax-policy";
import {
  createDwelling,
  createHousingTenure,
  createResourcePosition,
  money,
} from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { assertWorldIntegrityFully, withWorldIntegrityDeferred } from "./world";
import type { World } from "./types";
import {
  FEDERAL_VOUCHER_QUESTION,
  payFederalHousingVoucher,
} from "./federal-housing-vouchers";

function fixture(stateKey: string, answer: "yes" | "no" = "yes") {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  let world = ensureNationalElectionJurisdiction({
    ...base,
    jurisdictions: { ...base.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [
      ...new Set([...base.jurisdictionOrder, jurisdiction.id]),
    ],
  });
  world = enact(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    answer,
    FEDERAL_VOUCHER_QUESTION,
  );
  const personId = procedure.playerPersonId;
  world = ensurePublicGovernmentAccount(world, {
    kind: "jurisdiction",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
  });
  const accountId = publicTaxAccountForJurisdiction(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
  )!.organizationId;
  world = createOrganization(world, {
    stableKey: "voucher:test-donor",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Fixture treasury receipts",
      classification: "sector:private",
      locationJurisdictionId: jurisdiction.id,
    },
  });
  const donorId = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "voucher:test-donor-cash",
    owner: { kind: "organization", organizationId: donorId },
    openedAt: world.currentDate,
    openingBalance: money(1_000_000, "USD"),
    provenance,
  });
  world = pay(world, "voucher:test-funding", donorId, accountId, 1_000_000);
  if (!resourcePositionAt(world, { kind: "person", personId }, "USD"))
    world = createResourcePosition(world, {
      stableKey: "voucher:tenant-cash",
      owner: { kind: "person", personId },
      openedAt: world.currentDate,
      openingBalance: money(0, "USD"),
      provenance,
    });
  world = createDwelling(world, {
    stableKey: "voucher:test-home",
    establishedAt: world.currentDate,
    jurisdictionId: jurisdiction.id,
    locationLabel: jurisdiction.name,
    classification: "residential:apartment",
    provenance,
  });
  world = createHousingTenure(world, {
    stableKey: "voucher:test-tenancy",
    holder: { kind: "person", personId },
    dwellingId: world.history.dwellings.at(-1)!.id,
    startedAt: world.currentDate,
    kind: "lease:market",
    context: null,
    provenance,
  });
  return {
    world,
    accountId,
    input: {
      onDate: world.currentDate,
      tenancyId: world.history.housingTenures.at(-1)!.id,
      leaseholderId: personId,
      jurisdictionId: jurisdiction.id,
      grossRentMinor: 120_000,
      paymentStandardMinor: 110_000,
      monthlyIncomeMinor: 200_000,
      annualIncomeLimitMinor: 3_000_000,
    },
  };
}

describe("federal vouchers reach recorded tenants", () => {
  let auditWorld: World;
  afterAll(() => assertWorldIntegrityFully(auditWorld));
  it("uses the same cash and law-stamp path in all 56 jurisdictions", () => {
    expect(lifePlaceStateIdentities()).toHaveLength(56);
    for (const place of lifePlaceStateIdentities())
      withWorldIntegrityDeferred(() => {
        const { world, accountId, input } = fixture(place.jurisdictionKey);
        const owner = {
          kind: "person" as const,
          personId: input.leaseholderId,
        };
        const before = resourcePositionAt(world, owner, "USD")!.liquidBalance
          .minorUnits;
        const treasury = resourcePositionAt(
          world,
          { kind: "organization", organizationId: accountId },
          "USD",
        )!.liquidBalance.minorUnits;
        const next = payFederalHousingVoucher(world, input);
        auditWorld = next;
        expect(
          resourcePositionAt(next, owner, "USD")!.liquidBalance.minorUnits -
            before,
          place.jurisdictionKey,
        ).toBe(50_000);
        expect(
          resourcePositionAt(
            next,
            { kind: "organization", organizationId: accountId },
            "USD",
          )!.liquidBalance.minorUnits,
        ).toBe(treasury - 50_000);
        expect(
          next.history.lawExposures?.find(
            (row) =>
              row.personId === input.leaseholderId &&
              row.sectionKey === FEDERAL_VOUCHER_QUESTION,
          ),
        ).toMatchObject({ amount: money(50_000, "USD"), direction: "gain" });
        expect(
          next.history.resourceTransferOutcomes.at(-1)!.lawEffectStamps?.[0]
            ?.questionKey,
        ).toBe(FEDERAL_VOUCHER_QUESTION);
        expect(payFederalHousingVoucher(next, input)).toBe(next);
      });
  });
  it("does not pay without the law, above the income limit, or with negative income", () =>
    withWorldIntegrityDeferred(() => {
      const key = lifePlaceStateIdentities()[0]!.jurisdictionKey;
      const absent = fixture(key, "no");
      expect(payFederalHousingVoucher(absent.world, absent.input)).toBe(
        absent.world,
      );
      const covered = fixture(key);
      expect(
        payFederalHousingVoucher(covered.world, {
          ...covered.input,
          monthlyIncomeMinor: 300_000,
        }),
      ).toBe(covered.world);
      expect(
        payFederalHousingVoucher(covered.world, {
          ...covered.input,
          monthlyIncomeMinor: -1,
        }),
      ).toBe(covered.world);
    }));
});
