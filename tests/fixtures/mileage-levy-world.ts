import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import { publishLegislativeTransition } from "../../src/presentation/publish-legislative-transition";
import { makeIsoDate, makeSimulationMoment } from "../../src/simulation/dates";
import { recordGovernorDecisionOnMeasure } from "../../src/simulation/governing/legislative-clock";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../../src/simulation/future-transitions";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
} from "../../src/simulation/legislation";
import { createLegislativeScenario } from "../../src/scenarios/legislation";
import { recordTaxDraftIdentity } from "../../src/simulation/legislation-tax-identity";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import { MILEAGE_FEE_QUESTION } from "../../src/simulation/public-budgets/road-usage-charge-constants";
import { createResourcePosition, money } from "../../src/simulation/resources";
import {
  attachTaxProposal,
  taxPowerEvidenceFor,
} from "../../src/simulation/tax-policy";
import { createWorld } from "../../src/simulation/world";
import type { TaxTerms } from "../../src/simulation/tax-types";
import {
  stateTaxPowerEvidenceFor,
  isStateTaxInstrument,
} from "../../src/simulation/state-tax-authority";

export const MILEAGE_TEST_TERMS: TaxTerms = {
  seriesKey: "tax:test-mileage",
  baseKey: "tax-base:test-vehicle-miles",
  baseLabel: "Vehicle miles (fixture)",
  baseUnit: "vehicle-mile",
  allowanceUnits: 0,
  allowanceMinorUnits: 0,
  rateNumerator: 2,
  rateDenominator: 1,
  currency: money(0, "USD").currency,
  exemptBaseKeys: [],
  collectionLagDays: 2,
  publicPurpose: "Fixture road services",
  assumptionNote:
    "Explicit test levy at two cents per declared mile; no default or observed rate.",
  legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
};

export function createMileageLevyWorld(
  terms: TaxTerms = MILEAGE_TEST_TERMS,
  questionKey: string = MILEAGE_FEE_QUESTION,
) {
  const scenario = createLegislativeScenario("alaska");
  let world = createWorld({
    seed: scenario.world.seed,
    currentDate: makeIsoDate("2027-01-20"),
    control: scenario.world.control,
    jurisdictions: scenario.world.jurisdictionOrder.map(
      (id) => scenario.world.jurisdictions[id]!,
    ),
    people: scenario.world.personOrder.map((id) => scenario.world.people[id]!),
    policyCatalog: createProductionPolicyCatalog(),
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!;
  world = introduceMeasure(world, {
    stableKey: "mileage-test:measure",
    jurisdictionId: scenario.world.jurisdictionOrder[0]!,
    rulePackId: scenario.pack.packId,
    designation: "HB Fixture",
    shortTitle: "Fixture mileage levy",
    summary: "Controlled adopted terms.",
    origin: "member-introduction",
    subjectClass: "revenue",
    sponsorPersonId: scenario.playerPersonId,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = attachTaxProposal(world, {
    stableKey: "mileage-test:proposal",
    measureId,
    sponsorPersonId: scenario.playerPersonId,
    power: isStateTaxInstrument(terms.instrument)
      ? stateTaxPowerEvidenceFor(
          scenario.pack.jurisdictionKey,
          terms.instrument,
          world.currentDate,
        )!
      : taxPowerEvidenceFor(scenario.pack.jurisdictionKey)!,
    terms,
  });
  const proposalId = world.history.taxProposals!.at(-1)!.id;
  world = recordTaxDraftIdentity(world, proposalId);
  for (
    let guard = 0;
    guard < 40 && measurePosition(world, measureId).phase !== "enacted";
    guard++
  ) {
    if (measurePosition(world, measureId).phase === "awaiting-executive") {
      world = recordGovernorDecisionOnMeasure(
        world,
        measureId,
        "signed",
        "Explicit fixture executive choice.",
      );
      continue;
    }
    const step = availableMeasureSteps(world, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step) throw new Error("Fixture has no supported legislative step.");
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep({ ...scenario, measureId }, world, step).world,
    );
  }
  if (measurePosition(world, measureId).phase !== "enacted")
    throw new Error("Controlled mileage fixture did not enact.");
  const policy = world.history.taxPolicies!.at(-1)!;
  const before = world;
  // A controlled effective-date frontier, not elapsed generated-world proof.
  // Cancel unrelated fixture dues through their canonical writer before moving it.
  for (const due of world.history.futureDueItems) {
    if (
      futureDueItemStateAt(world, due.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled"
    )
      world = cancelFutureDueItem(world, {
        stableKey: `fixture:${due.id}:canceled`,
        dueItemId: due.id,
        effectiveAt: world.currentDate,
        reasonKey: "fixture:tax-period",
        context:
          "Controlled tax servicing fixture; unrelated scheduled activity is outside this test.",
      });
  }
  world = {
    ...world,
    currentDate: policy.effectiveAt,
    currentMoment: makeSimulationMoment({
      ...world.currentMoment,
      date: policy.effectiveAt,
    }),
  };
  world = createResourcePosition(world, {
    stableKey: "mileage-test:cash",
    owner: { kind: "person", personId: scenario.playerPersonId },
    openedAt: world.currentDate,
    openingBalance: money(10000, "USD"),
    provenance: { kind: "authored", note: "Known fixture cash." },
  });
  return {
    world,
    before,
    personId: scenario.playerPersonId,
    proposalId,
    measureId,
  };
}
