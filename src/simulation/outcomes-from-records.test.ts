import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import birthRules from "../../data/research/birth-citizenship-rules.json" with { type: "json" };
import cohortReference from "../../data/research/starting-cohorts.json" with { type: "json" };
import { cohortCategoryAt } from "./cohort-allocation";
import {
  estimatedEmployerPayPractice,
  employerBiweeklyPhase,
} from "./employer-pay-practice";
import { addDays, makeIsoDate } from "./dates";
import { searchLifePlaces } from "./life-places";
import { createStartingPerson, materializePersonRecord } from "./people";
import { createWorldId } from "./world";
import { initializePersonCitizenship } from "./citizenship-creation";
import { townPayPeriod, payPeriodEndingOn } from "./living-world/town-pay";
import {
  createHousehold,
  createOrganization,
  recordHouseholdLocation,
  recordOrganizationProfile,
  startHouseholdMembership,
} from "./life";
import { createDwelling, startDwellingOccupancy } from "./resources";
import { declareHazardEpisode } from "./crisis/disaster";
import { crisisRecords } from "./crisis/records";
import { sameGenderSeekers } from "./living-world/town-families";
import { organizationProfileAt } from "./life-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  JURY_PANEL_ESTIMATE,
  empanelJury,
  juryPool,
} from "./justice/court-reasoning";
import {
  PHYSICAL_DISASTER_REFERENCE,
  estimatedPhysicalConditions,
  estimatedAssetProtection,
  physicalDamage,
  physicalInjury,
} from "./crisis/disaster-mechanism";
import {
  medianRepresentedRate,
  hazardsForRepresentedAreas,
} from "./crisis/hazard-producer";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  ensureCentralBankSeated,
  recordedInflationLean,
} from "./macro-economy/central-bank";
import { ensureMacroEconomyStarted } from "./macro-economy/producer";
import { startValuesFromLatents } from "./macro-economy/kernel";
import { CRUNCH46_PROVISIONAL_POLICY } from "./macro-economy/policy";
import { drawStartingRegime } from "./world-setup/conditions";
import { cohortCategoryPosition } from "./cohort-allocation";

const seed = "P2-a-source-mechanisms-56";
const places = Object.keys(birthRules.places).sort();
const date = makeIsoDate("2026-01-05");

