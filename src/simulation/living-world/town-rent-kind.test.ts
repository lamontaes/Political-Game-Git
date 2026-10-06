import { writeFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../../tests/fixtures/enact-through-desk";
import { governorOfficeForJurisdiction } from "../governing/state-governing";
import { addDays, makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { createHousehold, startHouseholdMembership } from "../life";
import { lifePlaceByKey } from "../life-places";
import { introduceMeasure } from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import {
  legislativeProcedureForJurisdiction,
  legislativeRulePackForWorld,
} from "../legislative-procedure-world";
import {
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../legislation-scenarios";
import { seatsForChamber } from "../legislature-game-profile";
import {
  createDwelling,
  createHousingTenure,
  createResourceFlow,
  recordResourceFlowTerms,
  money,
} from "../resources";
import { resourceFlowTermsAt } from "../resource-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import { resolveFutureDueItemsThrough } from "../future-transitions";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { SeededRng } from "../rng";
import { personName } from "../people";
import { personTrait } from "../people-traits";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import {
  hudRentRowFor,
  startTownLeases,
  renewTownLeases,
  townLeases,
  RENT_LAW_KEYS,
} from "./town-rent";
import type { EntityId, World } from "../types";

// Controlled price path, not an admitted population measurement.
vi.mock("./housing-market", () => ({
  homePriceLevel: (_world: World, _town: EntityId, date: string) =>
    date >= "2027-01-01" ? 1.4 : 1,
}));
const seed = "session21-price-kind-canonical-save";
const provenance = {
  kind: "authored",
  note: "Controlled recorded rental ownership and tenant fixture.",
} as const;

function atDate(world: World, date: string): World {
  const day = makeIsoDate(date);
  return {
    ...world,
    currentDate: day,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
  };
}

function enactRentLaw(
  world: World,
  jurisdictionId: EntityId,
  questionKey: string,
): World {
  const profile = legislativeProcedureForJurisdiction(world, jurisdictionId)!;
  const pack = legislativeRulePackForWorld(world, profile.baselinePack.packId);
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!;
  world = introduceMeasure(world, {
    stableKey: `rent-kind:${questionKey}`,
    jurisdictionId,
    rulePackId: pack.packId,
    designation: "Controlled Rent Act",
    shortTitle: "Controlled rental law fixture",
    summary: "Authored mechanism proof, not current legal values.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: world.personOrder[0]!,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  if (questionKey === RENT_LAW_KEYS.inclusionary) {
    world = recordFiledProvision(world, {
      stableKey: "rent-kind:inclusionary-terms",
      measureId,
      provisionKey: "controlled-share",
      sectionNumber: 1,
      heading: "Controlled fixture set-aside",
      text: "All eligible newly built fixture homes are set aside. Not a researched law value.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "eligible fixture rental homes",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
      lawTerms: [{ questionKey, key: "share", value: 1, unit: "ratio" }],
    });
  }
  if (questionKey === RENT_LAW_KEYS.rentStabilization) {
    world = recordFiledProvision(world, {
      stableKey: "rent-kind:cap-terms",
      measureId,
      provisionKey: "controlled-cap",
      sectionNumber: 1,
      heading: "Controlled rent cap",
      text: "This fixture caps the covered market house renewal at five percent. Not a researched law value.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "covered fixture market houses",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
      lawTerms: [{ questionKey, key: "cap", value: 0.05, unit: "ratio" }],
      lawCategories: [
        { questionKey, key: "coverage", values: ["market:residential:house"] },
      ],
    });
  }
  const bodies = pack.chambers.map((chamber) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      seatsForChamber(pack, chamber.chamberKey)!.seats,
      [],
      pack.structure === "unicameral",
    ),
  );
  const votePlan: Record<string, { yea: number }> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find(
      (entry) => entry.chamberKey === chamber.chamberKey,
    )!;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: Math.min(body.members.length, committee.appointedMembers),
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  return enactThroughDesk(world, measureId, {
    context: {
      pack,
      measureId,
      bodies,
      committeeMemberCount: null,
      votePlan,
      governorAction: "signed",
      governorRationale:
        "Controlled fixture carries its actual bill to the executive desk.",
    },
  });
}

function addHome(
  world: World,
  tenant: EntityId,
  owner: EntityId,
  town: EntityId,
  key: string,
  establishedAt: string,
  classification = "residential:house",
): { world: World; tenureId: EntityId } {
  world = createHousehold(world, {
    stableKey: `${key}:household`,
    formedAt: world.currentDate,
    label: "Controlled rental household",
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = startHouseholdMembership(world, {
    stableKey: `${key}:member`,
    personId: tenant,
    householdId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:fixture",
    provenance,
  });
  world = createDwelling(world, {
    stableKey: `${key}:home`,
    establishedAt: makeIsoDate(establishedAt),
    jurisdictionId: town,
    locationLabel: "Controlled rental home",
    classification,
    provenance,
  });
  const dwellingId = world.history.dwellings.at(-1)!.id;
  world = createHousingTenure(world, {
    stableKey: `${key}:tenant`,
    holder: { kind: "household", householdId },
    dwellingId,
    startedAt: world.currentDate,
    kind: "lease:rented",
    context: null,
    provenance,
  });
  const tenureId = world.history.housingTenures.at(-1)!.id;
  world = createHousingTenure(world, {
    stableKey: `${key}:owner`,
    holder: { kind: "person", personId: owner },
    dwellingId,
    startedAt: world.currentDate,
    kind: "ownership:owned",
    context: null,
    provenance,
  });
  return { world, tenureId };
}

it("saves all three actual rent writer stamps and historical labels without changing lease identities", () => {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [key, count] = pair.split(":") as [string, string];
    const place = lifePlaceByKey(key);
    if (
      !place?.stateJurisdictionKey ||
      !hudRentRowFor(place.context.jurisdiction.id)
    )
      continue;
    if ((largest.get(place.stateJurisdictionKey)?.[1] ?? -1) < Number(count))
      largest.set(place.stateJurisdictionKey, [key, Number(count)]);
  }
  const placeKey = new SeededRng(seed).pick([...largest.values()])[0];
  const fixture = smallWorld({
    place: placeKey,
    seed,
    date: "2026-01-05",
    people: 40,
    offices: ["governor", "state-legislature"],
  });
  let world = fixture.world;
  const governor = governorOfficeForJurisdiction(
    world,
    `US-${fixture.stateUsps}`,
  )!;
  // Existing player-required governing work belongs to the seated governor.
  world = {
    ...world,
    control: { kind: "person", personId: governor.holderPersonId },
  };
  const tenants = world.personOrder
    .filter((id) => personTrait(world, id, "reliability").value >= 0)
    .slice(0, 2);
  expect(tenants).toHaveLength(2);
  const owner = world.personOrder.find((id) => !tenants.includes(id))!;
  world = enactRentLaw(
    world,
    fixture.stateJurisdictionId,
    RENT_LAW_KEYS.rentStabilization,
  );
  world = enactRentLaw(
    world,
    fixture.stateJurisdictionId,
    RENT_LAW_KEYS.inclusionary,
  );
  const marketHome = addHome(
    world,
    tenants[0]!,
    owner,
    fixture.jurisdictionId,
    "rent-kind:market",
    "2026-01-01",
  );
  world = startTownLeases(marketHome.world, marketHome.world.currentDate);
  const marketLease = townLeases(world).find(
    (row) => row.tenureId === marketHome.tenureId,
  )!;
  expect(marketLease.regime).toBe("market");
  world = atDate(world, addDays(world.currentDate, 1));
  const affordableHome = addHome(
    world,
    tenants[1]!,
    owner,
    fixture.jurisdictionId,
    "rent-kind:affordable",
    world.currentDate,
    "residential:apartment",
  );
  world = createResourceFlow(affordableHome.world, {
    stableKey: "rent-kind:controlled-income",
    source: { kind: "person", personId: owner },
    recipient: { kind: "person", personId: tenants[1]! },
    startsAt: world.currentDate,
    amount: money(10000, "USD"),
    cadenceKind: "schedule:monthly",
    basisKind: "compensation:work",
    basisReference: {
      kind: "housing",
      housingTenureId: affordableHome.tenureId,
    },
    restrictionKind: null,
    jurisdictionId: fixture.jurisdictionId,
    provenance,
  });
  world = startTownLeases(world, world.currentDate);
  const affordableLease = townLeases(world).find(
    (row) => row.tenureId === affordableHome.tenureId,
  )!;
  expect(affordableLease.regime).toBe("affordable");
  const initialAffordable = world.history.resourceFlowTerms.find(
    (row) => row.resourceFlowId === affordableLease.flow.id,
  )!;
  expect(initialAffordable.lawEffectStamps?.[0]?.effectKind).toBe("price-cost");
  // Controlled prior affordable terms make the existing reset observable.
  world = recordResourceFlowTerms(world, {
    stableKey: "rent-kind:prior-affordable-terms",
    resourceFlowId: affordableLease.flow.id,
    effectiveAt: world.currentDate,
    status: "active",
    amount: money(Math.round(initialAffordable.amount.minorUnits * 0.9), "USD"),
    cadenceKind: initialAffordable.cadenceKind,
    reason: "Controlled prior affordable price",
    provenance,
    supersedesTermsId: initialAffordable.id,
  });
  // Process every authoritative due item through the controlled anniversary;
  // this is a focused writer fixture, not a timed game-year simulation.
  world = resolveFutureDueItemsThrough(
    world,
    addDays(world.currentDate, 366),
    createCampaignElectionTransitionRegistry(),
  );
  world = renewTownLeases(world, world.currentDate);
  // Native renewal dispatch reads the actual adopted cap and coverage clause.
  // The old rent writer's numeric-cap branch is unreachable without a cap input.
  const marketRequested = world.history.resourceFlowTerms.find(
    (row) => row.stableKey === `${marketLease.flow.stableKey}:renewal:1`,
  )!;
  const marketRenewal = resourceFlowTermsAt(world, marketLease.flow.id)!;
  expect(marketRenewal.amount.minorUnits).toBeLessThan(
    marketRequested.amount.minorUnits,
  );
  const affordableRenewal = world.history.resourceFlowTerms.find(
    (row) => row.stableKey === `${affordableLease.flow.stableKey}:renewal:1`,
  )!;
  for (const terms of [marketRenewal, affordableRenewal])
    expect(terms.lawEffectStamps?.[0]?.effectKind).toBe("price-cost");
  const loaded = deserializeWorld(serializeWorld(world));
  for (const terms of [initialAffordable, marketRenewal, affordableRenewal])
    expect(
      loaded.history.resourceFlowTerms.find((row) => row.id === terms.id),
    ).toEqual(terms);
  const legacy = {
    ...loaded,
    history: {
      ...loaded.history,
      resourceFlowTerms: loaded.history.resourceFlowTerms.map((terms) =>
        [initialAffordable.id, marketRenewal.id, affordableRenewal.id].includes(
          terms.id,
        )
          ? {
              ...terms,
              lawEffectStamps: terms.lawEffectStamps!.map((stamp) => ({
                ...stamp,
                effectKind:
                  terms.id === marketRenewal.id
                    ? "rent-stabilization-renewal"
                    : "inclusionary-affordable-rent",
              })),
            }
          : terms,
      ),
    },
  };
  const legacyLoaded = deserializeWorld(serializeWorld(legacy));
  for (const terms of legacy.history.resourceFlowTerms)
    expect(
      legacyLoaded.history.resourceFlowTerms.find((row) => row.id === terms.id),
    ).toEqual(terms);
  expect(
    renewTownLeases(legacyLoaded, legacyLoaded.currentDate).history
      .resourceFlowTerms,
  ).toEqual(legacyLoaded.history.resourceFlowTerms);
  expect(
    townLeases(legacyLoaded).map((row) => [
      row.flow.id,
      row.tenureId,
      row.dwellingId,
      row.leaseholderId,
    ]),
  ).toEqual(
    townLeases(world).map((row) => [
      row.flow.id,
      row.tenureId,
      row.dwellingId,
      row.leaseholderId,
    ]),
  );
  if (process.env.SESSION21_RENT_PROOF)
    writeFileSync(
      process.env.SESSION21_RENT_PROOF,
      JSON.stringify(
        {
          seed,
          placeKey,
          state: fixture.stateUsps,
          eligibleHudPlaces: largest.size,
          scope:
            "Controlled canonical enacted laws, ownership, income and price path; no natural opening or year performance claim.",
          tenant: personName(world.people[tenants[0]!]!),
          affordableTenant: personName(world.people[tenants[1]!]!),
          landlord: personName(world.people[owner]!),
          initialAffordable,
          marketRequested,
          marketRenewal,
          affordableRenewal,
          canonicalReload: true,
          historicalReload: true,
          repeatedRenewalIdempotent: true,
        },
        null,
        2,
      ),
    );
});
