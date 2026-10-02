import { expect } from "vitest";
import { TEST_TAX_TERMS } from "./tax-policy-fixture";
import { createLegislativeScenario } from "../../src/simulation/legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordExecutiveAction,
} from "../../src/simulation/legislation";
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import { publishLegislativeTransition } from "../../src/presentation/publish-legislative-transition";
import {
  advanceWorld,
  createWorld,
  assertWorldIntegrity,
  recordWorldEvent,
} from "../../src/simulation/world";
import { daysBetween, makeIsoDate } from "../../src/simulation/dates";
import { createResourcePosition, money } from "../../src/simulation/resources";
import { resourcePositionAt } from "../../src/simulation/resource-queries";
import { applyLawConsequences } from "../../src/simulation/enacted-law-effects";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import {
  attachTaxProposal,
  taxPowerEvidenceFor,
  recordTaxBase,
  createTaxTransitionHandlerRegistry,
} from "../../src/simulation/tax-policy";
import type {
  LawConsequenceRow,
  LawConsequenceContext,
} from "../../src/simulation/law-consequence-types";
import type { World } from "../../src/simulation/types";
import {
  TAX_REGISTRATION,
  TAX_SELECTOR,
  TAX_ACTION,
  TAX_PREDICATE,
  TAX_AMOUNT,
} from "../../src/simulation/law-consequences/tax";

// The real question identifies this authored multi-provision bill. Its levy uses
// the existing explicitly fictional test terms, not an inferred cannabis rate.
export const QUESTION =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";
export const ROW: LawConsequenceRow = {
  id: "test:tax:typed-enacted-levy",
  kind: "tax",
  when: "assessment",
  who: {
    selector: TAX_SELECTOR,
    predicates: [{ capability: TAX_PREDICATE, parameters: {} }],
  },
  what: TAX_ACTION,
  amount: { op: "record", key: TAX_AMOUNT, unit: "minor" },
  conditions: [],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["existing:tax-policy-fixture", "sourced:alaska-tax-power"],
    population:
      "One actual saved scenario payer with an authored test occurrence.",
    scope:
      "Controlled typed-proposal integration, not real tax calibration or catalog admission.",
    why: "An operative enacted typed levy applies its own rate and allowance to the saved occurrence; the common due writer can collect only actual available cash.",
    uncertainty:
      "No catalog numeric-term mapper, starting-law mapper or naturally earned tax base is supplied.",
  },
};

