import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  ageOnDate,
  addDays,
  addSimulationMinutes,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import {
  createOrganization,
  createWorkRelationship,
} from "../../simulation/life";
import { organizationProfileAt } from "../../simulation/life-queries";
import {
  createScheduledActivity,
  scheduledActivityState,
} from "../../simulation/time-work";
import {
  recordWorkAbsence,
  workAbsenceAt,
} from "../../simulation/living-world/work-absence";
import { TOWN_WORKPLACES } from "../../simulation/living-world/town-employment";
import * as native from "../../simulation/living-world/work-schedules";
import {
  workSchedulesFor,
  whereaboutsAt,
  onShiftAt,
  workMomentKey,
  type WorkScheduleFacts,
} from "./work-schedules";
import type { World, SimulationMoment } from "../../simulation/types";
function facts(
  world: World,
  moments: readonly SimulationMoment[],
): WorkScheduleFacts {
  return {
    onDate: world.currentDate,
    onMoment: world.currentMoment,
    records: world.history,
    profiles: new Map(
      world.history.organizations.map((o) => [
        o.id,
        organizationProfileAt(world, o.id),
      ]),
    ),
    activityStates: new Map(
      world.history.scheduledActivities.map((a) => [
        a.id,
        scheduledActivityState(world, a.id),
      ]),
    ),
    absences: new Map(
      world.personOrder.flatMap((id) =>
        moments.map(
          (m) => [workMomentKey(id, m), workAbsenceAt(world, id, m)] as const,
        ),
      ),
    ),
    workplaces: TOWN_WORKPLACES.map((p) => ({
      key: p.key,
      existing: p.existing,
    })),
  };
}
const provenance = {
  kind: "authored" as const,
  note: "Labeled saved roster, shift and activity-priority controls; not ordinary NPC hiring.",
};
describe("economy private hours/roster/shift/offset/minute helpers through unchanged native schedules and whereabouts", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        people: 12,
        seed: "rules2:economy:work:" + usps,
      });
      const adults = base.world.personOrder.filter(
        (id) =>
          ageOnDate(base.world.people[id]!.birthDate, base.world.currentDate) >=
          18,
      );
      expect(adults.length).toBeGreaterThan(0);
      let world = createOrganization(base.world, {
        stableKey: "rules2:employer:hospital:1",
        formedAt: base.world.currentDate,
        provenance,
        initialProfile: {
          name: "Saved shift employer",
          classification: "service:hospital",
          locationJurisdictionId: base.jurisdictionId,
        },
      });
      const organizationId = world.history.organizations.at(-1)!.id;
      const titles = [
        "Nurse",
        "Nurse",
        "Physician",
        "City clerk",
        "Police officer",
        "Firefighter",
        "Cashier",
        "Server",
      ];
      for (const [index, title] of titles.entries()) {
        const personId = adults[index % adults.length]!;
        const hours = index === 6 ? 20 : 40;
        world = createWorkRelationship(world, {
          stableKey: "rules2:work:" + index,
          personId,
          organizationId,
          startedAt: world.currentDate,
          kind: "employment:staff",
          compensation: "unpaid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title,
            occupationClassification: "occupation:office-clerk",
            locationJurisdictionId: base.jurisdictionId,
            timeDemand: {
              expectedWeekly: { minimumHours: hours, maximumHours: hours },
              attention: "high",
              concurrency: "mostly-exclusive",
              scheduleRigidity: "mixed",
              interruptibility: "limited",
              locationJurisdictionId: base.jurisdictionId,
            },
          },
        });
      }
      const activityStart = addSimulationMinutes(world.currentMoment, 90);
      world = createScheduledActivity(world, {
        stableKey: "rules2:work:activity",
        title: "Saved scheduled visit",
        summary: "Explicit activity-priority edge.",
        kind: "confirmed",
        start: activityStart,
        end: addSimulationMinutes(activityStart, 30),
        participantPersonIds: [adults[0]!],
        responsiblePersonId: adults[0]!,
        location: {
          locationKey: "rules2:work:visit",
          label: "Saved visit",
          jurisdictionId: base.jurisdictionId,
        },
        sourceEntityIds: [adults[0]!],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [adults[0]!] },
      });
      const days = Array.from({ length: 15 }, (_, i) =>
        addDays(world.currentDate, i - 1),
      );
      const moments = [
        ...days.flatMap((date) =>
          [0, 6, 8, 12, 16, 19, 23].map((hour) => ({
            ...simulationMomentOnLocalDate(world.currentMoment, date),
            minuteOfDay: hour * 60,
          })),
        ),
        activityStart,
        addSimulationMinutes(activityStart, 30),
      ];
      const check = (current: World) => {
        const f = facts(current, moments);
        for (const id of current.personOrder) {
          for (const date of [current.currentDate, days[0]!, days.at(-1)!]) {
            const own = workSchedulesFor(f, id, date),
              actual = native.workSchedulesFor(current, id, date);
            const realize = (s: (typeof own)[number]) => {
              const { worksOn, ...rest } = s;
              return { ...rest, workedDays: days.map((d) => worksOn(d)) };
            };
            expect(own.map(realize)).toEqual(actual.map(realize));
            for (const [index, schedule] of own.entries())
              for (const m of moments)
                expect(onShiftAt(schedule, m)).toEqual(
                  native.onShiftAt(actual[index]!, m),
                );
          }
          for (const moment of moments)
            expect(whereaboutsAt(f, id, moment)).toEqual(
              native.whereaboutsAt(current, id, moment),
            );
        }
        expect(whereaboutsAt(f, adults[0]!, activityStart).kind).toBe(
          current === world ? "activity" : "absent",
        );
      };
      check(world);
      check(
        recordWorkAbsence(world, {
          stableKey: "rules2:work:absence",
          personId: adults[0]!,
          startsAt: activityStart,
          endsAt: addSimulationMinutes(activityStart, 10),
          reason: "Saved interval away",
          provenance,
        }),
      );
    });
});
