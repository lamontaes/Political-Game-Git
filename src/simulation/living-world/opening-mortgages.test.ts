import { beforeAll, describe, expect, it } from "vitest";
import { explicitNewGameSetup } from "../../presentation/new-game-geography";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { ageOnDate, makeIsoDate } from "../dates";
import { buyHome, homeOwnedSince, homePurchaseTerms } from "../home-purchase";
import {
  householdLoanMonthHandler,
  HOUSEHOLD_LOAN_MONTH_KEY,
  settleHouseholdLoanPayments,
} from "../household-loans";
import { withWorldIntegrityDeferred, assertWorldIntegrity } from "../world";
import { simulationMomentOnLocalDate } from "../dates";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { householdMembershipsAt } from "../life-queries";
import {
  activeDwellingOccupanciesAt,
  dwellingOccupancyStateAt,
} from "../resource-queries";
import { recordedHouseholdHousingBillsAt } from "../cost-of-living";
import { ensureOpeningMortgages } from "./opening-mortgages";
import { townRoster } from "./town-residents";
import { personName } from "../people";
import {
  createDwelling,
  createHousingTenure,
  createResourcePosition,
  money,
  recordDwellingOccupancyState,
  startDwellingOccupancy,
} from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, LifeRecordProvenance, World } from "../types";
import { openingOwnerMortgageEvidence } from "./opening-mortgage-evidence";
import { openingMortgageTenureReadings } from "./opening-mortgages";

let opening: World;
let owners: EntityId[];
let home: EntityId;
beforeAll(() => {
  const seed = "a53-opening-tenure-records";
  const rng = new SeededRng(seed);
  const state = rng.pick(lifePlaceStateIdentities());
  const places = searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  }).filter(
    (place) =>
      (townRoster(place.context.jurisdiction.id).referencePopulation ?? 0) > 0,
  );

  expect(places.length).toBeGreaterThan(0);
  const place = rng.pick(places);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...explicitNewGameSetup({ placeKey: place.key, seed }),
      startAge: 40,
      startingLife: "ordinary-life",
      questionnaire: "skipped",
    }),
  ).game!;
  opening = game.world;
  home = opening.people[game.playerPersonId]!.homeJurisdictionId;
  const band = openingOwnerMortgageEvidence(40)!.ageBand;
  owners = Object.values(opening.people)
    .filter(
      (person) =>
        person.homeJurisdictionId === home &&
        openingOwnerMortgageEvidence(
          ageOnDate(person.birthDate, opening.currentDate),
        )?.ageBand === band,
    )
    .slice(0, 3)
    .map((person) => person.id);
  expect(owners).toHaveLength(3);
  process.stdout.write(
    JSON.stringify({
      audit: "A53",
      seed,
      place: place.displayName,
      placeKey: place.key,
      selectedState: state.name,
      eligibleLocalities: places.length,
      currentDate: opening.currentDate,
      people: owners.map((id) => ({
        id,
        name: personName(opening.people[id]!),
      })),
      proof:
        "Ordinary opening producer plus controlled dated-owner reader records below.",
      macroStarted: Boolean(opening.macroEconomy),
      homeKind: opening.jurisdictions[home]?.kind,
      townPopulation: townRoster(home).referencePopulation,
      tenureKinds: Object.fromEntries(
        [...new Set(opening.history.housingTenures.map((row) => row.kind))].map(
          (kind) => [
            kind,
            opening.history.housingTenures.filter((row) => row.kind === kind)
              .length,
          ],
        ),
      ),
      tenureReadings: openingMortgageTenureReadings(opening, home, true)
        .slice(0, 4)
        .map((row) => ({
          person: row.ownerPersonId,
          basis: row.basis,
          months: row.paidMonths,
        })),
    }) + "\n",
  );
});