type CachedTaxFixture = {
  world: World;
  personId: World["personOrder"][number];
  measureId: World["personOrder"][number];
  propositionId: World["personOrder"][number];
};
const fixtureCache = new Map<string, CachedTaxFixture>();
export function fixture(
  opening = 10000,
  amount = 2100,
  effective = true,
  questionKey = QUESTION,
  recordAuthoredBase = true,
) {
  let cache = fixtureCache.get(questionKey);
  if (!cache) {
    const scenario = createLegislativeScenario("alaska");
    let world = createWorld({
      seed: scenario.world.seed,
      currentDate: makeIsoDate("2027-01-20"),
      jurisdictions: scenario.world.jurisdictionOrder.map(
        (id) => scenario.world.jurisdictions[id]!,
      ),
      people: scenario.world.personOrder.map(
        (id) => scenario.world.people[id]!,
      ),
      policyCatalog: createProductionPolicyCatalog(),
    });
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (entry) => entry.stableKey === questionKey,
    )!;
    expect(proposition).toBeDefined();
    world = introduceMeasure(world, {
      stableKey: "tax-kind:law",
      jurisdictionId: scenario.world.jurisdictionOrder[0]!,
      rulePackId: scenario.pack.packId,
      designation: "HB Tax Kind Test (authored)",
      shortTitle: "Authored multi-provision tax test",
      summary:
        "A controlled law bundle and an explicit fictional excise levy; no actual cannabis tax rate is claimed.",
      origin: "member-introduction",
      subjectClass: "revenue",
      sponsorPersonId: scenario.playerPersonId,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    world = attachTaxProposal(world, {
      stableKey: "tax-kind:proposal",
      measureId,
      sponsorPersonId: scenario.playerPersonId,
      power: taxPowerEvidenceFor("US-AK")!,
      terms: questionKey.startsWith("us-tax-terms:")
        ? { ...TEST_TAX_TERMS, effectiveDelayDays: 90 }
        : TEST_TAX_TERMS,
    });
    const procedure = {
      ...scenario,
      measureId,
      governorAction: "signed" as const,
      governorRationale: "Explicit authored test approval of the typed levy.",
    };
    for (
      let i = 0;
      i < 40 && measurePosition(world, measureId).phase !== "enacted";
      i++
    ) {
      if (measurePosition(world, measureId).phase === "awaiting-executive") {
        world = recordExecutiveAction(world, {
          stableKey: "tax-kind:authored-signature",
          measureId,
          action: "signed",
          rationale:
            "Explicit authored signature for this controlled typed-levy contract; not an NPC decision.",
        });
        continue;
      }
      const step = availableMeasureSteps(world, measureId).find(
        (key) => key !== "offer-amendment",
      );
      if (!step)
        throw new Error("No canonical enactment step for the authored levy.");
      world = publishLegislativeTransition(
        world,
        applyLegislativeStep(procedure, world, step).world,
      );
    }
    expect(measurePosition(world, measureId).phase).toBe("enacted");
    expect(world.history.taxPolicies).toHaveLength(1);
    cache = {
      world,
      personId: scenario.playerPersonId,
      measureId,
      propositionId: proposition.id,
    };
    fixtureCache.set(questionKey, cache);
  }
  let world = cache.world;
  const policy = world.history.taxPolicies![0]!;
  if (effective)
    world = advanceWorld(
      world,
      daysBetween(world.currentDate, policy.effectiveAt),
      createTaxTransitionHandlerRegistry(),
    );
  world = {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: {
        ...world.policyCatalog.propositions,
        [cache.propositionId]: {
          ...world.policyCatalog.propositions[cache.propositionId]!,
          consequences: [ROW],
        },
      },
    },
  };
  world = createResourcePosition(world, {
    stableKey: "tax-kind:payer-cash",
    owner: { kind: "person", personId: cache.personId },
    openedAt: world.currentDate,
    openingBalance: money(opening, "USD"),
    provenance: {
      kind: "authored",
      note: "Explicit controlled opening cash; no wages or purchases are generated.",
    },
  });
  const proposal = world.history.taxProposals![0]!;
  if (recordAuthoredBase) {
    world = recordWorldEvent(world, {
      stableKey: "tax-kind:occurrence",
      type: "tax.test-occurrence",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: proposal.jurisdictionId,
      involvedEntityIds: [cache.personId],
      visibility: "private",
      tags: [],
      participants: [],
      personFactConstraints: [],
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
      summary:
        "One explicitly authored taxable occurrence for canonical assessment integration.",
    });
    world = recordTaxBase(world, {
      stableKey: "tax-kind:base",
      jurisdictionId: proposal.jurisdictionId,
      payer: { kind: "person", personId: cache.personId },
      baseKey: TEST_TAX_TERMS.baseKey,
      occurredAt: world.currentDate,
      amount: money(amount, "USD"),
      sourceEventId: world.history.events.at(-1)!.id,
      assumptionNote:
        "Existing fictional excise test terms and an authored recorded base; no real earnings or legal sales are inferred.",
    });
  }
  const context: LawConsequenceContext = {
    onDate: world.currentDate,
    activity: "assessment",
    activityId: world.history.taxBases?.at(-1)?.id ?? policy.id,
    subjectIds: [cache.personId],
    questionKey,
    governingLawId: cache.measureId,
  };
  assertWorldIntegrity(world);
  return { ...cache, world, context };
}
export function dispatch(world: World, context: LawConsequenceContext) {
  return applyLawConsequences(world, context, [TAX_REGISTRATION]);
}
export function balances(world: World, personId: World["personOrder"][number]) {
  return [
    resourcePositionAt(
      world,
      { kind: "person", personId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits,
    resourcePositionAt(
      world,
      {
        kind: "organization",
        organizationId: world.history.taxProposals![0]!.publicOrganizationId,
      },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits,
  ];
}
