import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { simulationMomentOnLocalDate } from "../../simulation/dates";
import {
  createMacroMonthlyStepHandler,
  MACRO_MONTHLY_STEP_KEY,
} from "../../simulation/macro-economy/producer";
import { STATES } from "../../simulation/state-reference";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { withOpenedBudgets } from "../../simulation/public-budgets";
import { PUBLIC_BUDGETS_VERSION } from "../../simulation/public-budgets/store";
import type { StaffingBaseline } from "../../simulation/public-budgets/store";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
} from "../../simulation/macro-economy/producer";
import { realProgramFunding as native } from "../../simulation/public-budgets/staffing";
import { realProgramFunding } from "./staff-funding";
import { BUDGET_PROGRAMS } from "./budget-policy";
describe("full real-program funding public owner across all 56 generated Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          seed: "rules2:economy:staff-funding:" + usps,
        });
        const conditioned = ensureWorldStartingConditions(fixture.world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        });
        const source = ensureMacroEconomyStarted(
          conditioned,
          macroStartForHistory(macroStartingConditions(conditioned)),
        );
        const due = source.history.futureDueItems.find(
          (row) => row.transitionKey === MACRO_MONTHLY_STEP_KEY,
        )!;
        const incoming = {
          ...source,
          currentDate: due.dueAt,
          currentMoment: simulationMomentOnLocalDate(
            source.currentMoment,
            due.dueAt,
          ),
        };
        const monthly = createMacroMonthlyStepHandler([
          {
            key: "rules2:staff-funding:raw-intake",
            origins: () => [],
            ends: () => [],
          },
        ])(incoming, due).world;
        const store = withOpenedBudgets(
          source,
          {
            version: PUBLIC_BUDGETS_VERSION,
            cursor: { flows: 0, outcomes: 0 },
            governments: [],
            adjustments: [],
            unknown: [],
          },
          source.currentDate,
        );
        expect(store.governments.length).toBeGreaterThan(0);
        const states = new Map(
          store.governments.flatMap((row) => {
            const state = stateJurisdictionForKey(row.stateKey);
            return state ? [[row.stateKey, { id: state.id }] as const] : [];
          }),
        );
        const governments = store.governments
          .filter((row) => row.stateKey === `US-${usps}`)
          .filter(
            (row, index, list) =>
              list.findIndex((other) => other.level === row.level) === index,
          );
        expect(governments.length).toBeGreaterThan(0);
        for (const world of [monthly, source, fixture.world])
          for (const government of governments)
            for (const program of BUDGET_PROGRAMS) {
              const year = government.years.at(-1)!;
              const baseline: StaffingBaseline = {
                town: fixture.jurisdictionId,
                program,
                governmentKey: government.key,
                workplace: "police",
                role: "Police officer",
                headcount: 2,
                realFunding: 1,
                yearStartsOn: year.startsOn,
                economyIndex: 20000,
                since: world.currentDate,
              };
              for (const prior of [
                null,
                baseline,
                {
                  ...baseline,
                  yearStartsOn: "1900-01-01" as typeof baseline.yearStartsOn,
                },
              ])
                for (const cut of [government.cut, 0, 0.5, 1])
                  for (const economyAtAdoption of [
                    year.economyAtAdoption,
                    0,
                    10000,
                    -1,
                  ]) {
                    const selected = {
                      ...government,
                      cut,
                      years: [{ ...year, economyAtAdoption }],
                    };
                    expect(
                      realProgramFunding(
                        {
                          currentDate: world.currentDate,
                          macroEconomy: world.macroEconomy,
                          states,
                        },
                        selected,
                        program,
                        prior,
                      ),
                    ).toEqual(native(world, selected, program, prior));
                  }
              expect(
                realProgramFunding(
                  {
                    currentDate: world.currentDate,
                    macroEconomy: world.macroEconomy,
                    states,
                  },
                  { ...government, years: [] },
                  program,
                ),
              ).toEqual(native(world, { ...government, years: [] }, program));
            } // Labeled cut/index/baseline edge controls, not ordinary enacted appropriations or staffing.
      },
      30000,
    );
});