function ownerHome(
  world: World,
  personId: EntityId,
  key: string,
  startedAt: string,
  generated = false,
  tenureKind = "ownership:mortgaged" as const,
  householdId: EntityId | null = null,
) {
  const provenance: LifeRecordProvenance = generated
    ? { kind: "generated", generatorKey: "a53-unit-opening-records" }
    : {
        kind: "authored",
        note: "Controlled recorded residence date for tenure-reader proof.",
      };
  let next = createDwelling(world, {
    stableKey: `${key}:dwelling`,
    establishedAt: startedAt,
    jurisdictionId: home,
    locationLabel: "Controlled tenure-reader dwelling",
    classification: "residential:house",
    provenance,
  });
  const dwellingId = next.history.dwellings.at(-1)!.id;
  next = createHousingTenure(next, {
    stableKey: `${key}:tenure`,
    holder: householdId
      ? { kind: "household", householdId }
      : { kind: "person", personId },
    dwellingId,
    startedAt,
    kind: tenureKind,
    context: null,
    provenance,
  });
  const tenureId = next.history.housingTenures.at(-1)!.id;
  if (householdId !== null) {
    for (const prior of activeDwellingOccupanciesAt(next)) {
      if (
        prior.occupant.kind !== "household" ||
        prior.occupant.householdId !== householdId
      )
        continue;
      const state = dwellingOccupancyStateAt(next, prior.id)!;
      if (state.residenceRole !== "primary") continue;
      next = recordDwellingOccupancyState(next, {
        stableKey: `${key}:end-prior:${prior.id}`,
        dwellingOccupancyId: prior.id,
        effectiveAt: next.currentDate,
        status: "ended",
        residenceRole: state.residenceRole,
        kind: state.kind,
        reason: "Controlled fixture move into its recorded replacement home.",
        provenance,
        supersedesStateId: state.id,
      });
    }
  }
  next = startDwellingOccupancy(next, {
    stableKey: `${key}:occupancy`,
    occupant: householdId
      ? { kind: "household", householdId }
      : { kind: "person", personId },
    dwellingId,
    startedAt,
    residenceRole: "primary",
    kind: "residence:owned-home",
    provenance,
  });
  return {
    world: next,
    tenureId,
    occupancyId: next.history.dwellingOccupancies.at(-1)!.id,
  };
}

