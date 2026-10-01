import { describe, expect, it } from "vitest";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createWorld, recordWorldEvent } from "../world";
import { createStableId } from "../ids";
import { legislatureProfilePackId } from "../legislature-game-profile";
import { deserializeWorld, serializeWorld } from "../serialization";
import { type LawEffectStampedRecord } from "../law-effect-stamp";
import { withOpenedBudgets } from "./index";
import {
  lawSpendingForMonth,
  settleGovernmentMonth,
  type MonthFlows,
} from "./month";
import { BUDGET_PROGRAMS, PUBLIC_BUDGETS_VERSION } from "./store";
import { SPENDING_QUESTION_EFFECTS } from "./rules";
import { lawInForce } from "../governing/law-in-force";
const AGE_VERIFICATION_COST_QUESTION =
  "us-policy-positions:technology-privacy.age-verification-for-social-media";
import type {
  EntityId,
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../types";

const FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};
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
      const base = createWorld({
        seed: "team8-age-cost:" + stateKey,
        currentDate: makeIsoDate("2026-01-05"),
        jurisdictions: [state],
        people: [],
        policyCatalog: catalog,
      });
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
      const enactment: LegislativeEnactmentRecord = {
        id: createStableId(
          "legislative-enactment",
          "age-cost:" + stateKey + ":enacted",
        ),
        stableKey: "age-cost:" + stateKey + ":enacted",
        sequence: base.history.nextSequence + 1,
        measureId: measure.id,
        resolvedAt: date,
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: date,
        outcomeEventId: ("event_age_cost_" + stateKey) as EntityId,
      };
      let world: World = {
        ...base,
        currentDate: makeIsoDate("2026-06-01"),
        currentMoment: simulationMomentOnLocalDate(
          base.currentMoment,
          makeIsoDate("2026-06-01"),
        ),
        history: {
          ...base.history,
          nextSequence: base.history.nextSequence + 2,
          legislativeMeasures: [measure],
          legislativeEnactments: [enactment],
        },
      };
      world = recordWorldEvent(world, {
        stableKey: enactment.stableKey + ":outcome",
        type: "fixture.law-enacted",
        occurredAt: date,
        recordedAt: date,
        jurisdictionId: state.id,
        involvedEntityIds: [state.id],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: [],
        summary: "Authored enactment fixture, not ordinary political passage.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      world = {
        ...world,
        history: {
          ...world.history,
          legislativeEnactments: [
            { ...enactment, outcomeEventId: world.history.events.at(-1)!.id },
          ],
        },
      };
      const before = settleGovernmentMonth(
        { ...base, currentDate: world.currentDate },
        government,
        date,
        FLOWS,
      ).government.months.at(-1)!;
      const afterGovernment = settleGovernmentMonth(
        world,
        government,
        date,
        FLOWS,
      ).government;
      const after = afterGovernment.months.at(-1)!;
      expect(lawInForce(world, state.id, question.id, date)?.measureId).toBe(
        measure.id,
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
        settleGovernmentMonth(continued, afterGovernment, date, FLOWS)
          .government,
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
        const enactedBan: LegislativeEnactmentRecord = {
          ...enactment,
          id: ("enactment_cannabis_ban_" + stateKey) as EntityId,
          stableKey: ban.stableKey + ":enacted",
          sequence: world.history.nextSequence + 1,
          measureId: ban.id,
          outcomeEventId: ("event_cannabis_ban_" + stateKey) as EntityId,
        };
        const together: World = {
          ...world,
          history: {
            ...world.history,
            nextSequence: world.history.nextSequence + 2,
            legislativeMeasures: [measure, ban],
            legislativeEnactments: [enactment, enactedBan],
          },
        };
        const banOnly: World = {
          ...together,
          history: {
            ...together.history,
            legislativeMeasures: [ban],
            legislativeEnactments: [enactedBan],
          },
        };
        const combined = settleGovernmentMonth(
          together,
          government,
          date,
          FLOWS,
        ).government;
        const saved = combined.months.at(-1)! as typeof after &
          LawEffectStampedRecord & { readonly cannabisRevenueLoss?: number };
        const onlyBan = settleGovernmentMonth(
          banOnly,
          government,
          date,
          FLOWS,
        ).government.months.at(-1)!;
        expect(saved.cannabisRevenueLoss).toBeGreaterThan(0);
        expect(saved.lawEffectStamps).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              governingLawKey: ban.id,
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
          settleGovernmentMonth(together, combined, date, FLOWS).government,
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
        measure.id,
      );
    },
  );
});
