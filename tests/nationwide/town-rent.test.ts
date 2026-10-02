import { rentConstructionCovered } from "../../src/simulation/law-consequences/rent-construction-coverage";
import { dateAtAge } from "../../src/simulation/dates";
import {
  createMacroMonthlyStepHandler,
  MACRO_MONTHLY_STEP_KEY,
} from "../../src/simulation/macro-economy";
import { randomInt } from "node:crypto";
import startingLaws from "../../data/research/laws/starting-law-2026.json";
import {
  allGovernmentUnits,
  governmentUnitJurisdictionId,
} from "../../src/simulation/government-units";
import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  livingCostsFlowFor,
  settleLivingCosts,
} from "../../src/simulation/cost-of-living";
import { householdMembershipsAt } from "../../src/simulation/life-queries";
import { ensureLifePathPersonalPosition } from "../../src/simulation/life-paths2-resources";
import { applyLawConsequences } from "../../src/simulation/enacted-law-effects";
import { readFinalEnactedLawTerm } from "../../src/simulation/governing/automatic-legislation";
import {
  money,
  recordResourceFlowTerms,
  createDwelling,
} from "../../src/simulation/resources";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { organizationProfileAt } from "../../src/simulation/life-queries";
import {
  nextPaydayDate,
  payTownPaydays,
  startTownJobPay,
} from "../../src/simulation/living-world/town-pay";
import {
  affordableRentMinor,
  collectTownRent,
  bedroomsForHousehold,
  housingLawYes,
  hudRentRowFor,
  inclusionarySetAsideOpen,
  publicHousingRentMinor,
  RENT_BASIS,
  RENT_DAY_TRANSITION_KEY,
  RENT_LAW_KEYS,
  renewedMarketRent,
  rentPriceLevel,
  townLeases,
  townRentSnapshot,
  veryLowIncomeLimit,
} from "../../src/simulation/living-world/town-rent";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { IsoDate, World } from "../../src/simulation";

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function onePlaceEach(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

describe("one rent rule for every state, D.C. and territory", () => {
  it("reads each place's county Fair Market Rent from HUD, or says UNKNOWN", () => {
    const places = onePlaceEach();
    expect(places).toHaveLength(56);
    let known = 0;
    for (const key of places) {
      const place = lifePlaceByKey(key)!;
      const row = hudRentRowFor(place.context.jurisdiction.id);
      if (!row) continue;
      known += 1;
      // A rent is a positive dollar figure, and more bedrooms never cost less.
      for (let bedrooms = 1; bedrooms <= 4; bedrooms += 1)
        expect(row.rents[bedrooms]!, key).toBeGreaterThanOrEqual(
          row.rents[bedrooms - 1]!,
        );
      expect(row.rents[0], key).toBeGreaterThan(0);
    }
    // Every state and D.C. has a HUD county; a territory place without a
    // county on record reads as unknown, never as zero.
    expect(known).toBeGreaterThanOrEqual(51);
  });

  it("reads Cook County's published rents for Chicago", () => {
    const chicago = lifePlaceByKey("1714000")!.context.jurisdiction.id;
    const row = hudRentRowFor(chicago)!;
    expect(row.area).toBe("17031");
    expect(row.rents).toEqual([1458, 1560, 1761, 2262, 2657]);
    expect(row.veryLow4).toBe(59950);
  });
});

describe("rent arithmetic", () => {
  const row = {
    area: "17031",
    rents: [1458, 1560, 1761, 2262, 2657] as const,
    veryLow4: 59950,
    low4: 95900,
    population: null,
  };

  it("sizes income limits by HUD's family-size factors", () => {
    expect(veryLowIncomeLimit(row, 4)).toBe(59950);
    expect(veryLowIncomeLimit(row, 1)).toBeCloseTo(59950 * 0.7);
    expect(veryLowIncomeLimit(row, 1.5)).toBeCloseTo(59950 * 0.75);
  });

  it("sets an affordable rent at 30% of 60% of area median income", () => {
    // One bedroom: 1.5 people, 75% of the four-person very low limit, times
    // 1.2 for the 60% line, 30% of it a month.
    expect(affordableRentMinor(row, 1)).toBe(
      Math.round(((59950 * 0.75 * 1.2 * 0.3) / 12) * 100),
    );
    expect(affordableRentMinor({ ...row, veryLow4: null }, 1)).toBeNull();
  });

  it("charges public housing 30% of income, within the minimum and the flat rent", () => {
    const fmr = 1761_00;
    expect(publicHousingRentMinor(2000_00, fmr)).toBe(600_00);
    expect(publicHousingRentMinor(0, fmr)).toBe(50_00);
    // The flat rent, 80% of the Fair Market Rent, is the most it charges.
    expect(publicHousingRentMinor(10_000_00, fmr)).toBe(1409_00);
    // Unknown income is not zero income: the flat rent applies.
    expect(publicHousingRentMinor(null, fmr)).toBe(1409_00);
  });

  it("fills an inclusionary set-aside with the homes eligible households rent, by count", () => {
    // Let the first eligible household in each covered home while the
    // set-aside owes one: the 1st, 7th, 14th and 21st homes.
    const recordedShare = 0.15; // Explicit authored arithmetic fixture.
    let affordable = 0;
    const taken: number[] = [];
    for (let home = 1; home <= 100; home += 1)
      if (inclusionarySetAsideOpen(affordable, home, recordedShare)) {
        affordable += 1;
        taken.push(home);
      }
    expect(taken.slice(0, 4)).toEqual([1, 7, 14, 21]);
    expect(taken).toHaveLength(Math.round(100 * recordedShare));
    // A home the set-aside owed but an ineligible household took leaves the
    // debt open for the next home.
    expect(inclusionarySetAsideOpen(0, 2, recordedShare)).toBe(true);
    expect(inclusionarySetAsideOpen(1, 6, recordedShare)).toBe(false);
  });

  it("caps a stabilized renewal only with an explicit recorded ratio", () => {
    // Home prices up 9% while prices in general rose 3%.
    const steep = renewedMarketRent(2000_00, 1.09, 1.03, true, 0.08);
    expect(steep.capped).toBe(true);
    expect(steep.cap).toBeCloseTo(0.08);
    expect(steep.amountMinor).toBe(2160_00);
    expect(steep.uncappedMinor).toBe(2180_00);
    // The same renewal without the law follows home prices.
    const free = renewedMarketRent(2000_00, 1.09, 1.03, false);
    expect(free.capped).toBe(false);
    expect(free.amountMinor).toBe(steep.uncappedMinor);
    expect(renewedMarketRent(2000_00, 1.09, 1.03, true).amountMinor).toBe(
      2180_00,
    );
    // Another explicitly recorded cap.
    expect(renewedMarketRent(2000_00, 1.12, 1.08, true, 0.1).cap).toBeCloseTo(
      0.1,
    );
    // An ordinary renewal is under the cap and untouched.
    const ordinary = renewedMarketRent(2000_00, 1.04, 1.03, true, 0.08);
    expect(ordinary.capped).toBe(false);
    expect(ordinary.amountMinor).toBe(2080_00);
  });

  it("fits a home's bedrooms to who first rents it", () => {
    // The household's recorded size decides, two people to a bedroom (A56).
    const sizes = [1, 2, 4, 6].map((people) => bedroomsForHousehold(people));
    expect(sizes).toEqual([0, 1, 2, 3]);
    // One person rents a studio, and no household needs more than four.
    expect(bedroomsForHousehold(1)).toBe(0);
    expect(bedroomsForHousehold(11)).toBe(4);
  });
});

/** An opened life stepped day by day, paid on paydays, rent collected on the first. */
function liveMonths(
  placeKey: string,
  seed: string,
  months: number,
  beforeRentDay?: (world: World, day: IsoDate) => World,
) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const player = game.playerPersonId;
  let world: World = game.world;
  const town = world.people[player]!.homeJurisdictionId;
  let lastPay = world.currentDate;
  const rentDays: IsoDate[] = [];
  withWorldIntegrityDeferred(() => {
    let day = world.currentDate;
    while (rentDays.length < months) {
      day = addDays(day, 1);
      world = {
        ...world,
        currentDate: day,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
      };
      if (nextPaydayDate(addDays(day, -1)) === day) {
        world = startTownJobPay(world, player, lastPay);
        world = payTownPaydays(world, lastPay, player);
        lastPay = day;
      }
      if (day.endsWith("-01")) {
        if (beforeRentDay) world = beforeRentDay(world, day);
        world = collectTownRent(world, day);
        rentDays.push(day);
      }
    }
  });
  return { game, world, player, town, rentDays };
}

