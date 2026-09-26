import { createLegislativeScenario } from "../../src/simulation/legislation-scenarios";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
} from "../../src/simulation/legislation";
import { canonicalJson } from "../../src/simulation/canonical-json";
import { recordTaxDraftIdentity } from "../../src/simulation/legislation-tax-identity";
import { stateTaxServiceProfileForJurisdictionKey } from "../../src/simulation/world-setup/state-tax-service-profiles";
import { resolveLegislativeFilingEntry } from "../../src/presentation/legislative-filing-entry";
import { createWorkItem } from "../../src/simulation/time-work";
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import { publishLegislativeTransition } from "../../src/presentation/publish-legislative-transition";
import { advanceWorld, assertWorldIntegrity } from "../../src/simulation/world";
import { daysBetween, makeIsoDate } from "../../src/simulation/dates";
import {
  createTaxTransitionHandlerRegistry,
  attachTaxProposal,
  assessTaxBase,
  effectiveTaxPolicy,
  recordTaxBase,
  taxPowerEvidenceFor,
} from "../../src/simulation/tax-policy";
import { createResourcePosition, money } from "../../src/simulation/resources";
import { recordWorldEvent } from "../../src/simulation/world";
import type { EntityId, World } from "../../src/simulation/types";
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

/** A low-level tax-kernel fixture. No player action can author this base. */
export function recordTestTaxOccurrence(
  world: World,
  input: {
    personId: EntityId;
    stableKey: string;
    proposalId: EntityId;
    baseKey: string;
    amountMinorUnits: number;
    assumptionNote: string;
  },
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId
  )
    throw new Error("The test payer must be the controlled person.");
  const proposal = world.history.taxProposals?.find(
    (row) => row.id === input.proposalId,
  );
  if (!proposal) throw new Error("No recorded tax proposal.");
  const active = effectiveTaxPolicy(
    world,
    proposal.jurisdictionId,
    proposal.terms.seriesKey,
    world.currentDate,
  );
  if (!active || active.proposalId !== proposal.id)
    throw new Error(
      "This tax version is not effective for a new occurrence today.",
    );
  const prior = world.history.taxBases?.find(
    (row) => row.stableKey === input.stableKey,
  );
  if (prior) {
    if (
      prior.payer.kind !== "person" ||
      prior.payer.personId !== input.personId ||
      prior.baseKey !== input.baseKey ||
      prior.amount.minorUnits !== input.amountMinorUnits ||
      prior.assumptionNote !== input.assumptionNote
    )
      throw new Error("An existing taxable occurrence cannot be overwritten.");
    return assessTaxBase(world, prior.id, proposal.terms.seriesKey);
  }
  let next = recordWorldEvent(world, {
    stableKey: `event:${input.stableKey}`,
    type: "tax.test-fixture-occurrence",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: proposal.jurisdictionId,
    involvedEntityIds: [input.personId],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["tax", "test-fixture"],
    summary: `Test fixture taxable activity. ${input.assumptionNote}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  next = recordTaxBase(next, {
    stableKey: input.stableKey,
    jurisdictionId: proposal.jurisdictionId,
    payer: { kind: "person", personId: input.personId },
    baseKey: input.baseKey,
    occurredAt: world.currentDate,
    amount: money(input.amountMinorUnits, proposal.terms.currency),
    assumptionNote: input.assumptionNote,
    sourceEventId: next.history.events.at(-1)!.id,
  });
  return assessTaxBase(
    next,
    next.history.taxBases!.at(-1)!.id,
    proposal.terms.seriesKey,
  );
}

/** A test-only writer for the older selective-excise kernel scenarios. */
export function fileTestTaxProposalFromOffice(
  world: World,
  input: { personId: EntityId; stableKey: string; terms: TaxTerms },
): { world: World; measureId: EntityId } {
  const entry = resolveLegislativeFilingEntry(world, input.personId);
  if (entry.kind !== "available") throw new Error(entry.reason);
  const power = taxPowerEvidenceFor(entry.seat.jurisdictionKey);
  const gameProfile = power
    ? null
    : stateTaxServiceProfileForJurisdictionKey(
        world,
        entry.seat.jurisdictionKey,
      );
  if (!power && !gameProfile)
    throw new Error(
      "No source power or saved test profile supports this office.",
    );
  if (
    gameProfile &&
    canonicalJson(gameProfile.taxTerms) !== canonicalJson(input.terms)
  )
    throw new Error(
      "This office may file only the exact tax terms in its saved state game profile.",
    );
  const prior = world.history.taxProposals?.find(
    (row) => row.stableKey === input.stableKey,
  );
  if (prior) {
    if (
      prior.sponsorPersonId !== input.personId ||
      prior.jurisdictionId !== entry.jurisdictionId ||
      canonicalJson(prior.terms) !== canonicalJson(input.terms)
    )
      throw new Error("An existing tax proposal cannot be overwritten.");
    return { world, measureId: prior.measureId };
  }
  const sequence = (world.history.taxProposals ?? []).length + 1;
  let next = introduceMeasure(world, {
    stableKey: `${input.stableKey}:measure`,
    jurisdictionId: entry.jurisdictionId,
    rulePackId: entry.seat.legislativeRulePackId,
    designation: `${entry.seat.chamberKey === "senate" ? "SB" : "HB"} Tax ${sequence} (authored)`,
    shortTitle: `Authored tax on ${input.terms.baseLabel}`,
    summary: `Test-only tax proposal for ${input.terms.publicPurpose}.`,
    origin: "member-introduction",
    originChamberKey: entry.seat.chamberKey,
    subjectClass: "revenue",
    sponsorPersonId: input.personId,
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  next = attachTaxProposal(next, {
    stableKey: input.stableKey,
    measureId,
    sponsorPersonId: input.personId,
    power,
    gameProfileRef: gameProfile?.ref ?? null,
    terms: input.terms,
  });
  next = recordTaxDraftIdentity(next, next.history.taxProposals!.at(-1)!.id);
  next = createWorkItem(next, {
    stableKey: `${input.stableKey}:work`,
    title: `Consider ${next.history.legislativeMeasures!.at(-1)!.designation}`,
    summary: "Test-only tax proposal; no policy or receipt has occurred.",
    jurisdictionId: entry.jurisdictionId,
    sourceEntityIds: [measureId, entry.seat.outcomeEventId],
    focus: {
      kind: "legislative-material",
      targetKey: input.stableKey,
      sourceEntityId: measureId,
    },
    effort: null,
    access: { kind: "office" },
    assignedPersonIds: [input.personId],
    playerRequirement: "decision",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  assertWorldIntegrity(next);
  return { world: next, measureId };
}

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
