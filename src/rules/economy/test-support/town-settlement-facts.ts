/** Raw dated roles/payers, illness/care and separately owned legal benefit-rate sources; no pay periods or gross/cash outcomes are borrowed. */
import { addDays, daysBetween } from "../../../simulation/dates";
import { workRoleAt, workStatusAt } from "../../../simulation/life-queries";
import {
  payPayerAt,
  payWorkplaceAt,
} from "../../../simulation/pay-coverage-predicates";
import { epidemicWorkAbsences } from "../../../simulation/crisis/epidemic";
import { residenceStateKey } from "../../../simulation/statutory-tax";
import { paidLeaveBenefitRate } from "../../../simulation/paid-leave-benefits";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../../../simulation/life-places";
import { STATES } from "../../../simulation/state-reference";
import { lawFacts } from "../../laws/test-support/law-facts";
import { payPeriodEndingOn } from "../payday-and-shift";
import { payLawSourceKey } from "../law-pay-effects";
import { settlementSourceKey } from "../resource-settlement";
import {
  townSettlementSourceKey,
  type TownSettlementFacts,
  type TownCompensationPeriod,
} from "../town-settlement";
import type {
  World,
  IsoDate,
  HistoricalCutoff,
} from "../../../simulation/types";
export function townSettlementFacts(
  world: World,
  since: IsoDate,
  periods: readonly TownCompensationPeriod[] = [],
): TownSettlementFacts {
  const earliest =
    daysBetween(since, world.currentDate) > 400
      ? addDays(world.currentDate, -400)
      : since;
  const dates: IsoDate[] = [];
  for (let d = earliest; d <= world.currentDate; d = addDays(d, 1))
    dates.push(d);
  dates.push(
    ...periods.flatMap((p) => [p.periodStartsAt, p.periodEndsAt, p.onDate]),
  );
  const cutoffs: HistoricalCutoff[] = [...new Set(dates)].map((asOfDate) => ({
    asOfDate,
    historySequenceExclusive: world.history.nextSequence,
  }));
  cutoffs.push(
    ...world.history.events
      .filter((e) => e.type === "life-paths2.work-session")
      .map((e) => ({
        asOfDate: e.occurredAt,
        historySequenceExclusive: e.sequence + 1,
      })),
  );
  const payers = new Map(),
    life = new Map();
  for (const cutoff of cutoffs)
    for (const work of world.history.workRelationships) {
      payers.set(
        settlementSourceKey(work.id, cutoff),
        payPayerAt(world, work.id, cutoff),
      );
      life.set(payLawSourceKey(work.id, cutoff), {
        role: workRoleAt(world, work.id, cutoff),
        status: workStatusAt(world, work.id, cutoff),
        workplace: payWorkplaceAt(world, work.id, cutoff),
      });
    }
  const absences = new Map();
  for (const d of dates)
    for (const period of [
      "weekly",
      "biweekly",
      "semimonthly",
      "monthly",
    ] as const)
      for (const phase of [0, 1]) {
        const window = payPeriodEndingOn(period, d, phase);
        if (window) {
          const key = townSettlementSourceKey(window.startsAt, window.endsAt);
          if (!absences.has(key))
            absences.set(
              key,
              epidemicWorkAbsences(world, window.startsAt, window.endsAt),
            );
        }
      }
  for (const p of periods)
    absences.set(
      townSettlementSourceKey(p.periodStartsAt, p.periodEndsAt),
      epidemicWorkAbsences(world, p.periodStartsAt, p.periodEndsAt),
    );
  const residenceStates = new Map(
      world.personOrder.map((id) => [id, residenceStateKey(world, id)]),
    ),
    states = [
      ...new Set([...residenceStates.values()].filter((s): s is string => !!s)),
    ],
    leaveRates = new Map();
  for (const state of states)
    for (const d of dates)
      leaveRates.set(
        townSettlementSourceKey(state, d),
        paidLeaveBenefitRate(world, state, d),
      );
  return {
    id: world.id,
    currentDate: world.currentDate,
    onDate: world.currentDate,
    records: world.history,
    people: world.people,
    jurisdictions: world.jurisdictions,
    policyCatalog: world.policyCatalog,
    payers,
    earned: new Map(),
    legal: {
      ...lawFacts(world, [], [world.currentDate], [undefined]),
      bindings: world.history.ruleChangeConsequenceBindings ?? [],
      ruleProvisions: world.history.ruleChangeProvisions ?? [],
    },
    life,
    places: new Map(
      world.jurisdictionOrder.map((id) => [id, lifePlaceByJurisdictionId(id)]),
    ),
    states: new Map(
      Object.keys(STATES).map((s) => [
        "US-" + s,
        stateJurisdictionForKey("US-" + s),
      ]),
    ),
    absences,
    residenceStates,
    leaveRates,
  };
}
