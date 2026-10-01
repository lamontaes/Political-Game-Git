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
import {
  createResourceFlow,
  money,
  recordResourceFlowTerms,
} from "../resources";
import { SeededRng } from "../rng";
import { addDays } from "../dates";
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
  const state =
    key.slice(0, 2) === "11" ? "US-DC" : place?.stateJurisdictionKey;
  if (!state || answers[state]?.answer !== "yes") continue;
  largest.set(key, { key, population: Number(population) });
}
// D.C.'s canonical place is outside the state population rows.
largest.set("US-DC", { key: "1150000", population: 0 });
const available = [...largest.values()].map((entry) => entry.key);
const rng = new SeededRng(SEED);
const places: string[] = [];
while (places.length < 5 && available.length)
  places.push(...available.splice(rng.integer(0, available.length), 1));

// Record-native controlled mechanics only: no numeric legal term is admitted.
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
      { op: "record", key: "prior-flow-minor", unit: "minor" },
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
    why: "The controlled row retains the actual prior recorded price.",
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
  const prior = resourceFlowTermsAt(world, flow.id)!;
  world = recordResourceFlowTerms(world, {
    stableKey: "fixture:priced-contract:renewal",
    resourceFlowId: flow.id,
    effectiveAt: world.currentDate,
    status: "active",
    amount: money(250_000, "USD"),
    cadenceKind: prior.cadenceKind,
    reason: "Controlled recorded renewal for handler mechanics.",
    provenance: flow.provenance,
    supersedesTermsId: prior.id,
  });
  const context: LawConsequenceContext = {
    onDate: world.currentDate,
    activity: "renewal",
    activityId: world.history.resourceFlowTerms.at(-1)!.id,
    subjectIds: [personId],
  };
  return { world, flow, context, proposition, personId, town };
}

describe("the shared price-cost handler reuses saved flow terms", () => {
  it("selects five real places rather than silently testing a smaller cohort", () => {
    expect(places).toHaveLength(5);
  });
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
      expect(terms.amount.minorUnits).toBe(200_000);
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
      console.log(
        `M10 controlled record-native proof ${placeKey}, seed=${SEED}:${placeKey}, ${personName(changed.people[personId]!)}: ${terms.amount.minorUnits} USD cents, activity ${context.activityId}. No operative numeric law admitted.`,
      );
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
  it("rejects conflicting units for a repeated term in a nested price expression", () => {
    const { world, context, proposition } = setup(places[0]!);
    const conflicting: LawConsequenceRow = {
      ...row,
      amount: {
        op: "product",
        left: { op: "term", key: "priceMinor", unit: "minor" },
        right: {
          op: "minimum",
          operands: [{ op: "term", key: "priceMinor", unit: "ratio" }],
        },
      },
    };
    const updated: World = {
      ...world,
      policyCatalog: {
        ...world.policyCatalog,
        propositions: {
          ...world.policyCatalog.propositions,
          [proposition.id]: { ...proposition, consequences: [conflicting] },
        },
      },
    };
    expect(() =>
      resolvePriceCostConsequences(updated, conflicting, context),
    ).toThrow("Price-cost term 'priceMinor' has conflicting units");
    expect(updated.history.resourceFlowTerms).toBe(
      world.history.resourceFlowTerms,
    );
  });
  it("reads flow-ID activities at their date and preserves later contract terms", () => {
    const { world, context, flow } = setup(places[0]!);
    const renewal = resourceFlowTermsAt(world, flow.id)!;
    const tomorrow = addDays(world.currentDate, 1);
    // A controlled record-native fixture, not a simulated clock advance.
    const later = recordResourceFlowTerms(
      {
        ...world,
        currentDate: tomorrow,
        currentMoment: { ...world.currentMoment, date: tomorrow },
      },
      {
        stableKey: "fixture:priced-contract:later-renewal",
        resourceFlowId: flow.id,
        effectiveAt: tomorrow,
        status: "active",
        amount: money(300_000, "USD"),
        cadenceKind: renewal.cadenceKind,
        reason:
          "Controlled later contract terms for dated activity resolution.",
        provenance: flow.provenance,
        supersedesTermsId: renewal.id,
      },
    );
    const current = later;
    const resolved = resolvePriceCostConsequences(current, row, {
      ...context,
      activityId: flow.id,
    })[0]!;
    expect(resolved.value).toMatchObject({ value: 200_000, currency: "USD" });
    expect(resolved.sourceRecordIds).toContain(renewal.id);
    expect(resolved.sourceRecordIds).not.toContain(
      later.history.resourceFlowTerms.at(-1)!.id,
    );
    expect(() => applyPriceCostConsequence(current, resolved)).toThrow(
      "no longer names the latest flow terms",
    );
    expect(resourceFlowTermsAt(current, flow.id)!.amount.minorUnits).toBe(
      300_000,
    );
    expect(current.history.resourceFlowTerms).toBe(
      later.history.resourceFlowTerms,
    );
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
        value: { type: "amount", value: 200_000, unit: "ratio" },
      }),
    ).toThrow("currency/unit");
    expect(
      resolvePriceCostConsequences(world, row, { ...context, subjectIds: [] }),
    ).toEqual([]);
    expect(
      resolvePriceCostConsequences(world, row, {
        ...context,
        questionKey: "unrelated-question",
      }),
    ).toEqual([]);
    expect(() =>
      resolvePriceCostConsequences(world, row, {
        ...context,
        onDate: addDays(world.currentDate, 1),
      }),
    ).toThrow("future activity date");
    expect(TEAM_4_PRICE_COST_REGISTRATION.kind).toBe("price-cost");
  });
});