describe("rent day", { timeout: 600_000 }, () => {
  it("Chicago: every renting household pays a landlord on record, from HUD rents", () => {
    const { game, world, town, rentDays } = liveMonths(
      "1714000",
      "town-rent-chicago",
      4,
    );
    expect(
      game.world.history.futureDueItems.some(
        (item) => item.transitionKey === RENT_DAY_TRANSITION_KEY,
      ),
    ).toBe(true);
    const leases = townLeases(world).filter((lease) => lease.town === town);
    const rented = world.history.housingTenures.filter(
      (tenure) => tenure.kind === "lease:rented",
    );
    expect(rented.length).toBeGreaterThan(10);
    // Every rented home in town has a lease, and every lease is rent.
    for (const tenure of rented)
      expect(
        leases.some((lease) => lease.tenureId === tenure.id),
        tenure.id,
      ).toBe(true);
    const row = hudRentRowFor(town)!;
    for (const lease of leases) {
      expect(lease.flow.basisKind).toBe(RENT_BASIS);
      // The landlord is a person or a firm or the housing authority, never the tenant.
      if (lease.flow.recipient.kind === "person")
        expect(lease.flow.recipient.personId).not.toBe(lease.leaseholderId);
      else if (lease.flow.recipient.kind === "organization")
        expect(
          organizationProfileAt(world, lease.flow.recipient.organizationId)
            ?.classification,
        ).toMatch(/^(enterprise:real-estate|service:public-housing)$/);
      else throw new Error("A household is never a landlord here.");
      const rent = resourceFlowTermsAt(world, lease.flow.id)!.amount;
      expect(rent.minorUnits % 100).toBe(0);
      if (lease.regime === "market") {
        // Within a wide band of the county's Fair Market Rent for its size.
        const fmr = row.rents[lease.bedrooms]! * 100;
        expect(rent.minorUnits).toBeGreaterThan(fmr * 0.3);
        expect(rent.minorUnits).toBeLessThan(fmr * 3);
      }
    }
    // Rent is collected every month from the first after the lease began:
    // paid, short or, where money is untracked, unknown, never skipped.
    const last = townRentSnapshot(world, town, rentDays.at(-1)!);
    expect(last.leases).toBe(leases.filter((lease) => !lease.ended).length);
    expect(last.paid + last.short + last.unknown).toBe(last.leases);
    expect(last.paid).toBeGreaterThan(0);
    expect(last.medianRentMinor).not.toBeNull();
    expect(last.medianBurden).not.toBeNull();
    // Running the same rent day again writes nothing.
    const again = withWorldIntegrityDeferred(() =>
      collectTownRent(world, rentDays.at(-1)!),
    );
    expect(again.history.resourceTransferOutcomes).toHaveLength(
      world.history.resourceTransferOutcomes.length,
    );
  });

  it("opens a random rent-stabilized new game through an actual annual renewal", () => {
    const answers =
      startingLaws.questions[RENT_LAW_KEYS.rentStabilization].answers;
    const places = allGovernmentUnits().flatMap((unit) => {
      if (
        unit.unitType !== "municipality" ||
        !unit.functionalActive ||
        !unit.placeGeoid
      )
        return [];
      const place = lifePlaceByKey(unit.placeGeoid);
      const answer =
        place && answers[place.stateJurisdictionKey as keyof typeof answers];
      return place &&
        answer?.answer === "yes" &&
        place.context.jurisdiction.id === governmentUnitJurisdictionId(unit)
        ? [place]
        : [];
    });
    const place = places[randomInt(places.length)]!;
    process.stdout.write(
      `A57 renewal opening: ${place.key} ${place.context.jurisdiction.name}; pool=${places.length}; seed=a57-actual-renewal\n`,
    );
    const { world, town } = liveMonths(
      place.key,
      "a57-actual-renewal",
      13,
      (incoming, day) => {
        // Controlled market stress in the existing monthly fixture. Annual
        // renewal itself must create the capped terms via canonical dispatch.
        const due = incoming.history.futureDueItems.find(
          (item) =>
            item.transitionKey === MACRO_MONTHLY_STEP_KEY &&
            item.dueAt <= day &&
            !incoming.macroEconomy?.months.some((month) =>
              month.key.includes(item.stableKey.split(":").at(-1)!),
            ),
        );
        if (!due) return incoming;
        const stepped = createMacroMonthlyStepHandler()(incoming, due);
        const next =
          "world" in stepped ? (stepped.world ?? incoming) : incoming;
        if (!next.macroEconomy) return next;
        const lease = townLeases(next).find(
          (candidate) => candidate.regime === "market",
        );
        if (!lease) return next;
        const law = housingLawYes(
          next,
          lease.town,
          RENT_LAW_KEYS.rentStabilization,
          day,
        )!;
        const cap = readFinalEnactedLawTerm(next, law, {
          questionKey: RENT_LAW_KEYS.rentStabilization,
          termKey: "cap",
          unit: "ratio",
        })!;
        return {
          ...next,
          macroEconomy: {
            ...next.macroEconomy,
            months: next.macroEconomy.months.map((month) => ({
              ...month,
              growthPct: 2 * cap.value * 100,
            })),
          },
        };
      },
    );
    const leases = townLeases(world).filter(
      (lease) =>
        lease.town === town && lease.regime === "market" && !lease.ended,
    );
    const renewals = world.history.resourceFlowTerms.filter(
      (terms) =>
        leases.some((lease) => lease.flow.id === terms.resourceFlowId) &&
        terms.stableKey.endsWith(":renewal:1"),
    );
    expect(renewals.length).toBeGreaterThan(0);
    const capped = world.history.resourceFlowTerms.filter((terms) =>
      terms.lawEffectStamps?.some(
        (stamp) =>
          stamp.effectKind === "price-cost" &&
          stamp.questionKey === RENT_LAW_KEYS.rentStabilization,
      ),
    );
    process.stdout.write(
      `A57 actual renewal result: date=${world.currentDate}; marketLeases=${leases.length}; annualRenewals=${renewals.length}; appliedCaps=${capped.length}\n`,
    );
    expect(capped.length).toBeGreaterThan(0);
    // The ordinary run may stay below the ceiling. Challenge that same saved
    // lease with an explicit over-ceiling renewal request; do not count the
    // ordinary run as a binding cap when it did not bind.
    const lease = leases[0]!;
    const previous = resourceFlowTermsAt(world, lease.flow.id)!;
    const law = housingLawYes(
      world,
      town,
      RENT_LAW_KEYS.rentStabilization,
      world.currentDate,
    )!;
    const capTerm = readFinalEnactedLawTerm(world, law, {
      questionKey: RENT_LAW_KEYS.rentStabilization,
      termKey: "cap",
      unit: "ratio",
    })!;
    const offset = readFinalEnactedLawTerm(world, law, {
      questionKey: RENT_LAW_KEYS.rentStabilization,
      termKey: "cap-inflation-offset",
      unit: "ratio",
    })!;
    const inflation =
      rentPriceLevel(world, town, world.currentDate) /
        rentPriceLevel(world, town, addDays(world.currentDate, -365)) -
      1;
    const cap = Math.min(capTerm.value, offset.value + inflation);
    expect(cap).toBeGreaterThan(0);
    // Continue within the existing monthly harness integrity boundary: it
    // deliberately advances town pay/rent without the full due-item clock.
    withWorldIntegrityDeferred(() => {
      const requested = recordResourceFlowTerms(world, {
        stableKey: `${lease.flow.stableKey}:controlled-over-ceiling-renewal`,
        resourceFlowId: lease.flow.id,
        effectiveAt: world.currentDate,
        status: "active",
        amount: money(
          Math.ceil(previous.amount.minorUnits * (1 + 2 * cap)),
          previous.amount.currency,
        ),
        cadenceKind: previous.cadenceKind,
        reason:
          "Explicit test request above the sourced ceiling on the actual saved lease.",
        provenance: {
          kind: "authored",
          note: "Controlled renewal challenge; ordinary market result reported separately.",
        },
        supersedesTermsId: previous.id,
      });
      const result = applyLawConsequences(requested, {
        activity: "renewal",
        activityId: requested.history.resourceFlowTerms.at(-1)!.id,
        subjectIds: [lease.leaseholderId],
        onDate: world.currentDate,
        questionKey: RENT_LAW_KEYS.rentStabilization,
      });
      const actual = resourceFlowTermsAt(result, lease.flow.id)!;
      expect(actual.amount.minorUnits).toBe(
        Math.floor(previous.amount.minorUnits * (1 + cap)),
      );
      expect(actual.lawEffectStamps?.[0]?.effectKind).toBe("price-cost");
      const built = createDwelling(result, {
        stableKey: "a57-controlled:in-play-construction",
        establishedAt: result.currentDate,
        jurisdictionId: town,
        locationLabel: "Recorded in-play dwelling for exemption boundary",
        classification: "residential:apartment",
        provenance: {
          kind: "authored",
          note: "Test construction at the actual current simulation date.",
        },
      });
      const newHome = built.history.dwellings.at(-1)!;
      const exemption = readFinalEnactedLawTerm(built, law, {
        questionKey: RENT_LAW_KEYS.rentStabilization,
        termKey: "new-construction-exemption-years",
        unit: "years",
      });
      expect(
        rentConstructionCovered(
          built,
          newHome,
          built.currentDate,
          exemption?.value ?? null,
        ),
      ).toBe(false);
      if (exemption) {
        const boundary = dateAtAge(newHome.establishedAt, exemption.value);
        expect(
          rentConstructionCovered(built, newHome, boundary, exemption.value),
        ).toBe(false);
        expect(
          rentConstructionCovered(
            built,
            newHome,
            addDays(boundary, 1),
            exemption.value,
          ),
        ).toBe(true);
        process.stdout.write(
          `A57 construction boundary: recorded=${newHome.establishedAt}; sourcedYears=${exemption.value}; exemptThrough=${boundary}; coveredAfter=${addDays(boundary, 1)}\n`,
        );
      }
      process.stdout.write(
        `A57 controlled saved-lease renewal: requested=${requested.history.resourceFlowTerms.at(-1)!.amount.minorUnits}; applied=${actual.amount.minorUnits}; prior=${previous.amount.minorUnits}; sourcedCapRatio=${cap}; source=${law.measureId}\n`,
      );
    });
    for (const terms of capped) {
      const requested = world.history.resourceFlowTerms.find(
        (row) => row.id === terms.supersedesTermsId,
      )!;
      expect(terms.amount.minorUnits).toBeLessThan(requested.amount.minorUnits);
      expect(terms.lawEffectStamps![0]!.sourceRecordIds.length).toBeGreaterThan(
        0,
      );
    }
  });

  it("Portland: rent stabilization in force at the start covers private leases", () => {
    const { world, town } = liveMonths("4159000", "town-rent-portland", 2);
    const leases = townLeases(world).filter(
      (lease) => lease.town === town && !lease.ended,
    );
    expect(leases.length).toBeGreaterThan(0);
    const privateLease = leases.find(
      (lease) =>
        lease.regime === "market" &&
        !(
          lease.flow.recipient.kind === "organization" &&
          organizationProfileAt(world, lease.flow.recipient.organizationId)
            ?.classification === "service:public-housing"
        ),
    )!;
    expect(privateLease).toBeDefined();
    expect(
      housingLawYes(
        world,
        town,
        RENT_LAW_KEYS.rentStabilization,
        world.currentDate,
      ),
    ).not.toBeNull();
    // Chicago began with no rent stabilization.
    const chicago = liveMonths("1714000", "town-rent-chicago-moves", 2);
    expect(
      housingLawYes(
        chicago.world,
        chicago.town,
        RENT_LAW_KEYS.rentStabilization,
        chicago.world.currentDate,
      ),
    ).toBeNull();
  });

  it("A52 retained nonhousing bills stay separate from actual household rent", () => {
    // Several openings, so both a renting and an owning player household are
    // seen; each one's month follows its own home.
    const seen = new Set<string>();
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const { world, player } = liveMonths(
        "1714000",
        `town-rent-month-${seed}`,
        2,
      );
      // The player's money is tracked from the opening on.
      const settled = withWorldIntegrityDeferred(() =>
        settleLivingCosts(
          ensureLifePathPersonalPosition(
            world,
            player,
            money(0, "USD").currency,
          ),
          player,
        ),
      );
      const flow = livingCostsFlowFor(settled, player);
      expect(flow, seed).not.toBeNull();
      if (!flow) continue;
      const household = householdMembershipsAt(settled, player).find(
        (entry) => entry.state.residenceRole === "primary",
      )?.household.id;
      const leased = townLeases(settled).some(
        (lease) => !lease.ended && lease.householdId === household,
      );
      const monthly = resourceFlowTermsAt(settled, flow.id)!.amount.minorUnits;
      // Chicago: independently rounded 2024 CES Midwest retained categories.
      expect(monthly, seed).toBe(79_125);
      seen.add(leased ? "leased" : "not leased");
    }
    expect(seen.has("leased")).toBe(true);
  });
});
