import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
  createMacroMonthlyStepHandler,
  MACRO_MONTHLY_STEP_KEY,
} from "../../simulation/macro-economy/producer";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import { simulationMomentOnLocalDate } from "../../simulation/dates";
import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "../../simulation/life";
import { createResourceFlow, money } from "../../simulation/resources";
import * as nativeEmployment from "../../simulation/living-world/town-employment";
import * as nativeMeasures from "../../simulation/living-world/town-economy-measures";
import * as nativeLabor from "../../simulation/living-world/town-labor-market";
import {
  townHourlyPayCents as nativeHourly,
  TOWN_PAY_VERSION,
} from "../../simulation/living-world/town-pay";
import * as own from "./labor-readings";
import { laborReadingFacts } from "./test-support/labor-facts";
import type { World } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Labeled canonical job/pay/status controls, not ordinary NPC hiring or job loss.",
};
function compare(world: World, town: World["jurisdictionOrder"][number]) {
  const facts = laborReadingFacts(world);
  expect(own.townResidents(facts, town)).toEqual(
    nativeEmployment.townResidents(world, town),
  );
  for (const resident of nativeEmployment.townResidents(world, town))
    expect(own.laborStatus(facts, resident)).toEqual(
      nativeEmployment.laborStatus(world, resident),
    );
  expect(own.activeWorkers(facts)).toEqual(
    nativeEmployment.activeWorkers(world),
  );
  expect(own.townHourlyPayCents(facts, town)).toEqual(
    nativeHourly(world, town),
  );
  expect(own.townUnemploymentRate(facts, town)).toEqual(
    nativeMeasures.townUnemploymentRate(world, town),
  );
  expect(own.townMedianHourlyPay(facts, town)).toEqual(
    nativeMeasures.townMedianHourlyPay(world, town),
  );
  expect(own.townUnemploymentPressure(facts, town)).toEqual(
    nativeLabor.townUnemploymentPressure(world, town),
  );
  for (const id of world.personOrder)
    for (const through of [
      makeIsoDate("2026-01-01"),
      world.currentDate,
      makeIsoDate("2026-12-31"),
    ])
      expect(own.jobsLostBy(facts, id, through)).toEqual(
        nativeLabor.jobsLostBy(world, id, through),
      );
}
describe("full labor/status/recorded hourly-pay public parents across all 56 native Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          people: 12,
          seed: "rules2:economy:labor:" + usps,
        });
        const town = fixture.jurisdictionId;
        compare(fixture.world, town);
        let world = createOrganization(fixture.world, {
          stableKey: "rules2:labor:employer",
          formedAt: fixture.world.currentDate,
          provenance,
          initialProfile: {
            name: "Authored pay-record employer",
            classification: "enterprise:retail",
            locationJurisdictionId: town,
          },
        });
        const organizationId = world.history.organizations.at(-1)!.id;
        const adults = world.personOrder.filter(
          (id) =>
            ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
        );
        expect(adults.length).toBeGreaterThan(0);
        for (const [index, period] of (
          ["weekly", "biweekly", "semimonthly", "monthly"] as const
        ).entries()) {
          const hours = index % 2 ? 20 : 40;
          const personId = adults[index % adults.length]!;
          world = createWorkRelationship(world, {
            stableKey: `${nativeEmployment.TOWN_EMPLOYMENT_VERSION}:${town}:job:fixture:${index}`,
            personId,
            organizationId,
            startedAt: world.currentDate,
            kind: "employment:staff",
            compensation: "paid",
            authority: "directed",
            dependency: "dependent",
            economicRisk: "organization-borne",
            provenance,
            initialRole: {
              title: "Saved paid clerk",
              occupationClassification: "occupation:office-clerk",
              locationJurisdictionId: town,
              timeDemand: {
                expectedWeekly: { minimumHours: hours, maximumHours: hours },
                attention: "high",
                concurrency: "mostly-exclusive",
                scheduleRigidity: "mixed",
                interruptibility: "limited",
                locationJurisdictionId: town,
              },
            },
          });
          const work = world.history.workRelationships.at(-1)!;
          world = createResourceFlow(world, {
            stableKey: `${TOWN_PAY_VERSION}:job-pay:fixture:${index}`,
            source: { kind: "organization", organizationId },
            recipient: { kind: "person", personId },
            startsAt: world.currentDate,
            amount: money(40000 + index * 10000, "USD"),
            cadenceKind: `schedule:town-${period}-0`,
            basisKind: "compensation:work",
            basisReference: { kind: "work", workRelationshipId: work.id },
            restrictionKind: null,
            jurisdictionId: town,
            provenance,
          });
        }
        compare(world, town);
        expect(
          own.townHourlyPayCents(laborReadingFacts(world), town).length,
        ).toBe(4);
        const work = world.history.workRelationships.at(-1)!;
        world = recordWorkStatus(world, {
          stableKey: "rules2:labor:ended:" + work.id,
          supersedesStatusId: world.history.workStatuses
            .filter((row) => row.workRelationshipId === work.id)
            .at(-1)!.id,
          workRelationshipId: work.id,
          status: "ended",
          effectiveAt: world.currentDate,
          reason: nativeLabor.TOWN_JOB_END_REASONS.laidOff,
          provenance,
        });
        compare(world, town);
        expect(
          own.jobsLostBy(laborReadingFacts(world), work.personId).length,
        ).toBeGreaterThan(0);
        const conditioned = ensureWorldStartingConditions(world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        });
        const initial = ensureMacroEconomyStarted(
          conditioned,
          macroStartForHistory(macroStartingConditions(conditioned)),
        );
        const due = initial.history.futureDueItems.find(
          (row) => row.transitionKey === MACRO_MONTHLY_STEP_KEY,
        )!;
        const source = createMacroMonthlyStepHandler([
          {
            key: "fixture:labor-source-month",
            origins: () => [],
            ends: () => [],
          },
        ])(
          {
            ...initial,
            currentDate: due.dueAt,
            currentMoment: simulationMomentOnLocalDate(
              initial.currentMoment,
              due.dueAt,
            ),
          },
          due,
        ).world;
        expect(source.macroEconomy!.months.length).toBeGreaterThan(0);
        compare(source, town);
        // Labeled raw macro-reading controls; not recorded ordinary unemployment or actor outcomes.
        for (const unemploymentPct of [0, 2.1, 4.2, 12.6, 100]) {
          const saved = {
            ...source,
            macroEconomy: {
              ...source.macroEconomy!,
              months: source.macroEconomy!.months.map((row) => ({
                ...row,
                unemploymentPct,
              })),
            },
          };
          expect(
            own.townUnemploymentPressure(laborReadingFacts(saved), town),
          ).toEqual(nativeLabor.townUnemploymentPressure(saved, town));
        }
      },
      30000,
    );
});
