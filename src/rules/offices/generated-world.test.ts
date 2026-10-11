import { createCharacterHistoryContextPerson } from "../../simulation/character-history";
import { createWorkRelationship } from "../../simulation/life";
import {
  initializeOfficeSalaryFlows,
  settleOfficeSalaries,
} from "../../simulation/office-salary";
import { officePayInForce, paidOfficeOf } from "../../simulation/office-pay";
import { resourceFlowTermsHistory } from "../../simulation/resource-queries";
import { workStatusAt, workRoleAt } from "../../simulation/life-queries";
import { weeklyHoursOf } from "../../simulation/living-world/town-pay";
import { annualPay, weeklyMinor, dueOfficePeriods } from "./salary";
import { advanceWorld, createWorld } from "../../simulation/world";
import type { SettledQualification } from "./settled-qualifications";
import {
  createOrganization,
  recordHouseholdLocation,
} from "../../simulation/life";
import { LIVING_WORLD_KEYS } from "../../simulation/living-world/opening";
import { LIVING_WORLD_WRITER_VERSION } from "../../simulation/living-world/opening";
import { stateCandidacyPack } from "../../simulation/candidacy-packs";
import { candidateQualificationRuleSet } from "../../simulation/candidate-qualification";
import {
  OFFICE_QUALIFICATIONS_META,
  officeFamilyForChamberKey,
  officeQualifications,
} from "../../simulation/office-qualification-rules";
import { LEGISLATIVE_RULE_PACKS } from "../../simulation/legislature-rule-packs";
import {
  standInQualification,
  standInQualificationSourceRef,
} from "../../simulation/office-qualification-profile";
import { settledQualification as legacySettled } from "../../simulation/settled-qualifications";
import {
  compiledQualificationForOffice,
  officeQualification,
  type CompiledQualificationFacts,
} from "./compiled-qualification";
import { settledQualification as newSettled } from "./settled-qualifications";
import { researchRuleTable } from "../../simulation/research-rule-tables";
import * as legacyDelegates from "../../simulation/living-world/house-delegates";
import { houseDelegateOccupant } from "./delegate-occupant";
import { houseDelegateTermWindow } from "./delegate-terms";
import { personName } from "../../simulation/people";
import { SeededRng } from "../../simulation/rng";
import { seatHouseDelegates } from "./office-plans";
import * as legacyTransition from "../../simulation/office-transition";
import * as transition from "./transition";
import { placeLocalGovernmentUnits as legacyLocalUnits } from "../../simulation/nationwide-world/local-governments";
import { townshipGovernmentUnitsForPlace } from "../../simulation/nationwide-world/township-governing-body-rules";
import { municipiosForPlace } from "../../simulation/nationwide-world/county-governing-body-rules";
import { placeLocalGovernmentUnits } from "./local-units";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate, addDays } from "../../simulation/dates";
import { factsForPerson } from "../../simulation/people";
import {
  householdMembershipsAt,
  householdMembershipStateHistory,
  householdLocationHistory,
  currentLifeCutoff,
  activeWorkRelationshipsAt,
} from "../../simulation/life-queries";
import * as residence from "../../simulation/nationwide-world/residence-duration";
import * as districts from "../../simulation/district-residence";
import { resolveDistrictBinding } from "../../districts/query";
import { districtIdentityCatalog } from "../../districts/catalog";
import * as units from "../../simulation/government-units";
import { PLACE_COUNTY_RELATIONS_ROWS } from "../../simulation/place-county-relations.generated";
import * as legacyWards from "../../simulation/living-world/town-wards";
import { townRoster } from "../../simulation/living-world/town-residents";
import { placePopulation } from "../../simulation/nationwide-world/place-population";
import { placeReferencePopulation } from "../../simulation/nationwide-world/place-population";
import { municipalGovernmentForUnit } from "../../simulation/rule-capability-resolver";
import { primaryReading } from "../../simulation/municipal-government";
import { localGoverningBodyIdentity } from "../../simulation/nationwide-world/local-governing-body-candidacy-packs";
import { localGoverningBodyRules } from "../../simulation/nationwide-world/local-governing-body-rules";
import * as legacyChief from "../../simulation/nationwide-world/local-chief-executive-rules";
import * as calendar from "../../simulation/nationwide-world/state-executive-term-rules";
import { stateExecutiveIdentity } from "../../simulation/nationwide-world/state-executive-candidacy-packs";
import {
  stateExecutiveOffice,
  stateExecutiveTermWindow as legacyWindow,
} from "../../simulation/nationwide-world/state-executives";
import { ordinaryStateExecutiveTermDates as legacyOrdinary } from "../../simulation/nationwide-world/state-executive-terms";
import { stateExecutiveTermRuleForElectionYear } from "../../simulation/nationwide-world/executive-term-rules-in-world";
import { resolveNationwideRuleCapability } from "../../simulation/nationwide-world/rule-capability-port";
import * as legacyHeld from "../../simulation/governing/office-consequence";
import { currentGoverningOffices } from "../../simulation/governing/state-governing";
import { currentPresidentOf } from "../../simulation/crisis/offices";
import { projectCongress } from "../../simulation/living-world/congress";
import { congressSeats } from "../../simulation/living-world/congress-seats";
import { congressSeatTitle } from "../../simulation/living-world/opening";
import { NATIONAL_ELECTION_JURISDICTION } from "../../simulation/national-election-geography";
import { estimatedStatePay } from "../../simulation/office-pay";
import {
  GOVERNOR_SALARY_ROWS,
  LEGISLATOR_SALARY_ROWS,
} from "../../simulation/office-pay.generated";
import incomes from "../../../data/research/money/state-household-income-cps-2023.json";
import { censusRegionOf } from "../../simulation/world-setup/census-regions";
import precinctData from "../../districts/place-precinct-population.generated.json";
import counties from "../../../data/research/local-government/county-governing-bodies.json";
import methods from "../../../data/research/local-government/council-election-methods.json";
import * as shares from "./county-shares";
import * as wards from "./ward-plans";
import * as precincts from "./precincts";
import * as chief from "./chief-executive";
import * as terms from "./executive-terms";
import * as held from "./held-offices";
import * as district from "./district-residence";
import { continuousResidenceSince } from "./continuous-residence";
import { estimatedStatePay as payEstimate } from "./pay-estimate";
import type { IsoDate, World } from "../../simulation/types";

