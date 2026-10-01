import {
  stepCredit,
  type MacroCreditState,
  type MacroGrowthDrivers,
} from "./credit";
import { CRUNCH46_PROVISIONAL_POLICY as POLICY } from "./policy";
import {
  NO_INNOVATIONS,
  roundMacro,
  stepEraConditions,
  stepMonth,
  type MacroEra,
  type MacroImpulses,
  type MacroInnovations,
  type MacroMonthlyState,
} from "./kernel";

/**
 * One national month under Build 19's conditions: the era moves (with no
 * recession drawn and nothing else drawn either), the credit stocks move from
 * last month's record and the policy rate in force, and the month steps with
 * everything that pushed it, each push recorded as a driver. With no recorded
 * shock and the central bank holding its rate, the economy moves only by what
 * the stocks and anchors already hold. Pure.
 */
export interface NationalConditionsInput {
  readonly previous: MacroMonthlyState;
  readonly previousEra: MacroEra;
  readonly credit: MacroCreditState;
  readonly policyMidPct: number;
  readonly startTightness: number;
  /** Recorded shocks this month (disasters, trade, public money...). */
  readonly shockImpulses: MacroImpulses;
}

export interface NationalConditionsResult {
  readonly state: MacroMonthlyState;
  readonly era: MacroEra;
  readonly credit: MacroCreditState;
  readonly innovations: MacroInnovations;
  readonly impulses: MacroImpulses;
  readonly drivers: MacroGrowthDrivers;
}

export function stepNationalConditions(
  input: NationalConditionsInput,
): NationalConditionsResult {
  const innovations = NO_INNOVATIONS;
  const era = stepEraConditions(input.previousEra, input.previous);
  const credit = stepCredit(input.credit, {
    previousGrowthPct: input.previous.growthPct,
    previousUnemploymentPct: input.previous.unemploymentPct,
    previousInflationPct: input.previous.inflationPct,
    era,
    policyMidPct: input.policyMidPct,
    startTightness: input.startTightness,
  });
  const impulses: MacroImpulses = {
    growthPp: roundMacro(
      input.shockImpulses.growthPp +
        credit.creditPp +
        credit.ratePp +
        credit.demandPp,
    ),
    laborPp: input.shockImpulses.laborPp,
    pricePp: roundMacro(input.shockImpulses.pricePp + credit.slackPricePp),
  };
  const state = stepMonth(input.previous, innovations, impulses, era);
  const anchor = era.trendGrowthPct - era.recessionGapPp;
  return {
    state,
    era,
    credit: credit.credit,
    innovations,
    impulses,
    drivers: {
      trendPct: roundMacro(anchor),
      carriedPp: roundMacro(
        POLICY.monthly.growthPersistence * (input.previous.growthPct - anchor),
      ),
      creditPp: credit.creditPp,
      ratePp: credit.ratePp,
      demandPp: credit.demandPp,
      shocksPp: input.shockImpulses.growthPp,
      chancePp: innovations.growth,
    },
  };
}