describe("one recorded mechanism in all 56 places", () => {
  it.each(places)(
    "uses actual birth law and sourced estimates in %s",
    (state) => {
      const town = searchLifePlaces("", 100000, {
        stateJurisdictionKey: state,
      }).find((row) => row.scope === "locality")!;
      expect(town).toBeDefined();
      const person = createStartingPerson({
        worldId: createWorldId(seed),
        worldSeed: seed,
        currentDate: date,
        age: 22,
        homeJurisdictionId: town.context.jurisdiction.id,
      });
      const law = birthRules.places[state as keyof typeof birthRules.places];
      expect(person.citizenshipStatuses![0]!.status).toBe(law.nativeStatus);
      expect(person.citizenshipStatuses![0]!.provenance.note).toBe(law.source);
      expect(person.citizenshipStatuses![0]!.provenance.method).toBe(
        "birth-law",
      );
      const practice = estimatedEmployerPayPractice(
        "enterprise:construction",
        date,
        8,
      );
      expect(practice.period).toBe("weekly");
      expect(practice.estimatedFrom).toContain("BLS");
      expect(
        payPeriodEndingOn(
          practice.period,
          practice.firstPayday,
          employerBiweeklyPhase(practice),
        ),
      ).not.toBeNull();
      const reference =
        PHYSICAL_DISASTER_REFERENCE.places[
          state as keyof typeof PHYSICAL_DISASTER_REFERENCE.places
        ];
      expect(reference.estimatedFrom).toContain("FEMA");
      const protection = estimatedAssetProtection(person.id);
      const conditions = estimatedPhysicalConditions("flood", "major");
      const unprotected = physicalDamage("flood", conditions, protection);
      const raised = physicalDamage("flood", conditions, {
        ...protection,
        occupiedFloorFeet: conditions.floodDepthFeet,
      });
      expect(unprotected.level).toBe("damaged");
      expect(raised.level).toBeNull();
      expect(
        physicalDamage("flood", conditions, protection, 0.5).load,
      ).toBeLessThan(unprotected.load);
      expect(
        physicalInjury("flood", unprotected.load, "incapacitated", 22, true),
      ).toBe("fatal");
      expect(
        physicalInjury("flood", unprotected.load, "incapacitated", 22, false),
      ).toBeNull();
      expect(
        physicalInjury("flood", unprotected.load, "capable", 22, true),
      ).toBeNull();
      expect(JURY_PANEL_ESTIMATE.estimatedFrom).toContain("1861");
      const hazards = hazardsForRepresentedAreas(
        [
          {
            jurisdictionId: town.context.jurisdiction.id,
            stateUsps: state.slice(3),
          },
        ],
        date,
      );
      expect(hazards).toEqual(
        hazardsForRepresentedAreas(
          [
            {
              jurisdictionId: town.context.jurisdiction.id,
              stateUsps: state.slice(3),
            },
          ],
          date,
        ),
      );
      for (const hazard of hazards)
        expect(hazard.recordedEpisodeId).not.toBe("");
    },
  );

  it("allocates published cohort totals rather than independently rolling people", () => {
    const counts = new Map<string, number>();
    for (let ordinal = 0; ordinal < 100; ordinal++) {
      const kind = cohortCategoryAt(
        [
          ["one", 0.4],
          ["two", 0.4],
          ["three", 0.2],
        ],
        100,
        ordinal,
      );
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    expect(Object.fromEntries(counts)).toEqual({ one: 40, two: 40, three: 20 });
    expect(
      cohortCategoryPosition(
        [
          ["one", 0.4],
          ["two", 0.6],
        ],
        100,
        40,
      ),
    ).toEqual({ category: "two", categoryPopulation: 60, categoryOrdinal: 0 });
    expect(() => cohortCategoryAt([["one", 1]], 1, 1)).toThrow();
    expect(medianRepresentedRate("flood", 1)).toBeGreaterThanOrEqual(0);
    expect(cohortReference.estimatedFrom).toContain("Census");
  });

  it("does not turn an undocumented parent's citizenship into transmission", () => {
    const nationalState = places.find(
      (key) =>
        birthRules.places[key as keyof typeof birthRules.places]
          .nativeStatus === "noncitizen-national",
    )!;
    const town = searchLifePlaces("", 100000, {
      stateJurisdictionKey: nationalState,
    }).find((row) => row.scope === "locality")!;
    const citizenState = places.find(
      (key) =>
        birthRules.places[key as keyof typeof birthRules.places]
          .nativeStatus === "citizen-by-birth",
    )!;
    const citizenTown = searchLifePlaces("", 100000, {
      stateJurisdictionKey: citizenState,
    }).find((row) => row.scope === "locality")!;
    const parent = createStartingPerson({
      worldId: createWorldId(seed),
      worldSeed: seed,
      currentDate: date,
      age: 55,
      homeJurisdictionId: citizenTown.context.jurisdiction.id,
    });
    const child = createStartingPerson({
      worldId: createWorldId(seed),
      worldSeed: seed,
      currentDate: date,
      age: 22,
      homeJurisdictionId: town.context.jurisdiction.id,
    });
    const { citizenshipStatuses, ...unassigned } = child;
    expect(citizenshipStatuses![0]!.status).toBe("noncitizen-national");
    expect(
      initializePersonCitizenship(unassigned, seed, date, [
        { person: parent, transmissionEligibilityRecorded: false },
      ]).citizenshipStatuses![0]!.status,
    ).toBe("noncitizen-national");
    const recorded = initializePersonCitizenship(unassigned, seed, date, [
      { person: parent, transmissionEligibilityRecorded: true },
    ]).citizenshipStatuses![0]!;
    expect(recorded.status).toBe("citizen-by-birth");
    expect(recorded.provenance.sourceEntityIds).toContain(parent.id);
  });
});

describe("canonical recorded consumers", () => {
  const place = drawRandomPlace(seed);
  const f = smallWorld({ place: place.key, seed, date, people: 20 });
  it("reads the opening regime and central-bank views from records", () => {
    expect(drawStartingRegime(f.world)).toBe(
      drawStartingRegime({ ...f.world, seed: "other-identity-seed" }),
    );
    const latents = { cycle: 0, cost: 0, housing: 0, credit: 0 };
    const world = ensureCentralBankSeated(
      ensureMacroEconomyStarted(f.world, {
        contractVersion: "crunch46-macro-start/v1",
        policyVersion: "crunch46-provisional-v1",
        regime: "near-reference",
        volatilityScale:
          CRUNCH46_PROVISIONAL_POLICY.volatilityScale["near-reference"],
        latents,
        initial: startValuesFromLatents("near-reference", latents),
        effectiveDate: date,
      }),
    );
    const bank = world.macroEconomy!.centralBank!;
    for (const seat of bank.seats) {
      expect(seat).not.toBeNull();
      expect(seat!.inflationLean).toBe(
        recordedInflationLean(world, seat!.personId),
      );
      expect(
        recordedInflationLean({ ...world, seed: "other" }, seat!.personId),
      ).toBe(seat!.inflationLean);
    }
    const restored = deserializeWorld(serializeWorld(world));
    expect(restored.macroEconomy!.centralBank!.chair).toEqual(bank.chair);
  });
  it("reads a saved partner preference without reallocating it", () => {
    const person = f.world.people[f.personId]!;
    const world = {
      ...f.world,
      people: {
        ...f.world.people,
        [person.id]: {
          ...person,
          identity: {
            ...person.identity!,
            partnerPreference: {
              kind: "same-gender" as const,
              estimatedFrom: cohortReference.partnerPreferenceSource,
            },
          },
        },
      },
    };
    expect(sameGenderSeekers(world, Object.values(world.people))).toContain(
      person.id,
    );
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(
      sameGenderSeekers(reloaded, [reloaded.people[person.id]!]),
    ).toContain(person.id);
    expect(
      sameGenderSeekers(
        { ...reloaded, seed: "other-identity-seed" },
        Object.values(reloaded.people),
      ),
    ).toEqual(sameGenderSeekers(world, Object.values(world.people)));
  });

  it("writes one physical home result, actual casualties and saved protection", () => {
    const provenance = { kind: "authored" as const, note: "Physical fixture" };
    let world = createHousehold(f.world, {
      stableKey: "P2-a:home",
      formedAt: date,
      label: "Fixture household",
      provenance,
    });
    const householdId = world.history.households.at(-1)!.id;
    world = recordHouseholdLocation(world, {
      stableKey: "P2-a:home:location",
      householdId,
      effectiveAt: date,
      jurisdictionId: f.jurisdictionId,
      label: "Fixture home",
      kind: "residence:fixture",
      supersedesLocationId: null,
      provenance,
    });
    const present = world.personOrder[1]!;
    for (const personId of [f.personId, present])
      world = startHouseholdMembership(world, {
        stableKey: `P2-a:home:${personId}`,
        householdId,
        personId,
        startedAt: date,
        residenceRole: "primary",
        kind: "resident:member",
        provenance,
      });
    world = createDwelling(world, {
      stableKey: "P2-a:dwelling",
      establishedAt: date,
      jurisdictionId: f.jurisdictionId,
      locationLabel: "Fixture dwelling",
      classification: "residential:fixture",
      provenance,
    });
    const dwellingId = world.history.dwellings.at(-1)!.id;
    world = startDwellingOccupancy(world, {
      stableKey: "P2-a:occupancy",
      dwellingId,
      occupant: { kind: "household", householdId },
      startedAt: date,
      residenceRole: "primary",
      kind: "residence:fixture",
      provenance,
    });
    const conditions = estimatedPhysicalConditions("flood", "catastrophic");
    const protection = {
      ...estimatedAssetProtection(dwellingId),
      estimatedFrom: null,
    };
    const input = {
      stableKey: "P2-a:physical-flood",
      family: "flood" as const,
      magnitude: "catastrophic" as const,
      jurisdictionIds: [f.jurisdictionId],
      stateUsps: f.stateUsps,
      durationDays: 2,
      basis: "P2-a:physical-observation",
      sourceReference: "P2-a:physical-observation",
      physicalConditions: conditions,
      evacuatedPersonIds: [f.personId],
    };
    const struck = declareHazardEpisode(world, {
      ...input,
      assetProtections: [protection],
    });
    const restored = deserializeWorld(serializeWorld(struck));
    const damage = crisisRecords(restored).filter(
      (row) => row.kind === "disaster-damage",
    );
    expect(damage.find((row) => row.targetId === householdId)?.level).toBe(
      damage.find((row) => row.targetId === dwellingId)?.level,
    );
    expect(
      damage.find((row) => row.targetId === dwellingId)?.physicalLoad,
    ).toBe(conditions.floodDepthFeet - protection.occupiedFloorFeet);
    expect(restored.history.personDeaths.map((row) => row.personId)).toContain(
      present,
    );
    expect(
      restored.history.personDeaths.map((row) => row.personId),
    ).not.toContain(f.personId);
    const raised = declareHazardEpisode(world, {
      ...input,
      assetProtections: [
        { ...protection, occupiedFloorFeet: conditions.floodDepthFeet },
      ],
    });
    expect(
      crisisRecords(raised).filter((row) => row.kind === "disaster-damage"),
    ).toHaveLength(0);
    expect(raised.history.personDeaths).toHaveLength(0);
  });
  it("retains an employer calendar through a profile change and reload", () => {
    const practice = {
      ...estimatedEmployerPayPractice("enterprise:construction", date),
      period: "monthly" as const,
      estimatedFrom: null,
    };
    let world = createOrganization(f.world, {
      stableKey: "P2-a:employer",
      formedAt: date,
      provenance: { kind: "authored", note: "Recorded payroll fixture" },
      initialProfile: {
        name: "Fixture employer",
        classification: "enterprise:construction",
        locationJurisdictionId: f.jurisdictionId,
        payPractice: practice,
      },
    });
    const organization = world.history.organizations.at(-1)!;
    const profile = organizationProfileAt(world, organization.id)!;
    world = recordOrganizationProfile(world, {
      stableKey: "P2-a:employer:rename",
      organizationId: organization.id,
      effectiveAt: date,
      name: profile.name,
      classification: profile.classification,
      locationJurisdictionId: f.jurisdictionId,
      provenance: profile.provenance,
      supersedesProfileId: profile.id,
    });
    const restored = deserializeWorld(serializeWorld(world));
    expect(
      organizationProfileAt(restored, organization.id)!.payPractice,
    ).toEqual(practice);
    expect(
      townPayPeriod(restored, organization.id, "enterprise:construction", 8),
    ).toBe("monthly");
    expect(
      employerBiweeklyPhase(
        estimatedEmployerPayPractice(
          "sector:local-government-office",
          addDays(date, 7),
        ),
      ),
    ).not.toBe(
      employerBiweeklyPhase(
        estimatedEmployerPayPractice("sector:local-government-office", date),
      ),
    );
  });
  it("reads the recorded venire and excusals instead of the world's seed", () => {
    const courtCase = {
      caseKey: "P2-a:case",
      defendantId: f.world.personOrder[1]!,
      offenseKey: "crime:robbery",
      offenseLabel: "robbery",
      evidence: "documentary" as const,
      standingFindings: 1,
      venueJurisdictionId: f.jurisdictionId,
      stateKey: place.stateJurisdictionKey,
    };
    const pool = juryPool(f.world, courtCase);
    expect(pool.length).toBeGreaterThanOrEqual(JURY_PANEL_ESTIMATE.size);
    const venire = [...pool].reverse();
    const chosenCase = {
      ...courtCase,
      jurySelection: {
        venirePersonIds: venire,
        excusedPersonIds: [venire[0]!],
        peremptoryChallenges: [],
      },
    };
    const panel = empanelJury(f.world, chosenCase, 1);
    expect(panel).toEqual(venire.slice(1, JURY_PANEL_ESTIMATE.size + 1));
    expect(
      empanelJury(
        { ...f.world, seed: "different-identity-seed" },
        chosenCase,
        1,
      ),
    ).toEqual(panel);
    const record = materializePersonRecord(
      f.world.people[f.world.personOrder[1]!]!,
      seed,
      date,
      [],
      {},
      1,
    );
    expect(
      materializePersonRecord(
        f.world.people[f.world.personOrder[1]!]!,
        "other-seed",
        date,
        [],
        {},
        1,
      ),
    ).toEqual(record);
  });
});