const places = Object.keys(STATES);
const countyParts = JSON.parse(
  PLACE_COUNTY_RELATIONS_ROWS,
) as readonly (readonly [string, string, number, number])[];
function primaryHome(world: World, id: string, date: IsoDate) {
  const p = world.people[id];
  if (
    !p ||
    p.birthDate > date ||
    world.history.personDeaths.some(
      (d) => d.personId === id && d.diedAt <= date,
    )
  )
    return null;
  const homes = householdMembershipsAt(world, p.id, {
    asOfDate: date,
    historySequenceExclusive: world.history.nextSequence,
  });
  const primary = homes.filter(
    (h) => h.state.residenceRole === "primary" && h.location !== null,
  );
  return primary.length > 1
    ? null
    : primary.length === 1
      ? primary[0]!.location!.jurisdictionId
      : homes.length === 0
        ? p.homeJurisdictionId
        : null;
}
function residenceFacts(world: World, id: string, home: string, date: IsoDate) {
  const person = world.people[id];
  const base = currentLifeCutoff(world);
  const dates = new Set<IsoDate>();
  for (const membership of world.history.householdMemberships.filter(
    (m) => m.personId === id && m.sequence < base.historySequenceExclusive,
  )) {
    dates.add(membership.startedAt);
    for (const row of householdMembershipStateHistory(
      world,
      membership.id,
      base,
    ))
      dates.add(row.effectiveAt);
    for (const row of householdLocationHistory(
      world,
      membership.householdId,
      base,
    ))
      dates.add(row.effectiveAt);
  }
  const coverage = new Set<string>();
  for (const at of [date, ...dates, ...[...dates].map((d) => addDays(d, -1))])
    if (
      householdMembershipsAt(world, person!.id, { ...base, asOfDate: at }).some(
        (m) =>
          m.state.residenceRole === "primary" &&
          m.location?.jurisdictionId === home,
      )
    )
      coverage.add(at);
  return {
    personExists: !!person,
    residences: person
      ? factsForPerson(person)
          .filter((f) => f.kind === "residence")
          .map((f) => ({
            ...f,
            covered: f.jurisdictionId === home,
          }))
      : [],
    homeCoverage: coverage,
    changeDates: [...dates].sort(),
  };
}

