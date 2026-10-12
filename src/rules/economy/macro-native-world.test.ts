import { recordWorldEvent } from "../../simulation/world";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import { simulationMomentOnLocalDate } from "../../simulation/dates";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
  createMacroMonthlyStepHandler,
  MACRO_MONTHLY_STEP_KEY,
  shockFactor as nativeShock,
} from "../../simulation/macro-economy/producer";
import * as nativeKernel from "../../simulation/macro-economy/kernel";
import * as nativeCredit from "../../simulation/macro-economy/credit";
import { stepNationalConditions as nativeConditions } from "../../simulation/macro-economy/conditions";
import { rateConcerns as nativeConcerns } from "../../simulation/macro-economy/rate-choice";
import * as nativeRead from "../../simulation/macro-economy/readers";
import * as kernel from "./macro-kernel";
import * as credit from "./macro-credit";
import { stepNationalConditions } from "./macro-conditions";
import { recordedMacroMonths, startState, shockFactor } from "./macro-months";
import {
  macroConditionsAt,
  macroMonthHistory,
  macroReleasesAt,
} from "./macro-readings";
import { rateConcerns } from "./macro-rate-choice";
import { CHANGE_AUTHORED_IMPULSES } from "./macro-policy";
import type {
  MacroShockRecord,
  MacroScopeKey,
} from "../../simulation/macro-economy/types";
import type { World } from "../../simulation/types";
describe("economy: macro/credit private helpers through native public owners", () => {
  it.each(Object.keys(STATES))(
    "matches actual generated start and public month writer in %s",
    (usps) => {
      const base = smallWorld({
        place: `US-${usps}`,
        date: makeIsoDate("2026-01-01"),
        seed: `rules2:macro:${usps}`,
      });
      const conditioned = ensureWorldStartingConditions(base.world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      });
      let world = ensureMacroEconomyStarted(
        conditioned,
        macroStartForHistory(macroStartingConditions(conditioned)),
      );
      expect(world.macroEconomy).toBeDefined();
      const start = world.macroEconomy!.start,
        previous = startState(start),
        era = kernel.START_ERA;
      for (const midpoint of [0, 3.625, 10]) {
        const initial = credit.startCreditState(
          midpoint,
          start.initial.creditTightness,
          previous.unemploymentPct,
        );
        expect(initial).toEqual(
          nativeCredit.startCreditState(
            midpoint,
            start.initial.creditTightness,
            previous.unemploymentPct,
          ),
        );
        for (const growth of [-10, previous.growthPct, 20]) {
          const prior = { ...previous, growthPct: growth };
          const input = {
            previousGrowthPct: growth,
            previousUnemploymentPct: prior.unemploymentPct,
            previousInflationPct: prior.inflationPct,
            era,
            policyMidPct: midpoint,
            startTightness: start.initial.creditTightness,
          };
          expect(credit.stepCredit(initial, input)).toEqual(
            nativeCredit.stepCredit(initial, input),
          );
          const impulses = {
              growthPp: growth / 10,
              laborPp: 0.25,
              pricePp: -0.1,
            },
            innovation = { growth: 0, unemployment: 0, inflation: 0 };
          expect(kernel.stepMonth(prior, innovation, impulses, era)).toEqual(
            nativeKernel.stepMonth(prior, innovation, impulses, era),
          );
          expect(kernel.stepEraConditions(era, prior)).toEqual(
            nativeKernel.stepEraConditions(era, prior),
          );
          expect(
            kernel.stepLocalMonth(previous, prior, previous, impulses),
          ).toEqual(
            nativeKernel.stepLocalMonth(previous, prior, previous, impulses),
          );
          const nation = {
            previous: prior,
            previousEra: era,
            credit: initial,
            policyMidPct: midpoint,
            startTightness: start.initial.creditTightness,
            shockImpulses: impulses,
          };
          expect(stepNationalConditions(nation)).toEqual(
            nativeConditions(nation),
          );
        }
      }
      for (const lean of [-2, -1, 0, 1, 2] as const)
        for (const risk of [-2, -1, 0, 1, 2] as const) {
          const view = { inflationLean: lean, risk, deliberation: lean };
          for (const readings of [
            {
              inflationPct: null,
              unemploymentPct: null,
              unemploymentEarlierPct: null,
              normalUnemploymentPct: era.naturalRatePct,
              chargeOffPct: 0.5,
              calmChargeOffPct: 0.5,
              recentBankFailures: 0,
              policyMidPct: 3.625,
              neutralRealRatePct: 1.2,
            },
            {
              inflationPct: 10,
              unemploymentPct: 12,
              unemploymentEarlierPct: 8,
              normalUnemploymentPct: era.naturalRatePct,
              chargeOffPct: 4,
              calmChargeOffPct: 0.5,
              recentBankFailures: 2,
              policyMidPct: 10,
              neutralRealRatePct: 1.2,
            },
          ])
            expect(rateConcerns(view, readings)).toEqual(
              nativeConcerns(view, readings),
            );
        }
      // Explicit saved shock boundary controls. The native writer records an explicitly authored origin; no spontaneous disruption claim.
      world = recordWorldEvent(world, {
        stableKey: "fixture:macro:origin",
        type: "economy.controlled-origin",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [world.id],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: ["authored-control"],
        summary: "Authored saved shock-origin control.",
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
      const localScope = `jurisdiction:${base.jurisdictionId}` as MacroScopeKey;
      const shock: MacroShockRecord = {
        key: "fixture:macro:shock",
        kind: "regional-industry-downturn",
        originEventId: world.history.events[0]!.id,
        dedupeKey: "fixture:macro:origin",
        consumer: "change-macro",
        impulsesVersion: "change-authored-impulses-v1",
        geographyIds: [base.jurisdictionId],
        scope: localScope,
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
      for (const intensity of [0, 0.001, 0.75, 1])
        for (const endedAt of [
          null,
          makeIsoDate("2026-01-01"),
          makeIsoDate("2026-03-01"),
        ])
          for (const month of ["2025-12", "2026-01", "2027-01"]) {
            const input = { ...shock, intensity };
            expect(shockFactor(input, endedAt, month)).toEqual(
              nativeShock(input, endedAt, month),
            );
          }
      world = {
        ...world,
        macroEconomy: { ...world.macroEconomy!, shocks: [shock] },
      };
      for (const month of ["2026-01", "2026-02"]) {
        const due = world.history.futureDueItems.find(
          (d) =>
            d.transitionKey === MACRO_MONTHLY_STEP_KEY &&
            d.stableKey.endsWith(month),
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
            key: "fixture:midpoint",
            origins: (next) => {
              prepared = next;
              return [];
            },
            ends: () => [],
          },
        ]);
        const native = handler(incoming, due);
        expect(native.status).toBe("resolved");
        const expected = recordedMacroMonths(prepared.macroEconomy!, month);
        expect(
          native.world.macroEconomy!.months.filter(
            (r) => r.periodStart.slice(0, 7) === month,
          ),
        ).toEqual(expected);
        const facts = {
          months: native.world.macroEconomy!.months,
          releases: native.world.macroEconomy!.releases,
        };
        for (const date of [
          makeIsoDate("2025-12-31"),
          incoming.currentDate,
          makeIsoDate("2027-01-01"),
        ])
          for (const scope of ["national", localScope] as const) {
            expect(macroConditionsAt(facts, scope, date)).toEqual(
              nativeRead.macroConditionsAt(native.world, scope, date),
            );
            expect(macroMonthHistory(facts, scope, date)).toEqual(
              nativeRead.macroMonthHistory(native.world, scope, date),
            );
            expect(macroReleasesAt(facts, date)).toEqual(
              nativeRead.macroReleasesAt(native.world, date),
            );
          }
        world = native.world;
      }
    },
  );
});
