import { describe, expect, it, vi } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import * as effects from "../enacted-law-effects";
import {
  hudRentRowFor,
  renewTownLeases,
  startTownLeases,
  townLeases,
} from "../living-world/town-rent";
import { deserializeWorld, serializeWorld } from "../serialization";
import { personName } from "../people";
import { withWorldIntegrityDeferred } from "../world";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { lifePlaceByKey } from "../life-places";
import { SeededRng } from "../rng";
import { cancelFutureDueItem } from "../future-transitions";
import * as housing from "../living-world/housing-market";
import { resourceFlowTermsAt } from "../resource-queries";
import type { LawConsequenceRow } from "../law-consequence-types";
import type startingLaw from "../../../data/research/laws/starting-law-2026.json";

const controlled = vi.hoisted(
  () =>
    ({
      question: "us-policy-positions:housing-land-use.rent-stabilization",
    }) as const,
);
// Authored 3% contract input, not a claim about any state's statutory cap.
vi.mock(
  "../../../data/research/laws/starting-law-2026.json",
  async (importOriginal) => {
    const original = await importOriginal<{ default: typeof startingLaw }>();
    const question = original.default.questions[controlled.question];
    return {
      default: {
        ...original.default,
        questions: {
          ...original.default.questions,
          [controlled.question]: {
            ...question,
            answers: Object.fromEntries(
              Object.keys(question.answers).map((key) => [
                key,
                {
                  answer: "yes",
                  operativeAt: "2026-01-01",
                  lawTerms: [
                    {
                      questionKey: controlled.question,
                      key: "cap",
                      unit: "ratio",
                      value: 0.03,
                    },
                  ],
                },
              ]),
            ),
          },
        },
      },
    };
  },
);