describe("RULES-2 send-back: facts and legacy caller from the same generated world", () => {
  it.each(places)("office/residence/precinct calculations in %s", (place) => {
    const {
      world: unlocated,
      jurisdictionId,
      personId,
      place: lifePlace,
    } = smallWorld({
      place,
      household: true,
      people: 6,
      seed: `rules2-sendback-offices:${place}`,
    });
    let world = recordHouseholdLocation(unlocated, {
      stableKey: "rules2:home-location",
      householdId: unlocated.history.households.at(-1)!.id,
      effectiveAt: unlocated.currentDate,
      jurisdictionId,
      label: lifePlace.displayName,
      kind: "residence:primary",
      provenance: {
        kind: "authored",
        note: "Generated residents housed through the existing location writer.",
      },
      supersedesLocationId: null,
    });
    for (const id of world.personOrder)
      world = districts.syncDistrictMembershipFromCanonicalHome(
        world,
        id,
        districts.CONGRESSIONAL_HOME_JOIN_V1,
      );
    for (const id of world.personOrder) {
      expect(
        continuousResidenceSince(
          residenceFacts(world, id, jurisdictionId, world.currentDate),
          world.currentDate,
        ),
      ).toEqual(
        residence.homeJurisdictionResidenceSince(
          world,
          id,
          jurisdictionId,
          world.currentDate,
        ),
      );
      for (const chamber of [
        "state-lower",
        "state-upper",
        "congressional",
      ] as const)
        expect(
          district.recordedDistrictMembership(
            (world.history.districtResidenceIntervals ?? []).filter(
              (row) => row.personId === id,
            ),
            chamber,
            world.currentDate,
          ),
        ).toEqual(
          districts.recordedDistrictMembership(
            world,
            id,
            chamber,
            world.currentDate,
          ),
        );
      for (const interval of (
        world.history.districtResidenceIntervals ?? []
      ).filter((row) => row.personId === id)) {
        const resolved = resolveDistrictBinding(
          districtIdentityCatalog(),
          interval.binding,
        );
        expect(
          district.districtResidenceSince(
            (world.history.districtResidenceIntervals ?? []).filter(
              (row) => row.personId === id,
            ),
            resolved.kind === "refused" ? null : resolved.binding,
            residence.homeJurisdictionResidenceSince(
              world,
              id,
              jurisdictionId,
              world.currentDate,
            ),
            world.currentDate,
          ),
        ).toEqual(
          districts.districtResidenceSince(
            world,
            id,
            interval.binding,
            world.currentDate,
          ),
        );
      }
    }
    const ownPlaceGeoid = lifePlace.sourceGeoid;
    const fips = (
      counties.municipalCodes as Record<string, { stateFips: string }>
    )[place]?.stateFips;
    const averages = precinctData.stateAverages as Record<
      string,
      precincts.PrecinctAverage
    >;
    const populations = precinctData.populations as Record<
      string,
      Record<string, number>
    >;
    const residents = world.personOrder.filter(
      (id) => primaryHome(world, id, world.currentDate) === jurisdictionId,
    );
    const plan = precincts.votingPrecinctPlan(
      {
        place: lifePlace,
        hasJurisdiction: !!world.jurisdictions[jurisdictionId],
        recorded: ownPlaceGeoid
          ? populations[`${ownPlaceGeoid}:voting-precinct`]
          : undefined,
        stateFips: fips,
        own: fips ? averages[fips] : undefined,
        stateAverages: averages,
        referencePopulation: ownPlaceGeoid
          ? placeReferencePopulation(ownPlaceGeoid)?.value
          : undefined,
        residents: residents.length,
        rosterPopulation: townRoster(jurisdictionId).population,
      },
      jurisdictionId,
    );
    expect(plan).toEqual(legacyWards.votingPrecinctPlan(world, jurisdictionId));
    const established = legacyWards.establishVotingPrecinctMembership(
      world,
      jurisdictionId,
    );
    const assignments = precincts.precinctAssignments(plan, residents);
    expect(residents.length).toBeGreaterThan(0);
    for (const id of residents)
      expect(assignments[id]).toBe(
        legacyWards.votingPrecinctOfPerson(established, jurisdictionId, id)
          ?.precinctKey,
      );
    const arrivalWorld = createCharacterHistoryContextPerson(established, {
      stableKey: "rules2-sendback-precinct-arrival:" + place,
      givenName: world.people[personId]!.givenName,
      familyName: world.people[personId]!.familyName,
      birthDate: world.people[personId]!.birthDate,
      homeJurisdictionId: jurisdictionId,
    });
    const arrivalId = arrivalWorld.personOrder.at(-1)!;
    const counts = new Map(plan.precincts.map((row) => [row.key, 0]));
    for (const id of arrivalWorld.personOrder) {
      const membership = legacyWards.votingPrecinctOfPerson(
        arrivalWorld,
        jurisdictionId,
        id,
      );
      if (membership)
        counts.set(
          membership.precinctKey,
          counts.get(membership.precinctKey)! + 1,
        );
    }
    const afterArrival = legacyWards.syncVotingPrecinctArrival(
      arrivalWorld,
      arrivalId,
    );
    expect(precincts.precinctArrival(plan, residents.length + 1, counts)).toBe(
      legacyWards.votingPrecinctOfPerson(
        afterArrival,
        jurisdictionId,
        arrivalId,
      )?.precinctKey,
    );
    for (const reason of ["opening", "census"] as const) {
      const previous = established.history.events.find(
        (event) => event.type === "local.voting-precinct-map",
      )!;
      const legacy = legacyWards.establishVotingPrecinctMembership(
        established,
        jurisdictionId,
        reason,
      );
      expect(
        precincts.shouldEstablishPrecincts(
          reason,
          established.currentDate,
          previous,
        ),
      ).toBe(legacy.history.events.length > established.history.events.length);
      const dated = advanceWorld(established, Math.max(0, 1));
      expect(
        precincts.shouldEstablishPrecincts(reason, dated.currentDate, previous),
      ).toBe(
        legacyWards.establishVotingPrecinctMembership(
          dated,
          jurisdictionId,
          reason,
        ).history.events.length > dated.history.events.length,
      );
    }
    const catalog = congressSeats();
    const facts: held.OfficeFacts = {
      governingOffices: currentGoverningOffices(world),
      congress: projectCongress(world),
      congressCatalog: catalog,
      seatTitles: Object.fromEntries(
        catalog.map((s) => [s.seatKey, congressSeatTitle(s)]),
      ),
      president: currentPresidentOf(world),
      workEntries: activeWorkRelationshipsAt(world, personId),
      nationalJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      jurisdictions: world.jurisdictions,
    };
    expect(held.officesHeldBy(facts, personId)).toEqual(
      legacyHeld.officesHeldBy(world, personId),
    );
    expect(held.playerOfficeScope(facts, personId)).toEqual(
      legacyHeld.playerOfficeScope(world, personId),
    );
    for (const office of ["governor", "state-legislator"] as const) {
      const values = (
        office === "governor" ? GOVERNOR_SALARY_ROWS : LEGISLATOR_SALARY_ROWS
      )
        .split(";")
        .map((row) => {
          const i = row.indexOf(":");
          return [row.slice(0, i), Number(row.slice(i + 1))] as const;
        });
      const expected = estimatedStatePay(world, office, place);
      const actual = payEstimate(office, place, {
        values,
        incomes: incomes.medianHouseholdIncomeDollarsByState,
        regions: Object.fromEntries(
          Object.keys(incomes.medianHouseholdIncomeDollarsByState).map(
            (key) => {
              const s = key.replace(/^US-/, "");
              return [s, censusRegionOf(s)];
            },
          ),
        ),
      });
      expect(actual).toEqual(
        expected
          ? {
              office: expected.office,
              state: expected.state,
              annualDollars: expected.annualDollars,
            }
          : null,
      );
    }
  });
  it.each(places)(
    "county shares, ward and executive calendar callers in %s",
    (place) => {
      const { world, place: lifePlace } = smallWorld({
        place,
        seed: `rules2-sendback-office-corpus:${place}`,
      });
      const geoid = lifePlace.sourceGeoid ?? "";
      const parts = countyParts
        .filter((r) => r[0] === geoid)
        .map((r) => [r[1], r[2], r[3]] as const);
      const countyUnits = new Map(
        parts.flatMap((p) => {
          const unit = units.countyGovernmentUnit(p[0]);
          return unit ? [[p[0], unit] as const] : [];
        }),
      );
      expect(shares.countyPopulationSharesForPlace(parts)).toEqual(
        units.countyPopulationSharesForPlace(geoid),
      );
      expect(shares.countyLandSharesForPlace(parts)).toEqual(
        units.countyLandSharesForPlace(geoid),
      );
      expect(shares.countyGeoidsForPlace(parts)).toEqual(
        units.countyGeoidsForPlace(geoid),
      );
      expect(shares.countyGovernmentUnitsForPlace(parts, countyUnits)).toEqual(
        units.countyGovernmentUnitsForPlace(geoid),
      );
      const stateUnits = units.governmentUnitsForState(place);
      const towns = stateUnits
        .filter((u) => u.unitType === "municipality" && u.functionalActive)
        .map((u) => ({
          id: u.id,
          population:
            (u.placeGeoid
              ? placeReferencePopulation(u.placeGeoid)?.value
              : undefined) ?? 1000,
        }));
      for (const unit of stateUnits
        .filter((u) => u.unitType === "municipality")
        .slice(0, 3)) {
        const government = municipalGovernmentForUnit(unit);
        const reading = government ? primaryReading(government) : null;
        const seats = localGoverningBodyRules(unit)?.seats?.value ?? null;
        const charter =
          seats === null
            ? null
            : wards.charterWardSeats(
                government,
                reading?.composition ?? null,
                seats,
              );
        expect(
          wards.councilWardPlan(
            !!localGoverningBodyIdentity(unit),
            seats,
            charter,
            wards.sizeRank(unit.id, towns),
            methods.national,
          ),
        ).toEqual(legacyWards.councilWardPlan(unit));
        expect(
          chief.localChiefExecutiveRules(
            unit,
            government,
            reading,
            unit.placeGeoid ? placePopulation(unit.placeGeoid) : null,
            {
              largeCityPopulation: legacyChief.OWNER_LARGE_CITY_POPULATION,
              directElection: { value: true, basis: "typical" },
              term: { value: 4, basis: "typical" },
            },
          ),
        ).toEqual(legacyChief.localChiefExecutiveRules(unit));
      }
      const identity = stateExecutiveIdentity(place);
      const office = stateExecutiveOffice(place);
      const rule = calendar.stateExecutiveTermRule(place);
      if (identity && office) {
        for (const date of ["2026-01-01", "2026-11-04", "2027-01-03"]) {
          const onDate = makeIsoDate(date);
          const resolution = resolveNationwideRuleCapability({
            scope: { kind: "state", stateUsps: place },
            officeKey: office.officeKey,
            action: "inspect",
            onDate,
            fields: ["term.years", "term.start"],
          });
          expect(
            terms.stateExecutiveTermWindow(resolution, rule, onDate),
          ).toEqual(legacyWindow(office, onDate));
          const electionResolution = resolveNationwideRuleCapability({
            scope: { kind: "state", stateUsps: place },
            officeKey: identity.officeKey,
            action: "enter-office-term",
            onDate,
            fields: ["term.years", "term.start"],
          });
          expect(
            terms.ordinaryStateExecutiveTermDates(
              stateExecutiveTermRuleForElectionYear(
                world,
                place,
                Number(date.slice(0, 4)),
              ),
              electionResolution,
              onDate,
            ),
          ).toEqual(legacyOrdinary(world, identity, onDate));
        }
      }
    },
  );
});

