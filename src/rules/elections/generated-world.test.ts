import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import * as oldNomination from "../../simulation/nominations/nomination-rules";
import nominationTable from "../../../data/research/elections/party-nomination-rules-2026.json";
import { MEDIAN_FILING_GAP_DAYS } from "../../simulation/nominations/filing-gap";
import {
  ruleValueInWorld,
  electionLawOfficeKey,
  enactedRuleChanges,
} from "../../simulation/enacted-rule-changes";
import {
  nominationPlan,
  medianFilingGapDays,
  type PlaceRow,
} from "./nomination-plan";
import * as units from "../../simulation/government-units";
import * as oldCounty from "../../simulation/nationwide-world/county-election-calendar";
import countyProfiles from "../../../data/research/government/county-election-calendar-profiles.json";
import countyStates from "../../../data/research/government/county-election-schedule-by-state.json";
import { nextCountyElection, type StateRow } from "./county-calendar";
import { resolveMunicipalElectionTiming } from "../../simulation/municipal-ballot-rules";
import * as oldLocal from "../../simulation/living-world/local-elections";
import { nextTownElectionDay } from "./local-calendar";
import * as oldLegislative from "../../simulation/nationwide-world/state-legislative-election-calendar";
import { GOVERNOR_TURNOVER_PROFILE } from "../../simulation/nationwide-world/state-executive-turnover-calendar";
import {
  nextStateLegislativeElection,
  isStateLegislativeSeatDue,
} from "./legislative-calendar";
import * as oldExec from "../../simulation/nationwide-world/executive-term-rules-in-world";
import { stateExecutiveTermRule } from "../../simulation/nationwide-world/state-executive-term-rules";
import { stateExecutiveIdentity } from "../../simulation/nationwide-world/state-executive-candidacy-packs";
import * as newExec from "./executive-law-calendar";
import { stateCandidacyPack } from "../../simulation/candidacy-packs";
import * as oldChambers from "../../simulation/nationwide-world/state-legislature-opening";
import {
  gazetteerChamberForOfficeChamberKey,
  listDistrictIdentities,
} from "../../districts/query";
import { districtIdentityCatalog } from "../../districts/catalog";
import { membersInDistrict } from "../../districts/members-per-district";
import {
  buildStateChamberPlan,
  stateSeatOrdinalsInDistrict,
  type ChamberPlanFacts,
} from "./chamber-plan";
import * as oldDelegates from "../../simulation/living-world/house-delegates";
import {
  houseDelegateProjectedCaucus,
  twoCaucusShare,
} from "./delegate-projection";
import delegateResults from "../../../data/research/elections/house-delegates-2024.json";
import * as oldIntake from "../../simulation/living-world/congress-candidates";
import * as oldStateIntake from "../../simulation/nationwide-world/state-legislature-candidates";
import {
  congressCandidateIntakeDay,
  stateCandidateIntakeDay,
} from "./candidate-intake";
import {
  partyUnit,
  partyUnitStatusAt as oldPartyStatus,
} from "../../simulation/living-world/party-registry";
import { partyPlatformAt as oldPlatform } from "../../simulation/living-world/party-evolution";
import { partyRecords } from "../../simulation/world-setup/integrity";
import { partyUnitStatusAt, partyPlatformAt } from "./party-history";
const places = Object.keys(STATES);
const table = nominationTable.places as unknown as Readonly<
  Record<string, PlaceRow>