describe("A53 opening mortgage ages are recorded or explicit peer estimates", () => {
  it("buys a home through the shared loan writer and services its saved due item once after reload", () => {
    const renter = Object.values(opening.people).find(
      (person) =>
        person.homeJurisdictionId === home &&
        ageOnDate(person.birthDate, opening.currentDate) >= 18 &&
        householdMembershipsAt(opening, person.id).some(
          (row) => row.state.residenceRole === "primary",
        ) &&
        homeOwnedSince(opening, person.id) === null,
    )!;
    expect(renter).toBeDefined();
    let input: World = {
      ...opening,
      control: { kind: "person", personId: renter.id },
    };
    const quote = homePurchaseTerms(input, home, renter.id);
    const position = input.history.resourcePositions.find(
      (row) =>
        row.owner.kind === "person" &&
        row.owner.personId === renter.id &&
        row.openingBalance.currency === "USD",
    );
    input = position
      ? {
          ...input,
          history: {
            ...input.history,
            resourcePositions: input.history.resourcePositions.map((row) =>
              row.id === position.id
                ? {
                    ...row,
                    openingBalance: money(quote.priceMinor, "USD"),
                    provenance: {
                      kind: "authored" as const,
                      note: "Controlled purchase-proof cash, not observed income.",
                    },
                  }
                : row,
            ),
          },
        }
      : createResourcePosition(input, {
          stableKey: "a53:purchase-proof:cash",
          owner: { kind: "person", personId: renter.id },
          openedAt: input.currentDate,
          openingBalance: money(quote.priceMinor, "USD"),
          provenance: {
            kind: "authored",
            note: "Controlled purchase-proof cash, not observed income.",
          },
        });
    const purchased = buyHome(input, renter.id);
    expect(purchased.status).toBe("bought");
    const loan = purchased.world.history.loanTerms!.at(-1)!;
    expect(loan.kind).toBe("mortgage");
    expect(loan.annualRateBasisPoints).toBeGreaterThan(0);
    expect(loan.repayment).toEqual({ kind: "installment", termMonths: 360 });
    const debt = purchased.world.history.resourceObligations.find(
      (row) => row.id === loan.resourceObligationId,
    )!;
    const due = purchased.world.history.futureDueItems.find(
      (row) =>
        row.transitionKey === HOUSEHOLD_LOAN_MONTH_KEY &&
        row.dueAt > purchased.world.currentDate,
    )!;
    // Isolated scheduled-servicing proof: cancel unrelated opening timers through
    // their existing writer, retaining original IDs and explicit cancelled states.
    // The ordinary opening itself remains unchanged and is proved below.
    const isolated = withWorldIntegrityDeferred(() => {
      let next: World = { ...purchased.world, control: { kind: "observer" } };
      for (const item of purchased.world.history.futureDueItems) {
        if (item.transitionKey === HOUSEHOLD_LOAN_MONTH_KEY) continue;
        const state = futureDueItemStateAt(next, item.id, {
          asOfDate: next.currentDate,
          historySequenceExclusive: next.history.nextSequence,
        });
        if (state?.status !== "scheduled") continue;
        next = cancelFutureDueItem(next, {
          stableKey: `a53:isolated-loan-proof:cancel:${item.id}`,
          dueItemId: item.id,
          effectiveAt: next.currentDate,
          reasonKey: "fixture:isolated-loan-servicing",
          context:
            "Explicit isolated loan-servicing fixture; unrelated opening timer remains preserved as cancelled.",
        });
      }
      return next;
    });
    assertWorldIntegrity(isolated);
    const restored = deserializeWorld(serializeWorld(isolated));
    // Invoke the real due-item dispatcher on a controlled dated copy. This
    // isolates servicing from every town's unrelated daily program producers;
    // it proves the saved loan schedule, not a whole-town month of ordinary play.
    const serviced = withWorldIntegrityDeferred(() =>
      resolveFutureDueItemsThrough(
        {
          ...restored,
          currentDate: due.dueAt,
          currentMoment: simulationMomentOnLocalDate(
            restored.currentMoment,
            due.dueAt,
          ),
        },
        due.dueAt,
        createFutureTransitionHandlerRegistry([
          [HOUSEHOLD_LOAN_MONTH_KEY, householdLoanMonthHandler],
        ]),
      ),
    );
    assertWorldIntegrity(serviced);
    const outcomes = serviced.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === debt.resourceFlowId,
    );
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.status).toBe("completed");
    expect(
      serializeWorld(settleHouseholdLoanPayments(serviced, renter.id)),
    ).toBe(serializeWorld(serviced));
    const bills = recordedHouseholdHousingBillsAt(
      serviced,
      renter.id,
      serviced.currentDate,
    )!;
    expect(bills.map((row) => row.flow.id)).toEqual([debt.resourceFlowId]);
    process.stdout.write(
      JSON.stringify({
        audit: "A53 purchase shared due item",
        person: personName(renter),
        personId: renter.id,
        loanTermsId: loan.id,
        debtId: debt.id,
        outcomeId: outcomes[0]!.id,
        paymentMinor: outcomes[0]!.transferredAmount.minorUnits,
      }) + "\n",
    );
  });

  it("opens ordinary homeowner mortgages once and exposes an actual household's payment", () => {
    const mortgageTerms = (opening.history.loanTerms ?? []).filter(
      (row) => row.kind === "mortgage",
    );
    expect(mortgageTerms.length).toBeGreaterThan(0);
    const debt = opening.history.resourceObligations.find(
      (row) => row.id === mortgageTerms[0]!.resourceObligationId,
    )!;
    const flow = opening.history.resourceFlows.find(
      (row) => row.id === debt.resourceFlowId,
    )!;
    expect(flow.source.kind).toBe("person");
    if (flow.source.kind !== "person")
      throw new Error("Missing actual mortgage borrower");
    const bills = recordedHouseholdHousingBillsAt(
      opening,
      flow.source.personId,
      opening.currentDate,
    )!;
    expect(bills.filter((bill) => bill.flow.id === flow.id)).toHaveLength(1);
    expect(
      bills.every((bill) => !bill.flow.basisKind.startsWith("housing:lease-")),
    ).toBe(true);
    expect(mortgageTerms[0]).toMatchObject({
      lateFee: null,
      missedPaymentsToDefault: null,
      missedPaymentsToCollections: null,
    });
    const repeated = ensureOpeningMortgages(opening, home);
    expect(repeated.history.loanTerms?.length ?? 0).toBe(
      opening.history.loanTerms?.length ?? 0,
    );
    const restored = deserializeWorld(serializeWorld(repeated));
    expect(
      recordedHouseholdHousingBillsAt(
        restored,
        flow.source.personId,
        restored.currentDate,
      )?.map((bill) => bill.flow.id),
    ).toEqual(bills.map((bill) => bill.flow.id));
    process.stdout.write(
      JSON.stringify({
        audit: "A53 ordinary producer",
        mortgages: mortgageTerms.length,
        borrower: personName(opening.people[flow.source.personId]!),
        personId: flow.source.personId,
        loanTermsId: mortgageTerms[0]!.id,
        obligationId: debt.id,
        paymentFlowId: flow.id,
        monthlyPaymentMinor: bills.find((bill) => bill.flow.id === flow.id)!
          .terms.amount.minorUnits,
        basis: mortgageTerms[0]!.provenance,
        saveContinue: "PASS",
        duplicateMortgageBill: false,
      }) + "\n",
    );
  });

  it("joins the ordinary opening household's primary owner and residence records", () => {
    const membership = householdMembershipsAt(opening, owners[0]!).find(
      (row) => row.state.residenceRole === "primary",
    )!;
    expect(membership).toBeDefined();
    const owned = ownerHome(
      opening,
      owners[0]!,
      "a53:household-owner",
      opening.currentDate,
      false,
      "ownership:mortgaged",
      membership.household.id,
    );
    const reading = openingMortgageTenureReadings(owned.world, home).find(
      (row) => row.housingTenureId === owned.tenureId,
    )!;
    expect(reading.paidMonths).toBe(0);
    expect(
      householdMembershipsAt(owned.world, reading.ownerPersonId).some(
        (row) =>
          row.household.id === membership.household.id &&
          row.state.residenceRole === "primary",
      ),
    ).toBe(true);
    const ownerMembership = householdMembershipsAt(
      owned.world,
      reading.ownerPersonId,
    ).find((row) => row.household.id === membership.household.id)!;
    expect(reading.sourceRecordIds).toEqual([
      owned.tenureId,
      owned.occupancyId,
      ownerMembership.membership.id,
      ownerMembership.state.id,
    ]);
  });

  it("reads elapsed residence months and preserves the actual record identities", () => {
    const owned = ownerHome(opening, owners[0]!, "a53:recorded", "2016-01-05");
    const before = serializeWorld(owned.world);
    const reading = openingMortgageTenureReadings(owned.world, home).find(
      (row) => row.housingTenureId === owned.tenureId,
    )!;
    expect(reading.paidMonths).toBe(120);
    expect(reading.basis).toBe("recorded-home-start");
    expect(reading.sourceRecordIds).toEqual([
      owned.tenureId,
      owned.occupancyId,
    ]);
    expect(serializeWorld(owned.world)).toBe(before);
  });

  it("computes the same-town similar-owner average from observed records", () => {
    const first = ownerHome(opening, owners[0]!, "a53:peer-long", "2016-01-05");
    const second = ownerHome(
      first.world,
      owners[1]!,
      "a53:peer-short",
      "2024-01-05",
    );
    const unknown = ownerHome(
      second.world,
      owners[2]!,
      "a53:peer-unknown",
      opening.currentDate,
      true,
    );
    const reading = openingMortgageTenureReadings(unknown.world, home).find(
      (row) => row.housingTenureId === unknown.tenureId,
    )!;
    expect(reading.paidMonths).toBe(72);
    expect(reading.basis).toBe("same-town-owner-average");
    expect(reading.sourceRecordIds).toEqual([
      unknown.tenureId,
      unknown.occupancyId,
      first.tenureId,
      first.occupancyId,
      second.tenureId,
      second.occupancyId,
    ]);
    const restored = deserializeWorld(serializeWorld(unknown.world));
    expect(openingMortgageTenureReadings(restored, home)).toEqual(
      openingMortgageTenureReadings(unknown.world, home),
    );
  });

  it("does not treat a generated opening date or an empty cohort as zero years paid", () => {
    const unknown = ownerHome(
      opening,
      owners[0]!,
      "a53:empty-peer",
      opening.currentDate,
      true,
    );
    expect(
      openingMortgageTenureReadings(unknown.world, home).find(
        (row) => row.housingTenureId === unknown.tenureId,
      ),
    ).toMatchObject({ paidMonths: null, basis: "missing-owner-tenure" });
  });

  it("keeps an actual recorded same-day move distinct from a generated opening date", () => {
    const owned = ownerHome(
      opening,
      owners[0]!,
      "a53:new-owner",
      opening.currentDate,
    );
    expect(
      openingMortgageTenureReadings(owned.world, home).find(
        (row) => row.housingTenureId === owned.tenureId,
      ),
    ).toMatchObject({ paidMonths: 0, basis: "recorded-home-start" });
  });

  it("excludes ended primary occupancy from the observed cohort", () => {
    const observed = ownerHome(opening, owners[0]!, "a53:ended", "2016-01-05");
    const state = observed.world.history.dwellingOccupancyStates.at(-1)!;
    const ended = recordDwellingOccupancyState(observed.world, {
      stableKey: "a53:ended:state",
      dwellingOccupancyId: observed.occupancyId,
      effectiveAt: makeIsoDate(opening.currentDate),
      status: "ended",
      residenceRole: "primary",
      kind: state.kind,
      reason: "Controlled ended-occupancy proof",
      provenance: state.provenance,
      supersedesStateId: state.id,
    });
    expect(
      openingMortgageTenureReadings(ended, home).some(
        (row) => row.housingTenureId === observed.tenureId,
      ),
    ).toBe(false);
  });
});
