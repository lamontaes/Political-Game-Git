import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import { stableHash } from "../ids";
import {
  isLawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import { lawInForceAtStart } from "../governing/law-in-force";
import type { EntityId, World } from "../types";
import { BUDGET_PROGRAMS, sum } from "./store";
import { openGovernmentBudget } from "./opening";
import { settleGovernmentMonth, type MonthFlows } from "./month";
import { PARKS_DEDICATION_QUESTION } from "./rules";
import { parksBudgetChange } from "./parks-dedication";

const date = makeIsoDate("2026-08-01");
const catalog = createProductionPolicyCatalog();
const proposition = Object.values(catalog.propositions).find(
  (row) => row.stableKey === PARKS_DEDICATION_QUESTION,
)!;
const seed = "team5-parks-saved-government-budget-five-states";
// The Census spending corpus covers states/DC; territories remain a research gap.
const states = [...lifePlaceStateIdentities()]
  .filter(
    (row) =>
      !row.jurisdictionKey.startsWith("US-AS") &&
      !row.jurisdictionKey.startsWith("US-GU") &&
      !row.jurisdictionKey.startsWith("US-MP") &&
      !row.jurisdictionKey.startsWith("US-PR") &&
      !row.jurisdictionKey.startsWith("US-VI"),
  )
  .sort((a, b) =>
    stableHash(`${seed}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${seed}:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5);
const flows: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};

describe("parks costs on the saved state budget", () => {
  it.each(states)(
    "saves real expenditure, cash trade-off and stamp in $jurisdictionKey",
    (state) => {
      const jurisdiction = stateJurisdictionForKey(state.jurisdictionKey)!;
      const world = {
        id: "world_parks_budget" as EntityId,
        seed,
        currentDate: date,
        policyCatalog: catalog,
        people: {},
        jurisdictions: { [jurisdiction.id]: jurisdiction },
        jurisdictionOrder: [jurisdiction.id],
        history: {
          nextSequence: 20,
          organizations: [],
          resourceFlows: [],
          resourceTransferOutcomes: [],
          futureDueItems: [],
          legislativeMeasures: [],
          legislativeEnactments: [],
        },
      } as unknown as World;
      const opened = openGovernmentBudget(
        world,
        {
          key: state.jurisdictionKey,
          jurisdictionId: jurisdiction.id,
          lawJurisdictionId: jurisdiction.id,
          level: "state",
          name: state.jurisdictionKey,
          stateKey: state.jurisdictionKey,
          geoid: null,
        },
        date,
      );
      expect(typeof opened).not.toBe("string");
      if (typeof opened === "string") throw new Error(opened);
      const began = lawInForceAtStart(
        world,
        jurisdiction.id,
        proposition.id,
        date,
      );
      const enacted = {
        ...world,
        history: {
          ...world.history,
          legislativeMeasures: [
            {
              id: "measure_parks_budget" as EntityId,
              jurisdictionId: jurisdiction.id,
              propositionIds: [proposition.id],
              propositionAnswers: [
                {
                  propositionId: proposition.id,
                  answer: began === "yes" ? "no" : "yes",
                },
              ],
            },
          ],
          legislativeEnactments: [
            {
              id: "enactment_parks_budget" as EntityId,
              sequence: 10,
              measureId: "measure_parks_budget" as EntityId,
              resolvedAt: makeIsoDate("2026-06-01"),
              effectiveAt: makeIsoDate("2026-07-01"),
              outcome: "enacted",
            },
          ],
        },
      } as unknown as World;
      const before = settleGovernmentMonth(
        world,
        opened,
        date,
        flows,
      ).government;
      const after = settleGovernmentMonth(
        enacted,
        opened,
        date,
        flows,
      ).government;
      const plain = before.months.at(-1)!;
      const row = after.months.at(-1)!;
      const cost = parksBudgetChange(enacted, opened, date)!;
      const at = BUDGET_PROGRAMS.indexOf("parks");
      const actualDelta = row.spending[at]! - plain.spending[at]!;
      expect(actualDelta).toBe(
        Math.max(0, plain.spending[at]! + Math.round(cost.dollars)) -
          plain.spending[at]!,
      );
      expect(sum(row.revenue)).toBe(sum(plain.revenue));
      expect(row.balance - plain.balance).toBe(-actualDelta);
      const stamps =
        (row as typeof row & LawEffectStampedRecord).lawEffectStamps ?? [];
      const stamp = stamps.find((s) => s.effectKind === "parks-spending");
      expect(isLawEffectStamp(stamp)).toBe(true);
      expect(stamp?.governingLawKey).toBe("measure_parks_budget");
      expect(stamp?.jurisdictionId).toBe(opened.lawJurisdictionId);
      expect(
        (JSON.parse(JSON.stringify(after)) as typeof after).months.at(-1),
      ).toEqual(row);
      expect(
        settleGovernmentMonth(enacted, after, date, flows).government,
      ).toBe(after);
      mkdirSync("test-results/team-5-parks-cost", { recursive: true });
      writeFileSync(
        `test-results/team-5-parks-cost/${state.jurisdictionKey}.json`,
        JSON.stringify(
          {
            seed,
            stateKey: state.jurisdictionKey,
            governmentKey: opened.key,
            jurisdictionId: opened.lawJurisdictionId,
            population: opened.population,
            month: date,
            lawId: cost.law.measureId,
            beginningAnswer: began,
            operativeAnswer: cost.law.answer,
            researchedMonthlyComponentUsd: cost.dollars,
            beforeParksUsd: plain.spending[at],
            afterParksUsd: row.spending[at],
            actualDeltaUsd: actualDelta,
            beforeBalanceUsd: plain.balance,
            afterBalanceUsd: row.balance,
            lawCostAttributions: row.lawCostAttributions,
            lawEffectStamps: stamps,
            serializedRowEqual: true,
            duplicateSettlementPreserved: true,
          },
          null,
          2,
        ),
      );
      console.info(
        "PARKS-SAVED-COST",
        seed,
        state.jurisdictionKey,
        opened.population,
        cost.dollars,
        actualDelta,
        row.balance - plain.balance,
      );
    },
  );
});