>;
const legislativeFacts = {
  reviewedCycles: oldLegislative.REVIEWED_REGULAR_SEAT_CYCLES,
  fieldClosesDaysBefore: GOVERNOR_TURNOVER_PROFILE.fieldClosesDaysBefore,
};
describe("RULES-2 elections send-back: legacy readers and facts from each generated world", () => {
  it.each(places)(
    "date, filing, runoff, seat and enacted-calendar closures in %s",
    (place) => {
      const { world } = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-election-dates:${place}`,
      });
      expect(medianFilingGapDays(table)).toBe(MEDIAN_FILING_GAP_DAYS);
      for (const year of [2025, 2026, 2027, 2028, 2030])
        for (const family of [
          "us-house",
          "us-senate",
          "governor",
          "state-legislature",
        ] as const) {
          const query = {
            stateUsps: place,
            family,
            year,
            onDate: makeIsoDate(`${year - 1}-07-01`),
          };
          const row = oldNomination.nominationRuleRow(place);
          const officeKey = electionLawOfficeKey(place);
          const methodLaw = ruleValueInWorld(
            world,
            {
              jurisdiction: place,
              officeKey,
              field: "nomination.method",
              onDate: query.onDate,
            },
            row?.methodByOffice?.[family] ?? row?.method ?? null,
          );
          const dateLaw = ruleValueInWorld(
            world,
            {
              jurisdiction: place,
              officeKey,
              field: "nomination.primary.dateRule",
              onDate: query.onDate,
            },
            null,
          );
          expect(
            nominationPlan(
              {
                row,
                places: table,
                medianFilingGapDays: MEDIAN_FILING_GAP_DAYS,
              },
              { methodLaw, dateLaw },
              query,
            ),
          ).toEqual(oldNomination.nominationPlan(world, query));
        }
      const executiveFacts = {
        compiled: stateExecutiveTermRule(place),
        office: stateExecutiveIdentity(place),
        changes: enactedRuleChanges(world),
      };
      for (const day of [
        "2025-01-01",
        "2026-11-03",
        "2028-01-04",
        "2031-12-31",
      ]) {
        const date = makeIsoDate(day);
        expect(
          newExec.nextRegularElectionInWorld(executiveFacts, place, date),
        ).toEqual(oldExec.nextRegularElectionInWorld(world, place, date));
        expect(
          newExec.stateExecutiveTermRuleInWorld(executiveFacts, place, date),
        ).toEqual(oldExec.stateExecutiveTermRuleInWorld(world, place, date));
        expect(
          newExec.termDatesAfterElectionInWorld(executiveFacts, place, date),
        ).toEqual(oldExec.termDatesAfterElectionInWorld(world, place, date));
        for (const seat of [
          null,
          {
            officeKey: `us-${place.toLowerCase()}-legislature-profile-v1:senate`,
            ordinal: 1,
          },
        ])
          expect(
            nextStateLegislativeElection(legislativeFacts, place, date, seat),
          ).toEqual(
            oldLegislative.nextStateLegislativeElection(place, date, seat),
          );
        for (const unit of units
          .governmentUnitsForState(place)
          .filter((u) => u.functionalActive)
          .slice(0, 6)) {
          expect(
            nextCountyElection(
              {
                profiles: countyProfiles.profiles,
                states: countyStates.states as readonly StateRow[],
              },
              unit,
              date,
            ),
          ).toEqual(oldCounty.nextCountyElection(unit, date));
          const timing = resolveMunicipalElectionTiming(
            unit.stateUsps,
            unit.placeGeoid ?? unit.publisherId,
          );
          expect(
            nextTownElectionDay(
              { timing, profile: oldLocal.LOCAL_ELECTIONS_PROFILE },
              date,
            ),
          ).toEqual(oldLocal.nextTownElectionDay(unit, date));
        }
      }
      for (const year of [2024, 2025, 2026, 2027, 2028, 2032]) {
        expect(
          newExec.stateExecutiveTermRuleForElectionYear(
            executiveFacts,
            place,
            year,
          ),
        ).toEqual(
          oldExec.stateExecutiveTermRuleForElectionYear(world, place, year),
        );
        expect(
          newExec.isStateExecutiveElectionYearInWorld(
            executiveFacts,
            place,
            year,
          ),
        ).toEqual(
          oldExec.isStateExecutiveElectionYearInWorld(world, place, year),
        );
        for (const index of [0, 1, 59, 60, 119, 120]) {
          expect(
            congressCandidateIntakeDay(
              year,
              index,
              oldIntake.CONGRESS_CANDIDATE_PROFILE,
            ),
          ).toBe(oldIntake.congressCandidateIntakeDay(year, index));
          expect(
            stateCandidateIntakeDay(
              year,
              index,
              oldStateIntake.STATE_LEGISLATURE_CANDIDATE_PROFILE,
            ),
          ).toBe(oldStateIntake.stateCandidateIntakeDay(year, index));
        }
        for (const cycle of oldLegislative.REVIEWED_REGULAR_SEAT_CYCLES.filter(
          (row) => row.stateUsps === place,
        ))
          for (const ordinal of [1, 2, 3, 4])
            expect(
              isStateLegislativeSeatDue(
                legislativeFacts,
                place,
                cycle.officeKey,
                ordinal,
                year,
              ),
            ).toBe(
              oldLegislative.isStateLegislativeSeatDue(
                place,
                cycle.officeKey,
                ordinal,
                year,
              ),
            );
      }
      const pack = stateCandidacyPack(`US-${place}`);
      if (pack) {
        const districts = Object.fromEntries(
          pack.offices.map((office) => {
            const key = office.officeKey.split(":").at(-1)!;
            const chamber = gazetteerChamberForOfficeChamberKey(key);
            return [
              key,
              chamber
                ? listDistrictIdentities(districtIdentityCatalog(), {
                    stateUsps: place,
                    chamber,
                  })
                : [],
            ];
          }),
        );
        const memberCounts = Object.fromEntries(
          Object.values(districts).flatMap((rows) =>
            rows.map((d) => [
              d.recordId,
              membersInDistrict(d.stateUsps, d.chamber, d.districtCode),
            ]),
          ),
        );
        const facts: ChamberPlanFacts = {
          districts,
          memberCounts,
          atLargeSeats: { "US-PR": { house: 11, senate: 11 } },
        };
        const plan = buildStateChamberPlan(facts, pack);
        expect(plan).toEqual(oldChambers.planStateChambers(pack));
        for (const chamber of plan.chambers)
          for (const district of chamber.districts.slice(0, 8)) {
            if (!district) continue;
            expect(
              stateSeatOrdinalsInDistrict(chamber, district.recordId),
            ).toEqual(
              oldChambers
                .stateSeatsInDistrict(
                  pack.packId,
                  chamber.officeKey,
                  district.recordId,
                )
                .map((s) => s.ordinal),
            );
          }
      }
      const seat = oldDelegates.houseDelegateSeat(place);
      if (seat) {
        for (const incumbent of [null, "democratic", "republican", "other"])
          for (const seeking of [false, true])
            expect(
              houseDelegateProjectedCaucus(place, seat, incumbent, seeking),
            ).toBe(
              oldDelegates.houseDelegateProjectedCaucus(
                place,
                incumbent,
                seeking,
              ),
            );
        const result =
          delegateResults.places[place as keyof typeof delegateResults.places];
        if (result && "democraticPercent" in result)
          expect(twoCaucusShare(result)).toBe(seat.lean.democraticShare);
      }
      for (const organization of world.history.organizations) {
        const unit = partyUnit(world, organization.id);
        if (!unit) continue;
        expect(
          partyUnitStatusAt(
            { unit, records: partyRecords(world) },
            organization.id,
            world.currentDate,
          ),
        ).toEqual(oldPartyStatus(world, organization.id));
        expect(
          partyPlatformAt(
            partyRecords(world),
            organization.id,
            world.currentDate,
          ),
        ).toEqual(oldPlatform(world, organization.id));
      }
    },
  );
});