describe("the actual lease renewal activity hook", () => {
  it("dispatches after saving actual renewal terms, with their payer/date/identity, once", () => {
    const seed = "team4-m10-renewal-activity-20260930";
    const supported = PLACE_POPULATION_ROWS.split(";")
      .map((row) => row.split(":")[0]!)
      .filter((key) => {
        const place = lifePlaceByKey(key);
        return place && hudRentRowFor(place.context.jurisdiction.id);
      });
    const placeKey = new SeededRng(seed).pick(supported);
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!;
    let initial = startTownLeases(game.world, game.world.currentDate);
    // This is a focused renewal hook fixture, not a simulated year. Cancel
    // unrelated scheduled activities through their writer before moving to
    // the anniversary; preserve their records and canonical save validation.
    initial = withWorldIntegrityDeferred(() => {
      let isolated = initial;
      const states = new Map(
        initial.history.futureDueItemStates.map((state) => [
          state.dueItemId,
          state,
        ]),
      );
      for (const item of initial.history.futureDueItems) {
        if (states.get(item.id)?.status !== "scheduled") continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `fixture:renewal-only:${item.id}`,
          dueItemId: item.id,
          effectiveAt: initial.currentDate,
          reasonKey: "fixture:isolated-renewal",
          context:
            "Controlled anniversary hook fixture; not a year progression proof.",
        });
      }
      return isolated;
    });
    const lease = townLeases(initial).find(
      (entry) => entry.regime === "market" && !entry.ended,
    )!;
    expect(lease).toBeDefined();
    const day = makeIsoDate(
      `${Number(initial.currentDate.slice(0, 4)) + 1}-${lease.flow.startsAt.slice(5, 7)}-01`,
    );
    const due = {
      ...initial,
      currentDate: day,
      currentMoment: simulationMomentOnLocalDate(initial.currentMoment, day),
    };
    const calls: { activityId: string; personId: string; date: string }[] = [];
    const dispatch = vi
      .spyOn(effects, "applyLawConsequences")
      .mockImplementation((world, context) => {
        const terms = world.history.resourceFlowTerms.find(
          (record) => record.id === context.activityId,
        )!;
        expect(terms).toBeDefined();
        expect(terms.effectiveAt).toBe(context.onDate);
        const savedLease = townLeases(world, day).find(
          (entry) => entry.flow.id === terms.resourceFlowId,
        )!;
        expect(context.activity).toBe("renewal");
        expect(context.subjectIds).toEqual([savedLease.leaseholderId]);
        calls.push({
          activityId: terms.id,
          personId: savedLease.leaseholderId,
          date: day,
        });
        return world;
      });
    try {
      const changed = withWorldIntegrityDeferred(() =>
        renewTownLeases(due, day),
      );
      expect(calls.length).toBeGreaterThan(0);
      const count = calls.length;
      expect(renewTownLeases(changed, day)).toBe(changed);
      expect(calls).toHaveLength(count);
      const reopened = deserializeWorld(serializeWorld(changed));
      expect(renewTownLeases(reopened, day)).toBe(reopened);
      expect(calls).toHaveLength(count);
      console.log(
        `M10 actual renewal hook seed=${seed}: ${calls.length} saved activities, ${personName(changed.people[lease.leaseholderId]!)} in ${game.world.jurisdictions[lease.town]?.name}, ${day}. No numeric row admitted.`,
      );
    } finally {
      dispatch.mockRestore();
    }
  });
  it("A57 leaves the proposal uncapped and applies a controlled final 3% term through the native kind", () => {
    const seed = "team4-m10-renewal-activity-20260930";
    const supported = PLACE_POPULATION_ROWS.split(";")
      .map((row) => row.split(":")[0]!)
      .filter((key) => {
        const place = lifePlaceByKey(key);
        return place && hudRentRowFor(place.context.jurisdiction.id);
      });
    const placeKey = new SeededRng(seed).pick(supported);
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!;
    let initial = startTownLeases(game.world, game.world.currentDate);
    // This is a focused renewal hook fixture, not a simulated year. Cancel
    // unrelated scheduled activities through their writer before moving to
    // the anniversary; preserve their records and canonical save validation.
    initial = withWorldIntegrityDeferred(() => {
      let isolated = initial;
      const states = new Map(
        initial.history.futureDueItemStates.map((state) => [
          state.dueItemId,
          state,
        ]),
      );
      for (const item of initial.history.futureDueItems) {
        if (states.get(item.id)?.status !== "scheduled") continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `fixture:renewal-only:${item.id}`,
          dueItemId: item.id,
          effectiveAt: initial.currentDate,
          reasonKey: "fixture:isolated-renewal",
          context:
            "Controlled anniversary hook fixture; not a year progression proof.",
        });
      }
      return isolated;
    });
    const lease = townLeases(initial).find(
      (entry) => entry.regime === "market" && !entry.ended,
    )!;
    expect(lease).toBeDefined();
    const day = makeIsoDate(
      `${Number(initial.currentDate.slice(0, 4)) + 1}-${lease.flow.startsAt.slice(5, 7)}-01`,
    );
    const due = {
      ...initial,
      currentDate: day,
      currentMoment: simulationMomentOnLocalDate(initial.currentMoment, day),
    };
    const old = resourceFlowTermsAt(due, lease.flow.id)!.amount.minorUnits;
    const row: LawConsequenceRow = {
      id: "fixture:a57-native-three-percent",
      kind: "price-cost",
      when: "renewal",
      who: { selector: "person-price-flows", predicates: [] },
      what: "set-resource-flow-price",
      amount: {
        op: "minimum",
        operands: [
          { op: "record", key: "current-flow-minor", unit: "minor" },
          {
            op: "sum",
            operands: [
              { op: "record", key: "prior-flow-minor", unit: "minor" },
              {
                op: "product",
                left: { op: "record", key: "prior-flow-minor", unit: "minor" },
                right: { op: "term", key: "cap", unit: "ratio" },
              },
            ],
          },
        ],
      },
      conditions: [
        {
          capability: "price-flow-basis",
          parameters: { basisKind: lease.flow.basisKind },
        },
      ],
      lag: { days: 0, sourceIds: [] },
      onRepeal: "recompute-prospective",
      evidence: {
        sourceIds: ["fixture:a57-three-percent"],
        population: "Actual named fixture leaseholder",
        scope: "Controlled 3% term, not real OR/CA eligibility",
        why: "The final typed term limits this saved renewal.",
        uncertainty: "No production numeric row or natural-year proof.",
      },
    };
    const proposition = Object.values(due.policyCatalog.propositions).find(
      (p) => p.stableKey === controlled.question,
    )!;
    const withRow = {
      ...due,
      policyCatalog: {
        ...due.policyCatalog,
        propositions: {
          ...due.policyCatalog.propositions,
          [proposition.id]: { ...proposition, consequences: [row] },
        },
      },
    };
    const home = vi
      .spyOn(housing, "homePriceLevel")
      .mockImplementation((_world, _town, date) => (date >= day ? 1.2 : 1));
    const nativeDispatch = effects.applyLawConsequences;
    const calls: { activityId: string; personId: string; date: string }[] = [];
    const dispatch = vi
      .spyOn(effects, "applyLawConsequences")
      .mockImplementation((world, context) => {
        const terms = world.history.resourceFlowTerms.find(
          (record) => record.id === context.activityId,
        )!;
        expect(terms).toBeDefined();
        expect(terms.effectiveAt).toBe(context.onDate);
        const savedLease = townLeases(world, day).find(
          (entry) => entry.flow.id === terms.resourceFlowId,
        )!;
        expect(context.activity).toBe("renewal");
        expect(context.subjectIds).toEqual([savedLease.leaseholderId]);
        calls.push({
          activityId: terms.id,
          personId: savedLease.leaseholderId,
          date: day,
        });
        if (terms.resourceFlowId === lease.flow.id)
          expect(terms.amount.minorUnits).toBe(
            Math.round((old * 1.2) / 100) * 100,
          );
        return nativeDispatch(world, context);
      });
    try {
      const changed = withWorldIntegrityDeferred(() =>
        renewTownLeases(withRow, day),
      );
      expect(calls.length).toBeGreaterThan(0);
      const priced = resourceFlowTermsAt(changed, lease.flow.id)!;
      expect(priced.amount.minorUnits).toBe(old + old * 0.03);
      expect(priced.lawEffectStamps?.length).toBeGreaterThan(0);
      expect(changed.history.resourceTransferOutcomes).toEqual(
        due.history.resourceTransferOutcomes,
      );
      const count = calls.length;
      expect(renewTownLeases(changed, day)).toBe(changed);
      expect(calls).toHaveLength(count);
      const reopened = deserializeWorld(serializeWorld(changed));
      expect(renewTownLeases(reopened, day)).toBe(reopened);
      expect(calls).toHaveLength(count);
      console.log(
        `M10 actual renewal hook seed=${seed}: ${calls.length} saved activities, ${personName(changed.people[lease.leaseholderId]!)} in ${game.world.jurisdictions[lease.town]?.name}, ${day}. Controlled starting-law 3% term; no real statutory rate or enacted-bill producer proof.`,
      );
    } finally {
      dispatch.mockRestore();
      home.mockRestore();
    }
  });
});