it.each(places)(
  "qualification compilation and private source selectors in a generated %s world",
  (place) => {
    const { world } = smallWorld({
      place,
      seed: "rules2-sendback-compiled:" + place,
    });
    const key = "US-" + place;
    const pack = stateCandidacyPack(key);
    for (const option of pack?.offices ?? []) {
      const chamber = option.officeKey.split(":").at(-1)!;
      const family = officeFamilyForChamberKey(chamber);
      const date = makeIsoDate(OFFICE_QUALIFICATIONS_META.asOf);
      const fields = ["MINIMUM_AGE", "STATE_RESIDENCE", "TERM_LENGTH"] as const;
      const drawn = Object.fromEntries(
        fields.map((field) => [
          field,
          family ? standInQualification(key, field, family) : null,
        ]),
      );
      const facts: CompiledQualificationFacts = {
        rules: candidateQualificationRuleSet(
          pack!.packId,
          option.officeKey,
          date,
        ),
        officeFamily: family,
        stateLawRead: LEGISLATIVE_RULE_PACKS.some(
          (p) => p.jurisdictionKey === key,
        ),
        compiledRows: family ? officeQualifications(key, family, date) : [],
        drawn,
        drawnSources: Object.fromEntries(
          fields.flatMap((field) =>
            drawn[field]
              ? [[field, standInQualificationSourceRef(drawn[field]!)]]
              : [],
          ),
        ),
        settled: Object.fromEntries(
          fields.map((field) => [
            field,
            family ? legacySettled(key, field, family, date) : null,
          ]),
        ),
      };
      const actual = officeQualification(facts);
      const expected = option.qualification;
      for (const [a, b] of [
        [actual.minimumAge, expected.minimumAge],
        [actual.termYears, expected.termYears],
        [actual.residency, expected.residency],
        [actual.filing, expected.filing],
      ] as const) {
        expect(a.kind).toBe(b.kind);
        if (
          a.kind === "known" &&
          b.kind === "known" &&
          typeof a.value === "number"
        )
          expect(a.value).toBe(b.value);
      }
      expect(compiledQualificationForOffice(facts).termYears).toEqual(
        actual.termYears,
      );
      for (const field of fields)
        if (family)
          expect(
            newSettled(
              key,
              field,
              family,
              world.currentDate,
              researchRuleTable(
                "settledQualifications",
              ) as readonly SettledQualification[],
            ),
          ).toEqual(legacySettled(key, field, family, world.currentDate));
    }
  },
);
it.each(places)(
  "delegates, transition windows, and local government selections in %s",
  (place) => {
    const { world, place: lifePlace } = smallWorld({
      place,
      seed: "rules2-sendback-office-selection:" + place,
    });
    const chamberWorld = createOrganization(world, {
      stableKey: LIVING_WORLD_KEYS.chamber("us-house"),
      formedAt: addDays(world.currentDate, -4000),
      provenance: {
        kind: "authored",
        note: "Chamber setting required by the production delegate writer.",
      },
      initialProfile: {
        name: "United States House of Representatives",
        classification: "sector:government",
        locationJurisdictionId: null,
      },
    });
    const started = legacyDelegates.seatHouseDelegates(chamberWorld);
    const dates = legacyDelegates.HOUSE_DELEGATE_SEATS.map((seat) => {
      const window = houseDelegateTermWindow(seat, world.currentDate, 2025);
      expect(window).toEqual(
        legacyDelegates.houseDelegateTermWindow(seat, world.currentDate),
      );
      const rng = new SeededRng(world.seed).fork(
        `${LIVING_WORLD_WRITER_VERSION}:seat:${seat.seatKey}:term:${window.startsAt}:member:prior-terms`,
      );
      return {
        ...seat,
        ...window,
        priorTerms: rng.integer(0, 6),
        caucus: legacyDelegates.houseDelegateProjectedCaucus(
          seat.stateUsps,
          null,
          false,
        ),
      };
    });
    const planned = seatHouseDelegates(dates);
    for (const usps of places) {
      const seat = legacyDelegates.houseDelegateSeat(usps);
      const actual = houseDelegateOccupant({
        seat: seat ?? null,
        currentDate: started.currentDate,
        tenureEventType: legacyDelegates.HOUSE_DELEGATE_TENURE_EVENT,
        events: started.history.events,
        people: started.people,
        alivePeople: new Set(
          started.personOrder.filter(
            (id) =>
              !started.history.personDeaths.some(
                (d) => d.personId === id && d.diedAt <= started.currentDate,
              ),
          ),
        ),
        names: Object.fromEntries(
          started.personOrder.map((id) => [
            id,
            personName(started.people[id]!),
          ]),
        ),
      });
      expect(actual).toEqual(
        legacyDelegates.houseDelegateOccupant(started, usps),
      );
      if (actual.kind === "member" && seat) {
        const row = planned.find((r) => r.seatKey === seat.seatKey)!;
        expect(row.startsAt).toBe(actual.startedAt);
        expect(row.endExclusive).toBe(actual.endExclusive);
        const tenure = started.history.events.find(
          (event) =>
            event.type === legacyDelegates.HOUSE_DELEGATE_TENURE_EVENT &&
            event.tags.includes(`seat:${seat.seatKey}`) &&
            event.participants.some(
              (participant) => participant.personId === actual.personId,
            ),
        )!;
        expect(tenure.tags).toContain(`service-since:${row.serviceSince}`);
      }
    }
    for (const level of [
      "federal-house",
      "federal-senate",
      "state-legislature",
      "state-executive",
      "local",
    ] as const) {
      const profile = legacyTransition.officeTransitionProfile(level);
      const election = makeIsoDate("2026-11-03"),
        start = makeIsoDate("2027-01-03");
      const services = transition.datedTransitionServices(
        profile,
        election,
        start,
      );
      expect(services).toEqual(
        legacyTransition.datedTransitionServices(profile, election, start),
      );
      for (const service of services)
        expect(
          transition.transitionServiceStatus(world.currentDate, false, service),
        ).toBe(
          legacyTransition.transitionServiceStatus(
            world,
            world.personOrder[0]!,
            world.personOrder[1]!,
            service,
          ),
        );
    }
    const geoid = lifePlace.sourceGeoid ?? "";
    const governmentUnits = units.governmentUnitsForPlace(geoid);
    const counties = new Map<string, units.GovernmentUnitIdentity>();
    for (const u of governmentUnits) {
      if (u.countyGeoid) {
        const c = units.countyGovernmentUnit(u.countyGeoid);
        if (c) counties.set(u.countyGeoid, c);
      }
    }
    const actual = placeLocalGovernmentUnits(lifePlace, {
      governmentUnits,
      counties,
      municipios: new Map(),
      townships: townshipGovernmentUnitsForPlace(geoid),
      relation: units.countyGovernmentUnitsForPlace(geoid),
      placeMunicipios: municipiosForPlace(geoid),
    });
    const expected = Object.fromEntries(
      Object.entries(legacyLocalUnits(lifePlace)).filter(
        ([key]) => key !== "countyReason",
      ),
    );
    expect(actual).toEqual(expected);
  },
);

