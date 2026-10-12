import { describe, it, expect, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { addDays, simulationMomentOnLocalDate } from "../../simulation/dates";
import { ensureNationalElectionJurisdiction } from "../../simulation/national-election-geography";
import * as native from "../../simulation/living-world/town-pay";
import { applyLawConsequences } from "../../simulation/enacted-law-effects";
import { ensureLifePathPersonalPosition } from "../../simulation/life-paths2-resources";
import { recordResourceTransferOutcomes } from "../../simulation/resources";
import { assessPaychecksTaxes } from "../../simulation/statutory-tax";
import { recordLocalPayrollTaxBases } from "../../simulation/payroll-tax-bases";
import { recordPaycheckTaxBases } from "../../simulation/paycheck-tax-bases";
import { payPaidLeaveClaims } from "../../simulation/paid-leave-benefits";
import { cancelFutureDueItem } from "../../simulation/future-transitions";
import { writeWithWorldIntegrityOnce } from "../../simulation/world";
import { worker, completed } from "./test-support/resource-earned-source";
import { townSettlementFacts } from "./test-support/town-settlement-facts";
import { lawPayHost } from "./test-support/law-pay-host";
import * as own from "./town-settlement";
import type { World, IsoDate } from "../../simulation/types";
function run(
  world: World,
  since: IsoDate,
  except: null,
  periods?: readonly own.TownCompensationPeriod[],
) {
  const expected = periods
    ? native.settleTownCompensations(world, periods)
    : native.payTownPaydays(world, since, except);
  const gen = periods
    ? own.settleTownCompensations(
        townSettlementFacts(world, since, periods),
        periods,
      )
    : own.payTownPaydays(townSettlementFacts(world, since), since, except);
  let current = world,
    step = gen.next();
  // LAW owns raw resolution and binding. Replace only its public hourly-pay target with the complete own closure; canonical parent receipts are used solely to verify full earned DTO intake.
  const original = native.applyLawPayConsequence;
  const adapter = vi
    .spyOn(native, "applyLawPayConsequence")
    .mockImplementation((w, input) => lawPayHost(w, input, original));
  try {
    writeWithWorldIntegrityOnce(world, () => {
      while (!step.done) {
        const r = step.value;
        switch (r.kind) {
          case "applyLawConsequences":
            current = applyLawConsequences(current, r.input);
            break;
          case "ensureLifePathPersonalPosition":
            current = ensureLifePathPersonalPosition(current, ...r.input);
            break;
          case "recordResourceTransferOutcomes":
            current = recordResourceTransferOutcomes(current, r.input);
            break;
          case "assessPaychecksTaxes":
            current = assessPaychecksTaxes(current, r.input);
            break;
          case "recordLocalPayrollTaxBases":
            current = recordLocalPayrollTaxBases(current, r.input);
            break;
          case "recordPaycheckTaxBases":
            current = recordPaycheckTaxBases(current, r.input);
            break;
          case "payPaidLeaveClaims":
            current = payPaidLeaveClaims(current, r.input);
            break;
        }
        step = gen.next(townSettlementFacts(current, since, periods));
      }
      return current;
    });
  } finally {
    adapter.mockRestore();
  }
  expect(current).toEqual(expected);
  return current;
}
describe.each(Object.keys(STATES))(
  "full town payday/compensation parent in US-%s",
  (usps) => {
    it("matches actual wages, complete catch-up/order/cash/earned/tax requests and repeat settlement", () => {
      const f = smallWorld({
          place: "US-" + usps,
          people: 4,
          date: "2026-01-05",
          seed: "rules2:town-settle:" + usps,
        }),
        hired = worker(
          ensureNationalElectionJurisdiction(f.world),
          f.jurisdictionId,
          true,
          false,
          false,
          false,
        );
      let world = hired.world;
      const date = addDays(world.currentDate, 28);
      for (const item of world.history.futureDueItems)
        if (item.dueAt < date)
          world = cancelFutureDueItem(world, {
            stableKey: item.stableKey + ":rules2-pay-source-clock",
            dueItemId: item.id,
            effectiveAt: world.currentDate,
            reasonKey: "test:pay-clock-only",
            context: "Labeled pay-parent source clock, not NPC play.",
          });
      world = {
        ...world,
        currentDate: date,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
      };
      const paid = run(world, f.world.currentDate, null);
      expect(paid.history.resourceTransferOutcomes.length).toBeGreaterThan(
        world.history.resourceTransferOutcomes.length,
      );
      run(paid, f.world.currentDate, null);
      const earned = completed(usps),
        a = earned.assessment,
        period = {
          payFlowId: a.resourceFlowId,
          activityId: a.workRelationshipId,
          stableKey: "rules2:earned-settle:" + usps,
          periodStartsAt: a.periodStartsAt,
          periodEndsAt: a.periodEndsAt,
          onDate: earned.world.currentDate,
          completedShift: {
            eventId: a.completionEventId,
            termsId: a.earnedTermsId,
            amount: a.contractualGross,
          },
        };
      const result = run(earned.world, earned.world.currentDate, null, [
        period,
        period,
      ]);
      run(result, earned.world.currentDate, null, [period]);
    }, 120000);
  },
);
