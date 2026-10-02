import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createWorld } from "../world";
import { createStableId } from "../ids";
import { enactCostLawFixture } from "../../../tests/fixtures/enacted-cost-law-fixture";
import { legislatureProfilePackId } from "../legislature-game-profile";
import { deserializeWorld, serializeWorld } from "../serialization";
import { type LawEffectStampedRecord } from "../law-effect-stamp";
import { withOpenedBudgets } from "./index";
import {
  lawSpendingForMonth,
  readMonthFlows,
  settleGovernmentMonth,
} from "./month";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
} from "./store";
import { ensureOpeningGovernmentAccounts } from "./opening-government-accounts";
import { SPENDING_QUESTION_EFFECTS } from "./rules";
import { lawInForce } from "../governing/law-in-force";
const AGE_VERIFICATION_COST_QUESTION =
  "us-policy-positions:technology-privacy.age-verification-for-social-media";
import type { EntityId, LegislativeMeasureRecord, World } from "../types";

const flowsFor = (world: World, government: PublicBudgetGovernment) =>
  readMonthFlows(world, {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [government],
    adjustments: [],
    unknown: [],
  }).flows;
const states = ["US-MD", "US-ID", "US-IN", "US-CA", "US-WA"];

describe("age-verification without an appropriation or actual hires produces no invoice", () => {
  it.each(states)(
    "%s keeps money and stamps unchanged without an actual cost producer",
    (stateKey) => {
      const state = stateJurisdictionForKey(stateKey)!;
      const catalog = createProductionPolicyCatalog();
      const question = Object.values(catalog.propositions).find(
        (x) => x.stableKey === AGE_VERIFICATION_COST_QUESTION,
      )!;
      const base = ensureOpeningGovernmentAccounts(
        createWorld({
          seed: "team8-age-cost:" + stateKey,
          currentDate: makeIsoDate("2026-01-05"),
          jurisdictions: [state],
          people: [],
          policyCatalog: catalog,
        }),
      );
      const government = withOpenedBudgets(
        base,
        {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [],
          adjustments: [],
          unknown: [],
        },
        base.currentDate,
      ).governments.find((x) => x.key === stateKey)!;
      expect(government).toBeDefined();
      const date = makeIsoDate("2026-05-01");
      const measure: LegislativeMeasureRecord = {
        id: createStableId("legislative-measure", "age-cost:" + stateKey),
        stableKey: "age-cost:" + stateKey,
        sequence: base.history.nextSequence,
        jurisdictionId: state.id,
        rulePackId: legislatureProfilePackId(stateKey),
        designation: "HB cost",
        shortTitle: "Authored age-verification cost fixture",
        summary: "An authored legal change for a budget attribution test.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
        introducedAt: date,
        sourceDocumentKey: null,
        policyAlternativeIds: [],
        propositionIds: [question.id],
        propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
      };
      const enacted = enactCostLawFixture(base, measure, { effectiveAt: date });
      const world = enacted.world;
      const before = settleGovernmentMonth(
        { ...base, currentDate: world.currentDate },
        government,
        date,
        flowsFor(base, government),
      ).government.months.at(-1)!;
      const afterGovernment = settleGovernmentMonth(
        world,
        government,
        date,
        flowsFor(world, government),
      ).government;
      const after = afterGovernment.months.at(-1)!;
      expect(lawInForce(world, state.id, question.id, date)?.measureId).toBe(
        enacted.measure.id,
      );
      expect(
        SPENDING_QUESTION_EFFECTS.some(
          (row) => row.questionKey === AGE_VERIFICATION_COST_QUESTION,
        ),
      ).toBe(false);
      expect(after.lawCostAttributions).toBeUndefined();
      const program = BUDGET_PROGRAMS.indexOf("administration");
      expect(after.spending[program]).toBe(before.spending[program]);
      expect(after.spending).toEqual(before.spending);
      expect(after.revenue).toEqual(before.revenue);
      expect(after.balance).toBe(before.balance);
      expect(after.lawEffectStamps).toEqual(before.lawEffectStamps);
      expect(
        lawSpendingForMonth(base, government, makeIsoDate("2026-04-01")),
      ).toEqual(BUDGET_PROGRAMS.map(() => 0));
      expect(
        lawSpendingForMonth(world, { ...government, level: "county" }, date),
      ).toEqual(BUDGET_PROGRAMS.map(() => 0));
      expect(
        lawSpendingForMonth(
          { ...world, policyCatalog: { ...catalog, propositions: {} } },
          government,
          date,
        ),
      ).toEqual(BUDGET_PROGRAMS.map(() => 0));
      const reopened = JSON.parse(JSON.stringify(after));
      expect(reopened).toEqual(after);
      const savedWorld = {
        ...world,
        publicBudgets: {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [afterGovernment],
          adjustments: [],
          unknown: [],
        },
      };
      const bytes = serializeWorld(savedWorld);
      const continued = deserializeWorld(bytes);
      expect(serializeWorld(continued)).toBe(bytes);
      expect(continued.publicBudgets!.governments[0]).toEqual(afterGovernment);
      expect(
        settleGovernmentMonth(
          continued,
          afterGovernment,
          date,
          flowsFor(continued, afterGovernment),
        ).government,
      ).toBe(afterGovernment);
      if (stateKey === "US-CA" || stateKey === "US-WA") {
        const cannabis = Object.values(catalog.propositions).find(
          (row) =>
            row.stableKey ===
            "us-policy-positions:business-commerce.legalize-cannabis-sales",
        )!;
        const ban: LegislativeMeasureRecord = {
          ...measure,
          id: ("measure_cannabis_ban_" + stateKey) as EntityId,
          stableKey: "cannabis-ban:" + stateKey,
          sequence: world.history.nextSequence,
          shortTitle: "Authored cannabis repeal preservation fixture",
          propositionIds: [cannabis.id],
          propositionAnswers: [{ propositionId: cannabis.id, answer: "no" }],
        };
        const together = enactCostLawFixture(base, [measure, ban], {
          effectiveAt: date,
        }).world;
        const onlyBanFixture = enactCostLawFixture(base, ban, {
          effectiveAt: date,
        });
        const banOnly = onlyBanFixture.world;
        const actualBanId = together.history.legislativeMeasures!.at(-1)!.id;
        const combinedFlows = flowsFor(together, government);
        const ageOnlyFlows = flowsFor(world, government);
        const combined = settleGovernmentMonth(
          together,
          government,
          date,
          combinedFlows,
        ).government;
        const saved = combined.months.at(-1)! as typeof after &
          LawEffectStampedRecord;
        const onlyBan = settleGovernmentMonth(
          banOnly,
          government,
          date,
          flowsFor(banOnly, government),
        ).government.months.at(-1)!;
        // A loss must be a difference in actual recorded receipts, never the
        // retired population-based forecast field on a cash-settled budget.
        expect(ageOnlyFlows.cash?.has(government.key)).toBe(true);
        expect(combinedFlows.cash?.has(government.key)).toBe(true);
        expect(ageOnlyFlows.recorded).toBeDefined();
        expect(combinedFlows.recorded).toBeDefined();
        const source = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");
        const ageOnlyReceipts = ageOnlyFlows.recorded!.get(government.key);
        const combinedReceipts = combinedFlows.recorded!.get(government.key);
        // A present recorded map with no entry means no positive saved transfer.
        const beforeMinorUnits =
          ageOnlyReceipts?.revenueMinorUnits[source] ?? 0;
        const afterMinorUnits =
          combinedReceipts?.revenueMinorUnits[source] ?? 0;
        const actualRevenueLoss = (beforeMinorUnits - afterMinorUnits) / 100;
        console.log(
          "CASH_LOSS_PROOF",
          JSON.stringify({
            stateKey,
            actualBanId,
            beforeMinorUnits,
            afterMinorUnits,
            baselineSourceRecordIds: ageOnlyReceipts?.sourceRecordIds ?? [],
            combinedSourceRecordIds: combinedReceipts?.sourceRecordIds ?? [],
          }),
        );
        expect(saved.revenue[source]).toBe(afterMinorUnits / 100);
        expect(actualRevenueLoss).toBeGreaterThan(0);
        expect(saved.lawEffectStamps).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              governingLawKey: actualBanId,
              effectKind: "state-revenue-loss",
            }),
          ]),
        );
        expect(saved.lawEffectStamps).toHaveLength(1);
        expect(saved.lawCostAttributions).toBeUndefined();
        expect(saved.balance).toBe(onlyBan.balance);
        expect(saved.spending).toEqual(onlyBan.spending);
        expect(JSON.parse(JSON.stringify(saved))).toEqual(saved);
        expect(
          settleGovernmentMonth(
            together,
            combined,
            date,
            flowsFor(together, combined),
          ).government,
        ).toBe(combined);
      }
      console.log(
        "COST_FIXTURE",
        stateKey,
        "population",
        government.population,
        "monthlyUSD",
        "no appropriation or actual hires",
        "measure",
        enacted.measure.id,
      );
    },
  );
});