it.each(places)(
  "salary amount and private weekly-period decisions through public writers in %s",
  (place) => {
    const base = smallWorld({ place, seed: "rules2-sendback-salary:" + place });
    const national = createWorld({
      seed: base.world.seed,
      currentDate: base.world.currentDate,
      currentMoment: base.world.currentMoment,
      people: base.world.personOrder.map((id) => base.world.people[id]!),
      jurisdictions: [
        ...base.world.jurisdictionOrder.map(
          (id) => base.world.jurisdictions[id]!,
        ),
        NATIONAL_ELECTION_JURISDICTION,
      ],
      policyCatalog: base.world.policyCatalog,
    });
    let world = createOrganization(national, {
      stableKey: "rules2:office-employer",
      formedAt: base.world.currentDate,
      provenance: { kind: "authored", note: "Public salary writer setting." },
      initialProfile: {
        name: "Congressional office",
        classification: "sector:government",
        locationJurisdictionId: null,
      },
    });
    world = createWorkRelationship(world, {
      stableKey: "rules2:office-work",
      personId: base.personId,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: addDays(world.currentDate, -14),
      kind: "employment:congress-member",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: {
        kind: "authored",
        note: "Dated office employment through its public writer.",
      },
      initialRole: {
        title: "Member of Congress",
        occupationClassification: null,
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 60 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    const role = workRoleAt(world, work.id)!;
    const pay = annualPay({
      inForce: officePayInForce(world, work, world.currentDate),
      recordedAnnualMinor: null,
      hasLocation: !!role.locationJurisdictionId,
      hourlyMinor: null,
      weeklyHours: weeklyHoursOf(role),
    })!;
    const initialized = initializeOfficeSalaryFlows(world, base.personId);
    const flow = initialized.history.resourceFlows.at(-1)!;
    expect(
      resourceFlowTermsHistory(initialized, flow.id).at(-1)!.amount.minorUnits,
    ).toBe(weeklyMinor(pay.annualMinor));
    let dated = advanceWorld(initialized, 23);
    for (let pass = 0; pass < 2; pass++) {
      const lastPeriod = dated.history.resourceTransferOutcomes
        .filter((row) => row.resourceFlowId === flow.id)
        .map((row) => row.periodStartsAt)
        .sort()
        .at(-1);
      const activeOnDayBefore = new Set<string>();
      const paidOnStart = new Set<string>();
      for (let day = 0; day <= 23; day++) {
        const at = addDays(flow.startsAt, day);
        const cutoff = {
          asOfDate: at,
          historySequenceExclusive: dated.history.nextSequence,
        };
        if (workStatusAt(dated, work.id, cutoff)?.status === "active")
          activeOnDayBefore.add(at);
        if (paidOfficeOf(dated, work, cutoff)) paidOnStart.add(at);
      }
      const periods = dueOfficePeriods({
        startsAt: flow.startsAt,
        currentDate: dated.currentDate,
        lastPeriod,
        activeOnDayBefore,
        paidOnStart,
      });
      const settled = settleOfficeSalaries(dated, base.personId);
      expect(
        settled.history.resourceTransferOutcomes
          .slice(dated.history.resourceTransferOutcomes.length)
          .filter((row) => row.resourceFlowId === flow.id)
          .map((row) => ({
            periodStartsAt: row.periodStartsAt,
            periodEndsAt: row.periodEndsAt,
            onDate: row.occurredAt,
          })),
      ).toEqual(periods);
      dated = settled;
    }
  },
);
