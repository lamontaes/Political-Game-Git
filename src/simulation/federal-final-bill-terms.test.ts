import outlayTerms from "../../data/research/federal/federal-outlay-terms-fy2025.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { buildProductionWorld } from "../presentation/production-world";
import startingLaw from "../../data/research/laws/starting-law-2026/index";
import { createHistoryStore } from "./history";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { makeIsoDate } from "./dates";
import type { EntityId, World } from "./types";
import {
  DEBT_LIMIT_CUTS_QUESTION,
  INCREASE_FOREIGN_AID_QUESTION,
  federalLawAmountAt,
  federalOutlayChangeAt,
  federalDeficitChangePctOfGdp,
  federalAidFactor,
} from "./federal-outlay-laws";
import {
  GROW_DEFENSE_SPENDING_QUESTION,
  defenseBuildUpShare,
  defenseBoostPct,
} from "./federal-defense-spending";
import {
  CUT_FARM_SUBSIDIES_QUESTION,
  farmPaymentsCutAt,
  farmPaymentsCutPctOfLandValue,
} from "./federal-farm-subsidy-law";
import {
  EXPAND_PASSENGER_RAIL_QUESTION,
  passengerRailAppropriationAt,
  railExpansionPct,
} from "./federal-passenger-rail";

const NOW = makeIsoDate("2028-06-01");
const EFFECTIVE = makeIsoDate("2027-01-01");
const CASES = [
  [DEBT_LIMIT_CUTS_QUESTION, "offset"],
  [INCREASE_FOREIGN_AID_QUESTION, "appropriation"],
  [GROW_DEFENSE_SPENDING_QUESTION, "appropriation"],
  [CUT_FARM_SUBSIDIES_QUESTION, "cap"],
  [EXPAND_PASSENGER_RAIL_QUESTION, "appropriation"],
] as const;
// Controlled adopted-text fixtures; dollar amounts are test inputs, not proposed law.
function fixture(
  question: string,
  key: string,
  amount: number | null,
  unit = "dollars/year",
): World {
  return {
    currentDate: NOW,
    seed: "federal-final-terms",
    jurisdictions: {
      [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
    },
    policyCatalog: { propositions: { q: { id: "q", stableKey: question } } },
    history: {
      ...createHistoryStore(),
      nextSequence: 100,
      legislativeMeasures: [
        {
          id: "bill",
          sequence: 1,
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          rulePackId: "test",
          introducedAt: makeIsoDate("2026-01-01"),
          propositionIds: ["q"],
          propositionAnswers: [{ propositionId: "q", answer: "yes" }],
        },
      ],
      legislativeEnactments: [
        {
          id: "act",
          sequence: 10,
          measureId: "bill",
          outcome: "enacted",
          resolvedAt: EFFECTIVE,
          effectiveAt: EFFECTIVE,
        },
      ],
      legislativeProvisions:
        amount === null
          ? []
          : [
              {
                id: "adopted",
                sequence: 9,
                measureId: "bill",
                recordedAt: EFFECTIVE,
                supersedesProvisionId: null,
                applicationScope: {
                  jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
                  segmentKey: null,
                },
                lawTerms: [{ questionKey: question, key, unit, value: amount }],
              },
            ],
    },
  } as unknown as World;
}
function books(world: World, monthly = 100): World {
  return {
    ...world,
    publicBudgets: {
      federalGovernment: {
        months: Array.from({ length: 12 }, (_, i) => ({
          month: makeIsoDate(`2026-${String(i + 1).padStart(2, "0")}-01`),
          spending: Array(13).fill(monthly),
        })),
      },
    },
  } as unknown as World;
}

describe("federal adopted amounts replace historical policy examples", () => {
  it("opens a new production game in a random recorded place", () => {
    const seed = "team6-a28-final-bill-new-game-20261002";
    const place = drawRandomPlace(seed);
    const built = buildProductionWorld({
      seed,
      place,
      age: 34,
      givenName: null,
      familyName: null,
      startingLife: "ordinary-life",
      household: "lives-alone",
      depth: "summarize-earlier-life",
    });
    expect(built.world.people[built.playerPersonId]).toBeDefined();
    expect(
      built.world.jurisdictions[place.context.jurisdiction.id],
    ).toBeDefined();
    expect(built.world.currentDate).toBe(place.context.initialMoment.date);
    process.stdout.write(
      `A28 NEW GAME seed=${seed} place=${place.key} player=${built.playerPersonId} date=${built.world.currentDate}\n`,
    );
  });
  it.each(CASES)("reads %s using its catalog parameter %s", (question, key) => {
    expect(
      federalLawAmountAt(fixture(question, key, 2400), question, key, NOW)
        .amount,
    ).toBe(2400);
    expect(
      federalLawAmountAt(fixture(question, key, null), question, key, NOW)
        .amount,
    ).toBeNull();
    expect(
      federalLawAmountAt(
        fixture(question, key, 2400, "ratio"),
        question,
        key,
        NOW,
      ).amount,
    ).toBeNull();
  });
  it.each(CASES)(
    "reads starting and enacted %s through the same term query",
    (question, key) => {
      const data = startingLaw as unknown as {
        questions: Record<string, unknown>;
      };
      const previous = data.questions[question];
      data.questions[question] = {
        answers: {
          US: {
            answer: "yes",
            operativeAt: EFFECTIVE,
            lawTerms: [
              { questionKey: question, key, unit: "dollars/year", value: 3300 },
            ],
          },
        },
      };
      try {
        const start = fixture(question, key, null);
        const world = { ...start, history: createHistoryStore() };
        const read = federalLawAmountAt(world, question, key, NOW);
        expect(read.law?.origin).toBe("in-force-at-start");
        expect(read.amount).toBe(3300);
      } finally {
        if (previous === undefined) delete data.questions[question];
        else data.questions[question] = previous;
      }
    },
  );
  it("reads adopted amendments, ignores later text, and refuses conflicting adopted sections", () => {
    const world = fixture(
      GROW_DEFENSE_SPENDING_QUESTION,
      "appropriation",
      2400,
    );
    const first = { ...world.history.legislativeProvisions![0]!, sequence: 3 };
    const amendment = {
      ...first,
      id: "amended" as EntityId,
      sequence: 8,
      supersedesProvisionId: first.id,
      lawTerms: [{ ...first.lawTerms![0]!, value: 3600 }],
    };
    const late = {
      ...first,
      id: "late" as EntityId,
      sequence: 11,
      supersedesProvisionId: amendment.id,
      lawTerms: [{ ...first.lawTerms![0]!, value: 9999 }],
    };
    const revised = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: [first, amendment, late],
      },
    } as World;
    expect(
      federalLawAmountAt(
        revised,
        GROW_DEFENSE_SPENDING_QUESTION,
        "appropriation",
        NOW,
      ).amount,
    ).toBe(3600);
    const conflict = {
      ...amendment,
      id: "conflict" as EntityId,
      supersedesProvisionId: null,
    };
    expect(
      federalLawAmountAt(
        {
          ...revised,
          history: {
            ...revised.history,
            legislativeProvisions: [first, conflict],
          },
        },
        GROW_DEFENSE_SPENDING_QUESTION,
        "appropriation",
        NOW,
      ).amount,
    ).toBeNull();
  });
  it("sizes defense against a complete recorded spending year without a growth ramp", () => {
    const world = books(
      fixture(GROW_DEFENSE_SPENDING_QUESTION, "appropriation", 2400),
    );
    expect(defenseBuildUpShare(world, NOW).share).toBe(1);
    expect(defenseBuildUpShare(world, makeIsoDate("2027-06-01")).share).toBe(1);
    expect(
      defenseBuildUpShare(
        fixture(GROW_DEFENSE_SPENDING_QUESTION, "appropriation", 2400),
        NOW,
      ).unsupportedReason,
    ).not.toBeNull();
    expect(defenseBoostPct(world, "US-OH", NOW)).toBeNull();
  });
  it("reads debt offset and aid target, leaving missing bases unsupported", () => {
    expect(
      federalOutlayChangeAt(
        fixture(DEBT_LIMIT_CUTS_QUESTION, "offset", 700),
        NOW,
      ).cutDollars,
    ).toBe(700);
    const aid = books(
      fixture(INCREASE_FOREIGN_AID_QUESTION, "appropriation", 2400),
    );
    expect(federalOutlayChangeAt(aid, NOW).aidDollars).toBe(1200);
    expect(
      federalOutlayChangeAt(
        fixture(INCREASE_FOREIGN_AID_QUESTION, "appropriation", 2400),
        NOW,
      ).aidDollars,
    ).toBeNull();
    expect(federalDeficitChangePctOfGdp(aid, NOW)).toBe(
      (100 * 1200) / outlayTerms.nationalGdp2025,
    );
    // Foreign aid changes International Affairs, never domestic aid receipts.
    expect(federalAidFactor(aid, NOW)).toBe(1);
    const cut = books(fixture(DEBT_LIMIT_CUTS_QUESTION, "offset", 700));
    expect(federalAidFactor(cut, NOW)).toBeCloseTo(
      1 - 700 / (12 * 13 * 100),
      12,
    );
    expect(
      federalAidFactor(
        books(fixture(DEBT_LIMIT_CUTS_QUESTION, "offset", 20000)),
        NOW,
      ),
    ).toBe(0);
  });
  it("reads a per-recipient farm cap without inventing recipients or a national cut", () => {
    const world = fixture(CUT_FARM_SUBSIDIES_QUESTION, "cap", 5000);
    expect(farmPaymentsCutAt(world, NOW)).toMatchObject({
      capDollarsPerRecipient: 5000,
      cutShare: null,
      lawMeasureId: "bill",
    });
    expect(farmPaymentsCutPctOfLandValue(world, "US-OH", NOW)).toBeNull();
  });
  it("reads rail funding without turning the old forecast into delivered riders", () => {
    const world = fixture(
      EXPAND_PASSENGER_RAIL_QUESTION,
      "appropriation",
      4500,
    );
    expect(passengerRailAppropriationAt(world, NOW).amount).toBe(4500);
    expect(railExpansionPct(world, NOW)).toBeNull();
  });
});
