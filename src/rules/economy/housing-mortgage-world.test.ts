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
import { setFutureDueItemTerminalState } from "../../simulation/future-transitions";
import * as nativePrice from "../../simulation/living-world/housing-market";
import * as nativeMortgage from "../../simulation/mortgage-financing";
import {
  homePurchaseReason as nativeReason,
  homePurchaseTerms as nativeTerms,
} from "../../simulation/home-purchase";
import { moneyText as nativeMoney } from "../../simulation/money-text";
import { createResourcePosition, money } from "../../simulation/resources";
import { createStableId } from "../../simulation/ids";
import { NATIONAL_ELECTION_JURISDICTION } from "../../simulation/national-election-geography";
import {
  homePriceLevels,
  homePriceLevel,
  housingLawEffect,
  HOUSING_SUPPLY_LAWS,
} from "./housing-prices";
import {
  mortgageFinancingQuote,
  openingMortgageFinancingQuote,
} from "./mortgage-quotes";
import {
  homePurchaseReason,
  homePurchaseTerms,
  moneyText,
} from "./home-purchase-records";
import { housingFacts } from "./test-support/housing-facts";
import type {
  World,
  EntityId,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
  LegislativeProvisionRecord,
} from "../../simulation/types";
// Exact labeled saved-law control from the already gated law fixture; not ordinary enactment.
function savedLaw(
  world: World,
  questionKey: string,
  jurisdictionId: EntityId,
  amount: number | null,
): World {
  const q = Object.values(world.policyCatalog.propositions).find(
    (q) => q.stableKey === questionKey,
  )!;
  const seq = world.history.nextSequence;
  const key = "rules2:" + questionKey;
  const measure = {
    id: createStableId("legislative-measure", world.id + key),
    stableKey: key,
    sequence: seq,
    jurisdictionId,
    rulePackId:
      jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id
        ? "US:congress"
        : "fixture:state",
    designation: "HB 910",
    shortTitle: "Authored saved law",
    summary: "Explicit saved-law reader control; no ordinary enactment claim.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-01-01"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [q.id],
    propositionAnswers: [{ propositionId: q.id, answer: "yes" }],
  } as LegislativeMeasureRecord;
  const provision = {
    id: createStableId("legislative-provision", world.id + key + ":terms"),
    stableKey: key + ":terms",
    sequence: seq + 1,
    measureId: measure.id,
    provisionKey: key + ":floor",
    sectionNumber: 1,
    heading: "Authored numeric target",
    text: "Explicit adopted numeric control.",
    filedAt: makeIsoDate("2026-01-01"),
    supersedesProvisionId: null,
    ...(amount === null
      ? {}
      : {
          lawTerms: [
            { questionKey, key: "floor", unit: "minor", value: amount },
          ],
        }),
  } as unknown as LegislativeProvisionRecord;
  const enactment = {
    id: createStableId("legislative-enactment", world.id + key + ":enactment"),
    stableKey: key + ":enactment",
    sequence: seq + 2,
    measureId: measure.id,
    resolvedAt: makeIsoDate("2026-01-02"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate("2026-01-03"),
    outcomeEventId: createStableId("event", world.id + key + ":event"),
  } as LegislativeEnactmentRecord;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: seq + 3,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeProvisions: [
        ...(world.history.legislativeProvisions ?? []),
        provision,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}
const provenance = {
  kind: "authored" as const,
  note: "Saved purchase-balance control, not ordinary earned wealth.",
};
describe("economy complete housing/mortgage source and private rounding owners", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-01",
        household: true,
        seed: "rules2:economy:housing:" + usps,
      });
      const conditioned = ensureWorldStartingConditions(base.world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      });
      let world = ensureMacroEconomyStarted(
        conditioned,
        macroStartForHistory(macroStartingConditions(conditioned)),
      );
      const compare = (w: World) => {
        const f = housingFacts(w);
        const mortgage = { onDate: w.currentDate, store: w.macroEconomy };
        for (const jurisdictionId of [
          base.jurisdictionId,
          base.stateJurisdictionId,
          null,
        ]) {
          expect(homePurchaseTerms(f, jurisdictionId)).toEqual(
            nativeTerms(w, jurisdictionId),
          );
          for (const principalMinor of [0, 1, 100000, 25000000])
            for (const rateCap of [
              null,
              {
                capBasisPoints: 300,
                measureId: createStableId(
                  "legislative-measure",
                  "rules2:controlled-cap",
                ),
              },
            ] as const) {
              const input = {
                principal: money(principalMinor, "USD"),
                jurisdictionId,
                rateCap,
              };
              expect(mortgageFinancingQuote(mortgage, input)).toEqual(
                nativeMortgage.mortgageFinancingQuote(w, input),
              );
            }
        }
        const homePrice = money(25000000, "USD");
        for (const downPaymentShare of [0, 0.1, 0.23, 1])
          for (const paidMonths of [0, 1, 120, 359, 360, 361]) {
            const input = {
              homePrice,
              downPaymentShare,
              paidMonths,
              jurisdictionId: base.jurisdictionId,
              rateCap: null,
            };
            expect(openingMortgageFinancingQuote(mortgage, input)).toEqual(
              nativeMortgage.openingMortgageFinancingQuote(w, input),
            );
          }
        expect(homePurchaseReason(f, base.personId)).toEqual(
          nativeReason(w, base.personId),
        );
        for (const personId of w.personOrder)
          expect(homePurchaseReason(f, personId)).toEqual(
            nativeReason(w, personId),
          );
        for (const minorUnits of [-12345, 0, 1, 100, 999999])
          for (const currency of ["USD", "EUR"])
            expect(moneyText({ minorUnits, currency })).toEqual(
              nativeMoney({ minorUnits, currency }),
            );
        expect(
          homePriceLevels(
            f.prices.months.filter((m) => m.scope === "national"),
          ),
        ).toEqual(
          nativePrice.homePriceLevels(
            w.macroEconomy?.months.filter((m) => m.scope === "national") ?? [],
          ),
        );
        expect(
          homePriceLevel(f.prices, base.jurisdictionId, w.currentDate),
        ).toEqual(
          nativePrice.homePriceLevel(w, base.jurisdictionId, w.currentDate),
        );
      };
      compare(world);
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
        world = createMacroMonthlyStepHandler([])(incoming, due).world;
        world = setFutureDueItemTerminalState(world, {
          stableKey: "rules2:housing:resolved:" + month,
          dueItemId: due.id,
          effectiveAt: due.dueAt,
          status: "resolved",
          reasonKey: null,
          context:
            "Controlled native monthly-handler boundary; not ordinary advance.",
          outcomeEventId: null,
        });
        compare(world);
      }
      for (const balance of [0, 500000000]) {
        const funded = createResourcePosition(world, {
          stableKey: "rules2:housing:cash:" + balance,
          owner: { kind: "person", personId: base.personId },
          openedAt: world.currentDate,
          openingBalance: money(balance, "USD"),
          provenance,
        });
        compare(funded);
      }
      const saved = savedLaw(
        world,
        HOUSING_SUPPLY_LAWS[0],
        base.stateJurisdictionId,
        null,
      );
      const dates = [
        "2026-01-03",
        "2027-01-02",
        "2027-01-03",
        "2028-01-03",
      ].map(makeIsoDate);
      const own = housingFacts(saved, dates);
      for (const date of dates)
        expect(housingLawEffect(own.prices, base.jurisdictionId, date)).toEqual(
          nativePrice.housingLawEffect(saved, base.jurisdictionId, date),
        );
    });
});
