import { describe, expect, it, vi } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { lifePlaces } from "../life-places";
import { personName } from "../people";
import { resourceFlowTermsAt } from "../resource-queries";
import {
  createResourceFlow,
  money,
  recordResourceFlowTerms,
} from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { LawConsequenceRow } from "../law-consequence-types";
import type startingLaw from "../../../data/research/laws/starting-law-2026.json";
import { resolvePriceCostConsequences } from "./price-cost";

const fixture = vi.hoisted(
  () =>
    ({
      question: "us-policy-positions:housing-land-use.rent-stabilization",
      term: "annual-rent-cap-ratio",
    }) as const,
);
// Only the starting-law DATA is controlled; the actual dated G2 reader and
// price handler are unchanged. These two ratios are fictional contract inputs.
vi.mock(
  "../../../data/research/laws/starting-law-2026.json",
  async (importOriginal) => {
    const original = await importOriginal<{ default: typeof startingLaw }>();
    const data = original.default;
    return {
      default: {
        ...data,
        questions: {
          ...data.questions,
          [fixture.question]: {
            ...data.questions[fixture.question],
            answers: Object.fromEntries(
              Object.keys(data.questions[fixture.question].answers).map(
                (key) => [
                  key,
                  {
                    answer: "yes",
                    operativeAt: "2026-01-01",
                    lawTerms: [
                      {
                        questionKey: fixture.question,
                        key: fixture.term,
                        unit: "ratio",
                        value: 0.1,
                      },
                    ],
                    phases: [
                      {
                        answer: "yes",
                        operativeAt: "2026-02-01",
                        lawTerms: [
                          {
                            questionKey: fixture.question,
                            key: fixture.term,
                            unit: "ratio",
                            value: 0.05,
                          },
                        ],
                      },
                    ],
                  },
                ],
              ),
            ),
          },
        },
      },
    };
  },
);

const SEED = "team4-a57-dated-starting-price-terms-all56-20261001";
const available = [...lifePlaces()];
const rng = new SeededRng(SEED);
const places = Array.from(
  { length: 5 },
  () => available.splice(rng.integer(0, available.length), 1)[0]!,
);
const row: LawConsequenceRow = {
  id: "fixture:dated-starting-price",
  kind: "price-cost",
  when: "renewal",
  who: { selector: "person-price-flows", predicates: [] },
  what: "set-resource-flow-price",
  amount: {
    op: "sum",
    operands: [
      { op: "record", key: "prior-flow-minor", unit: "minor" },
      {
        op: "product",
        left: { op: "record", key: "prior-flow-minor", unit: "minor" },
        right: { op: "term", key: fixture.term, unit: "ratio" },
      },
    ],
  },
  conditions: [
    {
      capability: "price-flow-basis",
      parameters: { basisKind: "custom:dated-price-fixture" },
    },
  ],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: ["fixture:dated-starting-price"],
    population: "Controlled named payer",
    scope: "Fictional dated starting terms, not a production rent cap",
    why: "A saved activity reads the term on its own date.",
    uncertainty: "No real statutory rate or numeric production-row admission.",
  },
};

describe("A57 price terms use the saved activity date on the declared foundation", () => {
  it.each(places)(
    "preserves the dated price for $displayName ($key), seed " + SEED,
    (place) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: place.key,
        startAge: 30,
        questionnaire: "skipped",
        seed: `${SEED}:${place.key}`,
      });
      let world = game.world;
      const proposition = Object.values(world.policyCatalog.propositions).find(
        (p) => p.stableKey === fixture.question,
      )!;
      world = {
        ...world,
        policyCatalog: {
          ...world.policyCatalog,
          propositions: {
            ...world.policyCatalog.propositions,
            [proposition.id]: { ...proposition, consequences: [row] },
          },
        },
      };
      const town = world.people[game.playerPersonId]!.homeJurisdictionId;
      world = createResourceFlow(world, {
        stableKey: "fixture:dated-contract",
        source: { kind: "person", personId: game.playerPersonId },
        recipient: {
          kind: "person",
          personId: world.personOrder.find((id) => id !== game.playerPersonId)!,
        },
        startsAt: world.currentDate,
        amount: money(200_000, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: "custom:dated-price-fixture",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: town,
        provenance: {
          kind: "authored",
          note: "Controlled actual contract, not a sourced rent amount.",
        },
      });
      const flow = world.history.resourceFlows.at(-1)!;
      const old = resourceFlowTermsAt(world, flow.id)!;
      world = recordResourceFlowTerms(world, {
        stableKey: "fixture:dated-renewal",
        resourceFlowId: flow.id,
        effectiveAt: world.currentDate,
        status: "active",
        amount: money(250_000, "USD"),
        cadenceKind: old.cadenceKind,
        reason: "Controlled saved renewal before the next starting-law phase.",
        provenance: flow.provenance,
        supersedesTermsId: old.id,
      });
      const activity = world.history.resourceFlowTerms.at(-1)!;
      const context = {
        onDate: activity.effectiveAt,
        activity: "renewal" as const,
        activityId: activity.id,
        subjectIds: [game.playerPersonId],
      };
      // A later observation date is controlled here; this is not a clock test.
      const date = makeIsoDate("2026-03-01");
      const later = {
        ...world,
        currentDate: date,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
      };
      const before = serializeWorld(later);
      const original = resolvePriceCostConsequences(world, row, context)[0]!;
      const historical = resolvePriceCostConsequences(later, row, context)[0]!;
      expect(historical.value).toMatchObject({
        type: "amount",
        value: 220_000,
        unit: "minor",
        currency: "USD",
      });
      expect(historical.value).toEqual(original.value);
      expect(historical.sourceRecordIds).toEqual(original.sourceRecordIds);
      expect(historical.sourceRecordIds).toContain(activity.id);
      expect(historical.sourceRecordIds).toContain(historical.law.measureId);
      expect(
        historical.sourceRecordIds.some((id) => id.startsWith("provision_")),
      ).toBe(false);
      expect(lawInForce(later, town!, proposition.id)!.operativeAt).toBe(
        "2026-02-01",
      );
      expect(serializeWorld(later)).toBe(before);
      expect(
        resolvePriceCostConsequences(deserializeWorld(before), row, context)[0],
      ).toEqual(historical);
      console.log(
        `${personName(later.people[game.playerPersonId]!)}, ${place.displayName}, seed ${SEED}:${place.key}; saved activity ${activity.id} on ${activity.effectiveAt}: 200000 × (1+fictional0.1)=220000 cents; later phase fictional0.05 is not substituted. No payment or production rent cap.`,
      );
    },
  );
});
