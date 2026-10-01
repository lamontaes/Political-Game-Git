import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { lawInForce } from "../governing/law-in-force";
import { lifePlaceByKey } from "../life-places";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { personName } from "../people";
import { resourceFlowTermsAt } from "../resource-queries";
import { createResourceFlow, money } from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type {
  LawConsequenceContext,
  LawConsequenceRow,
} from "../law-consequence-types";
import type { World } from "../types";
import {
  applyPriceCostConsequence,
  resolvePriceCostConsequences,
  TEAM_4_PRICE_COST_REGISTRATION,
} from "./price-cost";

const QUESTION = "us-policy-positions:housing-land-use.rent-stabilization";
const SEED = "team4-price-kind-five-places-20260930";
const answers = startingLaw.questions[QUESTION].answers as Record<
  string,
  { answer: string }
>;
const largest = new Map<string, { key: string; population: number }>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, population] = pair.split(":") as [string, string];
  const place = lifePlaceByKey(key);
  const state = place?.stateJurisdictionKey;
  if (!state || answers[state]?.answer !== "yes") continue;
  if ((largest.get(state)?.population ?? -1) < Number(population))
    largest.set(state, { key, population: Number(population) });
}
const available = [...largest.values()].map((entry) => entry.key);
const rng = new SeededRng(SEED);
const places: string[] = [];
while (places.length < 5 && available.length)
  places.push(...available.splice(rng.integer(0, available.length), 1));

// This authored row tests kind mechanics, not a state's real 2026 rent ceiling.
const row: LawConsequenceRow = {
  id: "fixture-priced-flow-cap",
  kind: "price-cost",
  when: "renewal",
  who: { selector: "person-price-flows", predicates: [] },
  what: "set-resource-flow-price",
  amount: {
    op: "minimum",
    operands: [
      { op: "record", key: "current-flow-minor", unit: "minor" },
      {
        op: "constant",
        value: 125_000,
        unit: "minor",
        sourceIds: ["fixture:authored-price-clause"],
      },
    ],
  },
  conditions: [
    {
      capability: "price-flow-basis",
      parameters: { basisKind: "custom:priced-contract-fixture" },
    },
  ],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: ["fixture:authored-price-clause"],
    population: "actual selected person payer",
    scope: "controlled kind-handler fixture",
    why: "An authored legal ceiling limits the recorded price.",
    uncertainty:
      "Not a real 2026 rent ceiling or proof that this law sets this amount.",
  },
};

function setup(placeKey: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey,
    startAge: 30,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
    seed: `${SEED}:${placeKey}`,
  });
  let world = game.world;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === QUESTION,
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
  const personId = game.playerPersonId;
  const recipientId = world.personOrder.find((id) => id !== personId)!;
  const town = lifePlaceByKey(placeKey)!.context.jurisdiction.id;
  world = createResourceFlow(world, {
    stableKey: "fixture:priced-contract",
    source: { kind: "person", personId },
    recipient: { kind: "person", personId: recipientId },
    startsAt: world.currentDate,
    amount: money(200_000, "USD"),
    cadenceKind: "schedule:monthly",
    basisKind: "custom:priced-contract-fixture",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: town,
    provenance: {
      kind: "authored",
      note: "Controlled price-kind contract fixture, not real rent terms.",
    },
  });
  const flow = world.history.resourceFlows.at(-1)!;
  const context: LawConsequenceContext = {
    onDate: world.currentDate,
    activity: "renewal",
    activityId: flow.id,
    subjectIds: [personId],
  };
  return { world, flow, context, proposition, personId, town };
}

describe("the shared price-cost handler reuses saved flow terms", () => {
  it.each(places)(
    "changes a named payer's price and canonically reopens without duplicates in %s",
    (placeKey) => {
      const fixture = setup(placeKey);
      const { world, flow, context, personId, proposition, town } = fixture;
      const law = lawInForce(world, town, proposition.id)!;
      expect(law.answer).toBe("yes");
      const resolved = resolvePriceCostConsequences(world, row, context)[0]!;
      const changed = applyPriceCostConsequence(world, resolved);
      const terms = resourceFlowTermsAt(changed, flow.id)!;
      expect(terms.amount.minorUnits).toBe(125_000);
      expect(terms.amount.currency).toBe("USD");
      expect(terms.cadenceKind).toBe("schedule:monthly");
      expect(terms.lawEffectStamps![0]).toMatchObject({
        governingLawKey: law.measureId,
        source: "in-force-at-start",
        questionKey: QUESTION,
        appliedAt: world.currentDate,
      });
      expect(terms.lawEffectStamps![0]!.sourceRecordIds).toContain(personId);
      expect(changed.history.resourceTransferOutcomes).toBe(
        world.history.resourceTransferOutcomes,
      );
      expect(personName(changed.people[personId]!)).toBeTruthy();
      expect(applyPriceCostConsequence(changed, resolved)).toBe(changed);
      const reopened = deserializeWorld(serializeWorld(changed));
      expect(resourceFlowTermsAt(reopened, flow.id)).toEqual(terms);
      expect(applyPriceCostConsequence(reopened, resolved)).toBe(reopened);
      expect(
        serializeWorld(applyPriceCostConsequence(reopened, resolved)),
      ).toBe(serializeWorld(reopened));
    },
  );
  it("rejects missing numeric legal terms instead of reading a parameter declaration", () => {
    const { world, context, proposition } = setup(places[0]!);
    const unsupported = {
      ...row,
      amount: {
        op: "term" as const,
        key: "priceMinor",
        unit: "minor" as const,
      },
    };
    const updated: World = {
      ...world,
      policyCatalog: {
        ...world.policyCatalog,
        propositions: {
          ...world.policyCatalog.propositions,
          [proposition.id]: { ...proposition, consequences: [unsupported] },
        },
      },
    };
    expect(() =>
      resolvePriceCostConsequences(updated, unsupported, context),
    ).toThrow("Missing law amount capability: term:priceMinor");
  });
  it("rejects wrong units, stale values and unrelated subject/basis without fabricating a result", () => {
    const { world, context } = setup(places[0]!);
    const resolved = resolvePriceCostConsequences(world, row, context)[0]!;
    expect(() =>
      applyPriceCostConsequence(world, {
        ...resolved,
        value: { type: "amount", value: 1, unit: "minor", currency: "USD" },
      }),
    ).toThrow("stale or unverified");
    expect(() =>
      applyPriceCostConsequence(world, {
        ...resolved,
        value: { type: "amount", value: 125_000, unit: "ratio" },
      }),
    ).toThrow("currency/unit");
    expect(
      resolvePriceCostConsequences(world, row, { ...context, subjectIds: [] }),
    ).toEqual([]);
    expect(TEAM_4_PRICE_COST_REGISTRATION.kind).toBe("price-cost");
  });
});
