import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
  createMacroMonthlyStepHandler,
  MACRO_MONTHLY_STEP_KEY,
} from "../../simulation/macro-economy/producer";
import { recordBusinessCycle as nativeCycle } from "../../simulation/macro-economy/cycle";
import { recordWorldEvent } from "../../simulation/world";
import { MACRO_ECONOMY_CONTRACT_VERSION } from "../../simulation/macro-economy/types";
import { recordBusinessCycle } from "./macro-cycle";
import { releaseDrafts } from "./macro-publications";
import { recordedMacroMonths } from "./macro-months";
import { CHANGE_AUTHORED_IMPULSES } from "./macro-policy";
import type { MacroShockRecord } from "../../simulation/macro-economy/types";
import { nextMonthKey } from "./macro-calendar";
import type { World } from "../../simulation/types";
function compareCycle(world: World, month: string) {
  const native = nativeCycle(world, month);
  const gen = recordBusinessCycle(
    {
      id: world.id,
      currentDate: world.currentDate,
      macroEconomy: world.macroEconomy,
      history: { events: world.history.events },
    },
    month,
  );
  let step = gen.next();
  let carried = world;
  while (!step.done) {
    carried = recordWorldEvent(carried, step.value);
    step = gen.next(carried.history.events.at(-1)!.id);
  }
  expect(carried.history.events).toEqual(native.history.events);
  expect(step.value ?? world.macroEconomy?.cycle).toEqual(
    native.macroEconomy?.cycle,
  );
}
describe("complete publication and cycle private helpers through unchanged public owners in all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: makeIsoDate("2025-02-01"),
          seed: "rules2:economy:macro-publications:" + usps,
        });
        const conditioned = ensureWorldStartingConditions(fixture.world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        });
        let world = ensureMacroEconomyStarted(
          conditioned,
          macroStartForHistory(macroStartingConditions(conditioned)),
        );
        compareCycle(world, "2025-02");
        let month = "2025-02";
        let indicatorCount = 0;
        for (let count = 0; count < 14; count++, month = nextMonthKey(month)) {
          const due = world.history.futureDueItems.find(
            (row) =>
              row.transitionKey === MACRO_MONTHLY_STEP_KEY &&
              row.stableKey.endsWith(month),
          )!;
          expect(due).toBeDefined();
          const incoming = {
            ...world,
            currentDate: due.dueAt,
            currentMoment: simulationMomentOnLocalDate(
              world.currentMoment,
              due.dueAt,
            ),
          };
          let prepared: World = incoming;
          const handler = createMacroMonthlyStepHandler([
            {
              key: "rules2:publications:raw-intake",
              origins: (next) => {
                prepared = next;
                return [];
              },
              ends: () => [],
            },
          ]);
          const result = handler(incoming, due);
          expect(result.status).toBe("resolved");
          const store = {
            ...prepared.macroEconomy!,
            months: [
              ...prepared.macroEconomy!.months,
              ...recordedMacroMonths(prepared.macroEconomy!, month),
            ],
          };
          const drafts = releaseDrafts(store, month);
          const actual = result.world.macroEconomy!.releases.slice(
            incoming.macroEconomy!.releases.length,
          );
          expect(actual).toHaveLength(drafts.length);
          for (let index = 0; index < drafts.length; index++) {
            const draft = drafts[index]!,
              receipt = actual[index]!;
            expect(receipt).toEqual({
              key: `${MACRO_ECONOMY_CONTRACT_VERSION}:release:national:${draft.indicator}:${draft.periodKey}`,
              indicator: draft.indicator,
              scope: "national",
              referencePeriodStart: draft.referencePeriodStart,
              referencePeriodEnd: draft.referencePeriodEnd,
              releasedAt: incoming.currentDate,
              value: draft.value,
              unit: draft.unit,
              valueClass: "simulated-publication",
              sourceMonthKeys: draft.sourceMonthKeys,
              eventId: receipt.eventId,
            });
            expect(
              result.world.history.events.find(
                (row) => row.id === receipt.eventId,
              )?.summary,
            ).toBe(draft.summary);
            if (draft.indicator !== "unemployment-rate") indicatorCount++;
          }
          compareCycle(result.world, month);
          world = result.world;
        }
        expect(indicatorCount).toBeGreaterThan(1);
        // Explicit read-only growth/driver controls over the actual saved contiguous month records. These are not ordinary NPC recessions.
        for (const [index, type] of (
          [
            "economy.policy-rate-decided",
            "economy.bank-failed",
            "rules2.macro-shock-origin",
          ] as const
        ).entries())
          world = recordWorldEvent(world, {
            stableKey: "rules2:macro:source:" + index,
            type,
            occurredAt: world.currentDate,
            recordedAt: world.currentDate,
            jurisdictionId: null,
            involvedEntityIds: [world.id],
            participants: [],
            personFactConstraints: [],
            visibility: "public",
            tags:
              type === "economy.policy-rate-decided"
                ? ["rate-change:0.25", "month:2026-03"]
                : ["authored-control"],
            summary:
              "Explicit saved cause source; not ordinary bank failure or shock.",
            context: {
              location: null,
              socialContext: null,
              pressure: null,
              choice: null,
              motivation: null,
              immediateReaction: null,
            },
          });
        const profile = CHANGE_AUTHORED_IMPULSES["regional-industry-downturn"];
        const shock: MacroShockRecord = {
          key: "rules2:macro:source:shock",
          kind: "regional-industry-downturn",
          originEventId: world.history.events.at(-1)!.id,
          dedupeKey: "rules2:macro:source:shock",
          consumer: "change-macro",
          impulsesVersion: "change-authored-impulses-v1",
          geographyIds: [fixture.jurisdictionId],
          scope: "national",
          sectors: [...profile.sectors],
          signedMagnitude: {
            growthPp: profile.growthPp,
            laborPp: profile.laborPp,
            pricePp: profile.pricePp,
            units: "percentage-points-per-month-at-full-intensity",
          },
          intensity: 0.75,
          beginsAt: world.currentDate,
          persistence: {
            kind: "geometric",
            monthlyRetention: profile.monthlyRetention,
          },
          observedState: "public",
          causalParents: [],
          modelUncertainty: "authored-unvalidated",
          schemaVersion: "change-macro/v1",
          recordedAt: world.currentDate,
        };
        world = {
          ...world,
          macroEconomy: {
            ...world.macroEconomy!,
            shocks: [...world.macroEconomy!.shocks, shock],
          },
        };
        const months = world.macroEconomy!.months;
        for (const mode of [
          "down",
          "zero",
          "mixed",
          "missing-drivers",
        ] as const) {
          const lastNational = months
            .filter((row) => row.scope === "national")
            .slice(-6)
            .map((row) => row.key);
          const altered = months.map((row) =>
            lastNational.includes(row.key)
              ? {
                  ...row,
                  shockKeys: [...row.shockKeys, shock.key],
                  growthPct:
                    mode === "down"
                      ? -1
                      : mode === "mixed"
                        ? row.ordinal % 2
                          ? -1
                          : 1
                        : 0,
                  drivers:
                    mode === "missing-drivers"
                      ? undefined
                      : {
                          ...row.drivers!,
                          creditPp: -1,
                          ratePp: -1,
                          demandPp: -1,
                          shocksPp: -1,
                          chancePp: -1,
                        },
                }
              : row,
          );
          for (const phase of ["expansion", "recession"] as const) {
            const control = {
              ...world,
              macroEconomy: {
                ...world.macroEconomy!,
                months: altered,
                cycle: { phase, sinceMonth: "2025-02", eventId: null },
              },
            };
            compareCycle(control, "2026-03");
          }
        }
      },
      120000,
    );
});
