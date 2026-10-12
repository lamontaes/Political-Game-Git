/** Same-World saved records and dated life/geography/authority receipts, with full own law/rule selectors. */
import { lawFacts } from "../../laws/test-support/law-facts";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../../../simulation/life-places";
import { workRoleAt, workStatusAt } from "../../../simulation/life-queries";
import {
  payPayerAt,
  payWorkplaceAt,
} from "../../../simulation/pay-coverage-predicates";
import { STATES } from "../../../simulation/state-reference";
import { makeIsoDate } from "../../../simulation/dates";
import {
  payLawSourceKey,
  type PayLawFacts,
  type PayLawInput,
} from "../law-pay-effects";
import { settlementSourceKey } from "../resource-settlement";
import type { World, HistoricalCutoff } from "../../../simulation/types";
export function lawPayFacts(world: World, input: PayLawInput): PayLawFacts {
  const date = makeIsoDate(input.effectiveAt),
    completion = input.completedShift
      ? world.history.events.find((e) => e.id === input.completedShift!.eventId)
      : null;
  const cutoffs: HistoricalCutoff[] = [
    { asOfDate: date, historySequenceExclusive: world.history.nextSequence },
    ...(completion
      ? [
          {
            asOfDate: completion.occurredAt,
            historySequenceExclusive: completion.sequence + 1,
          },
        ]
      : []),
  ];
  const qs = Object.values(world.policyCatalog.propositions).map((q) => q.id);
  const legal = {
    ...lawFacts(world, qs, [date], cutoffs),
    bindings: world.history.ruleChangeConsequenceBindings ?? [],
    ruleProvisions: world.history.ruleChangeProvisions ?? [],
  };
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
    legal,
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
  };
}
