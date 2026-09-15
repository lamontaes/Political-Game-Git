import { createLegislativeScenario } from "../../src/simulation/legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
} from "../../src/simulation/legislation";
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import { publishLegislativeTransition } from "../../src/presentation/publish-legislative-transition";
import { advanceWorld, assertWorldIntegrity } from "../../src/simulation/world";
import { daysBetween, makeIsoDate } from "../../src/simulation/dates";
import {
  createTaxTransitionHandlerRegistry,
  attachTaxProposal,
  taxPowerEvidenceFor,
} from "../../src/simulation/tax-policy";
import { createResourcePosition, money } from "../../src/simulation/resources";
import type { TaxTerms } from "../../src/simulation/tax-types";

export const TEST_TAX_TERMS: TaxTerms = {
  seriesKey: "tax:test-excise",
  baseKey: "tax-base:test-activity",
  baseLabel: "fictional test activity",
  rateNumerator: 5,
  rateDenominator: 100,
  exemptBaseKeys: [],
  allowanceMinorUnits: 100,
  currency: money(0, "USD").currency,
  collectionLagDays: 2,
  publicPurpose: "general public services (authored test)",
  assumptionNote:
    "Fictional test base and rate; no real current tax, behavioral response or forecast.",
  legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
};

/** Existing institutional writers and explicitly authored scenario decisions.
 * No electoral evaluation, forecast or alternate enactment shortcut is used.
 */
export function proposalFixture(terms: TaxTerms = TEST_TAX_TERMS) {
  const scenario = createLegislativeScenario("alaska");
  let world = advanceWorld(
    scenario.world,
    daysBetween(scenario.world.currentDate, makeIsoDate("2027-01-20")),
    createTaxTransitionHandlerRegistry(),
  );
  world = introduceMeasure(world, {
    stableKey: "tax-test:measure",
    jurisdictionId: scenario.world.jurisdictionOrder[0]!,
    rulePackId: scenario.pack.packId,
    designation: "HB Tax Test (authored)",
    shortTitle: "Authored tax test",
    summary: "Explicit fictional tax test.",
    origin: "member-introduction",
    subjectClass: "revenue",
    sponsorPersonId: scenario.playerPersonId,
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = attachTaxProposal(world, {
    stableKey: "tax-test:proposal",
    measureId,
    sponsorPersonId: scenario.playerPersonId,
    power: taxPowerEvidenceFor("US-AK")!,
    terms,
  });
  const procedure = { ...scenario, measureId };
  return {
    world,
    procedure,
    personId: scenario.playerPersonId,
    proposalId: world.history.taxProposals!.at(-1)!.id,
  };
}

const enactedFixtureCache = new Map<
  string,
  ReturnType<typeof proposalFixture>
>();
export function enactedTaxFixture(
  opening: number | null = 10000,
  terms = TEST_TAX_TERMS,
) {
  const cacheKey = JSON.stringify(terms);
  const cached = enactedFixtureCache.get(cacheKey);
  const fixture = cached ?? proposalFixture(terms);
  let world = fixture.world;
  for (
    let index = 0;
    index < 40 &&
    measurePosition(world, fixture.procedure.measureId).phase !== "enacted";
    index++
  ) {
    const step = availableMeasureSteps(world, fixture.procedure.measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `No supported next step: ${measurePosition(world, fixture.procedure.measureId).phase}`,
      );
    const before = world;
    world = publishLegislativeTransition(
      before,
      applyLegislativeStep(fixture.procedure, world, step).world,
    );
  }
  if (
    measurePosition(world, fixture.procedure.measureId).phase !== "enacted" ||
    world.history.taxPolicies?.length !== 1
  )
    throw new Error(
      "The fixture must complete actual canonical enactment and tax policy recording.",
    );
  if (!cached) enactedFixtureCache.set(cacheKey, { ...fixture, world });
  if (opening !== null)
    world = createResourcePosition(world, {
      stableKey: "tax-test:payer",
      owner: { kind: "person", personId: fixture.personId },
      openedAt: world.currentDate,
      openingBalance: money(opening, "USD"),
      provenance: {
        kind: "authored",
        note: "Known fictional test cash; not an observational income figure.",
      },
    });
  assertWorldIntegrity(world);
  return { ...fixture, world };
}

export function enactSecondTaxVersion(
  fixture: ReturnType<typeof enactedTaxFixture>,
  terms: TaxTerms,
) {
  let world = advanceWorld(
    fixture.world,
    1,
    createTaxTransitionHandlerRegistry(),
  );
  const jurisdictionId = world.history.taxProposals![0]!.jurisdictionId;
  world = introduceMeasure(world, {
    stableKey: "tax-test:version-2:measure",
    jurisdictionId,
    rulePackId: fixture.procedure.pack.packId,
    designation: "HB Tax Version Test (authored)",
    shortTitle: "Authored prospective tax version",
    summary: "A fictional version used to prove non-retroactive collection.",
    origin: "member-introduction",
    subjectClass: "revenue",
    sponsorPersonId: fixture.personId,
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = attachTaxProposal(world, {
    stableKey: "tax-test:version-2",
    measureId,
    sponsorPersonId: fixture.personId,
    power: taxPowerEvidenceFor("US-AK")!,
    terms,
  });
  const procedure = { ...fixture.procedure, measureId };
  for (
    let index = 0;
    index < 40 && measurePosition(world, measureId).phase !== "enacted";
    index++
  ) {
    const key = availableMeasureSteps(world, measureId).find(
      (row) => row !== "offer-amendment",
    );
    if (!key) throw new Error("No supported next step for second tax version.");
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(procedure, world, key).world,
    );
  }
  if (world.history.taxPolicies?.length !== 2)
    throw new Error(
      "Both versions must be enacted through the canonical writers.",
    );
  return {
    ...fixture,
    world,
    secondProposalId: world.history.taxProposals!.at(-1)!.id,
  };
}
