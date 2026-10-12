import * as oldLimits from "../../simulation/living-world/local-council-term-limits";
import { organizationParticipationStateHistory } from "../../simulation/life-queries";
import {
  consecutiveCouncilYears,
  councilTermLimitBar,
} from "./council-term-limits";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../../simulation/dates";
import { governmentUnitsForState } from "../../simulation/government-units";
import { localGovernmentJurisdiction } from "../../simulation/nationwide-world/local-governments";
import { localGoverningBodyRules } from "../../simulation/nationwide-world/local-governing-body-rules";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { ensureLocalGovernmentSeatsForUnit } from "../../simulation/living-world/local-government-seats";
import * as oldWard from "../../simulation/living-world/town-wards";
import * as oldLocal from "../../simulation/living-world/local-elections";
import { resolveMunicipalElectionTiming } from "../../simulation/municipal-ballot-rules";
import { localCampaignSeat, censusRedrawDue, wardMembers } from "./local-seat";
describe("elections: generated town seat and census writer callers", () => {
  it.each(Object.keys(STATES))(
    "matches ward/at-large choice and decennial redraw in %s",
    (place) => {
      const units = governmentUnitsForState(place).filter(
        (unit) =>
          unit.unitType === "municipality" &&
          unit.placeGeoid &&
          localGovernmentJurisdiction(unit) &&
          lifePlaceByJurisdictionId(localGovernmentJurisdiction(unit)!.id),
      );
      const unit =
        units.find(
          (unit) => (oldWard.councilWardPlan(unit)?.wardSeats ?? 0) >= 2,
        ) ?? units[0];
      if (!unit) {
        const base = smallWorld({ place });
        expect(censusRedrawDue(null, base.world.currentDate)).toBeNull();
        return;
      }
      const jurisdiction = localGovernmentJurisdiction(unit)!;
      const location = lifePlaceByJurisdictionId(jurisdiction.id)!;
      const base = smallWorld({
        place: location.key,
        seed: `rules2-sendback-local:${place}`,
      });
      let world = ensureLocalGovernmentSeatsForUnit(
        base.world,
        unit,
        base.jurisdictionId,
      );
      const rules = localGoverningBodyRules(unit);
      const plan = oldWard.councilWardPlan(unit);
      const members = wardMembers(
        Array.from(
          { length: (rules?.seats?.value ?? 0) + 1 },
          (_, seat) =>
            [seat, oldLocal.localSeatHolder(world, unit, seat)] as const,
        ).flatMap(([seat, row]) => (row ? [[seat, row] as const] : [])),
      );
      if (!oldWard.townWardMap(world, unit))
        world = oldWard.redrawTownWards(world, {
          unit,
          town: base.jurisdictionId,
          drawnBy: "council",
          members,
          reason: "Generated town opening map.",
        });
      const map = oldWard.townWardMap(world, unit);
      for (const member of members) {
        const organizations = [
          ...new Set(
            world.history.organizationParticipations
              .filter((row) => row.personId === member.personId)
              .map((row) => row.organizationId),
          ),
        ];
        for (const organizationId of organizations)
          for (const date of [world.currentDate, makeIsoDate("2035-01-01")]) {
            const input = {
              town: base.jurisdictionId,
              organizationId,
              personId: member.personId,
              termYears: rules?.termYears?.value ?? 4,
              termStartsAt: date,
            };
            const facts = {
              participations: world.history.organizationParticipations,
              states: new Map(
                world.history.organizationParticipations.map((row) => [
                  row.id,
                  organizationParticipationStateHistory(world, row.id),
                ]),
              ),
              limitInForce: oldLimits.councilTermLimitInForce(
                world,
                base.jurisdictionId,
                date,
              ),
              consecutiveTerms:
                oldLimits.MOST_COMMON_COUNCIL_TERM_LIMIT.consecutiveTerms,
            };
            expect(
              consecutiveCouncilYears(
                facts,
                organizationId,
                member.personId,
                date,
              ),
            ).toEqual(
              oldLimits.consecutiveCouncilYears(
                world,
                organizationId,
                member.personId,
                date,
              ),
            );
            const limit = councilTermLimitBar(facts, input),
              old = oldLimits.councilTermLimitBar(world, input);
            expect(limit !== null).toBe(old !== null);
            if (limit) expect(old).toContain(String(limit.served));
          }
      }

      for (const date of [
        makeIsoDate("2027-04-06"),
        makeIsoDate("2028-11-07"),
        makeIsoDate("2029-11-06"),
      ])
        for (const mayor of [true, false])
          for (const personId of world.personOrder.slice(0, 6)) {
            const facts = {
              rules,
              calendar: {
                timing: resolveMunicipalElectionTiming(
                  unit.stateUsps,
                  unit.placeGeoid ?? unit.publisherId,
                ),
                profile: oldLocal.LOCAL_ELECTIONS_PROFILE,
              },
              plan,
              map,
              home: map
                ? oldWard.homePosition(world, base.jurisdictionId, personId)
                : null,
            };
            expect(localCampaignSeat(facts, mayor, date)).toBe(
              oldLocal.localCampaignSeat(unit, mayor, date, {
                world,
                town: base.jurisdictionId,
                personId,
              }),
            );
          }
      const date = makeIsoDate("2031-01-02");
      world = {
        ...world,
        currentDate: date,
        currentMoment: simulationMomentAtLocalTime({
          date,
          minuteOfDay: 0,
          timeZone: world.currentMoment.timeZone,
        }),
      };
      const due = censusRedrawDue(map, date);
      const drawn = oldLocal.redistrictAfterCensus(
        world,
        unit,
        base.jurisdictionId,
      );
      if (due) {
        const expected = oldWard.redrawTownWards(world, {
          unit,
          town: base.jurisdictionId,
          drawnBy: oldWard.wardDrawerInForce(world, unit, base.jurisdictionId),
          members,
          reason: `after the ${due.censusYear} census`,
        });
        expect(oldWard.townWardMap(drawn, unit)).toEqual(
          oldWard.townWardMap(expected, unit),
        );
      } else expect(oldWard.townWardMap(drawn, unit)).toEqual(map);
    },
  );
});
