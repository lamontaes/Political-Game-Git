import {
  QUESTION,
  fixture,
  dispatch,
  balances,
} from "../../../tests/fixtures/cannabis-tax-fixture";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { withOpenedBudgets } from "../public-budgets";
import { readMonthFlows, settleGovernmentMonth } from "../public-budgets/month";
import {
  PUBLIC_BUDGETS_VERSION,
  BUDGET_SOURCES,
} from "../public-budgets/store";
import { typedTaxQuestionRow } from "../law-consequences/typed-tax-question-data";
import { describe, expect, it } from "vitest";
import { TEST_TAX_TERMS } from "../../../tests/fixtures/tax-policy-fixture";

import { advanceWorld, assertWorldIntegrity } from "../world";
import { makeIsoDate } from "../dates";

import { serializeWorld, deserializeWorld } from "../serialization";

import { createTaxTransitionHandlerRegistry } from "../tax-policy";

describe("recorded cannabis receipts replace population forecasts", () => {
  it("recorded cannabis purchases use the enacted tax rate and credit actual paid cash once", () => {
    const f = fixture();
    const seed = "overflow3:a16:typed-tax-new-game";
    const place = drawRandomPlace(seed);
    const { world: opened } = smallWorld({ place: place.key, seed, people: 3 });
    assertWorldIntegrity(opened);
    const reopened = deserializeWorld(serializeWorld(opened));
    expect(reopened.seed).toBe(seed);
    console.info(
      `A16 new game: ${place.key}; ${place.stateJurisdictionKey}; seed ${seed}`,
    );
    const question = Object.values(reopened.policyCatalog.propositions).find(
      (row) => row.stableKey === QUESTION,
    )!;
    expect(question.consequences).toContainEqual(typedTaxQuestionRow(QUESTION));
    const world = {
      ...f.world,
      policyCatalog: {
        ...f.world.policyCatalog,
        propositions: {
          ...f.world.policyCatalog.propositions,
          [f.propositionId]: {
            ...f.world.policyCatalog.propositions[f.propositionId]!,
            consequences: question.consequences,
          },
        },
      },
    };
    const assessed = dispatch(world, f.context);
    expect(assessed.history.taxAssessments).toHaveLength(1);
    expect(assessed.history.taxAssessments![0]!.taxAmount.minorUnits).toBe(100);
    expect(
      assessed.history.taxAssessments![0]!.lawEffectStamps![0]!.questionKey,
    ).toBe(QUESTION);
    expect(
      dispatch(deserializeWorld(serializeWorld(assessed)), f.context).history
        .taxAssessments,
    ).toHaveLength(1);
    // The loaded cannabis row applies ONLY the saved fictional levy and base.
    // Legalization alone supplies neither a purchase nor a legal tax rate.
    const paid = advanceWorld(
      assessed,
      TEST_TAX_TERMS.collectionLagDays,
      createTaxTransitionHandlerRegistry(),
    );
    const collection = paid.history.taxCollections!.at(-1)!;
    expect(collection.transferredAmount.minorUnits).toBe(100);
    expect(balances(paid, f.personId)).toEqual([9900, 100]);
    const empty = {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [],
      adjustments: [],
      unknown: [],
    };
    const month = makeIsoDate(`${paid.currentDate.slice(0, 7)}-01`);
    const government = withOpenedBudgets(paid, empty, month).governments.find(
      (row) =>
        row.lawJurisdictionId === paid.history.taxProposals![0]!.jurisdictionId,
    )!;
    expect(government).toBeDefined();
    const store = { ...empty, governments: [government] };
    const read = readMonthFlows(paid, store);
    const recorded = read.flows.recorded!.get(government.key)!;
    expect(
      recorded.revenueMinorUnits[BUDGET_SOURCES.indexOf("selectiveSalesTaxes")],
    ).toBe(100);
    expect(recorded.sourceRecordIds).toContain(collection.resourceOutcomeId);
    const stamp = recorded.lawEffectStamps.find(
      (s) => s.questionKey === QUESTION,
    );
    expect(stamp?.effectKind).toBe("tax-collection");
    expect(stamp?.governingLawKey).toBe(f.measureId);
    expect(stamp?.appliedAt).toBe(paid.currentDate);
    expect(stamp?.sourceRecordIds).toContain(collection.assessmentId);
    expect(stamp?.sourceRecordIds).toContain(paid.history.taxBases![0]!.id);

    const settled = settleGovernmentMonth(
      paid,
      government,
      month,
      read.flows,
    ).government;
    expect(
      settled.months.at(-1)!.revenue[
        BUDGET_SOURCES.indexOf("selectiveSalesTaxes")
      ],
    ).toBe(1);
    expect(settled.months.at(-1)!.lawEffectStamps).toContainEqual(stamp);
    const saved = deserializeWorld(
      serializeWorld({
        ...paid,
        publicBudgets: {
          ...store,
          governments: [settled],
          cursor: read.cursor,
        },
      }),
    );
    const repeated = readMonthFlows(saved, saved.publicBudgets!);
    expect(repeated.flows.recorded?.size).toBe(0);
    expect(
      settleGovernmentMonth(
        saved,
        saved.publicBudgets!.governments[0]!,
        month,
        repeated.flows,
      ).government,
    ).toBe(saved.publicBudgets!.governments[0]!);
  });
});
