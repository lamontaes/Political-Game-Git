// Intended repository destination: src/simulation/governing/automatic-legislation-pack-mapping.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import * as institutions from "../legislative-institutions";
import { legislativeWorkKey } from "../legislative-work-key";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { stateJurisdictionForKey } from "../life-places";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { createFormationContext, recordPrinciples } from "../politics";
import { serializeWorld } from "../serialization";
import { programVariant } from "../legislation-program-families";
import * as laws from "./law-in-force";
import {
  AUTOMATIC_LAW_POSITION_MAPPINGS,
  compileAutomaticLawDraft,
  stateTransitAutomaticLawContext,
  type AutomaticLawCompileContext,
  type AutomaticLawPositionMapping,
} from "./automatic-legislation";
import type { EntityId, World } from "../types";

const seed = "overflow4-a20-pack-mapping-all56";
const place = drawRandomPlace(seed, (candidate) =>
  US_STATE_USPS.some((usps) => candidate.stateJurisdictionKey === `US-${usps}`),
);
const fixture = smallWorld({ place: place.key, date: "2026-01-05", seed });
const federal = NATIONAL_ELECTION_JURISDICTION.id;
const base = ensureNationalElectionJurisdiction(fixture.world);
const federalMapping = AUTOMATIC_LAW_POSITION_MAPPINGS.find(
  (row) =>
    row.governmentLevel === "federal" &&
    row.authorityKind === "game-profile" &&
    row.answer === "yes",
)!;

function inputFor(
  mapping: AutomaticLawPositionMapping,
  jurisdictionId: EntityId,
  initial = base,
) {
  const proposition = Object.values(initial.policyCatalog.propositions).find(
    (row) => row.stableKey === mapping.propositionKey,
  );
  if (!proposition?.principles?.length)
    throw new Error("Mapping needs a saved question with principle bearings.");
  const world = recordPrinciples(
    initial,
    proposition.principles.map((bearing) => ({
      stableKey: `test:mapping:${mapping.propositionKey}:${bearing.principleId}`,
      personId: fixture.personId,
      principleId: bearing.principleId,
      formedAt: initial.currentDate,
      stance:
        (bearing.bearing === "consistent-with") === (mapping.answer === "yes")
          ? ("endorses" as const)
          : ("rejects" as const),
      strength: 1,
      conviction: "settled" as const,
      flexibility: "firm" as const,
      qualification: null,
      formation: createFormationContext("experience:life", {
        note: "Explicit saved sponsor principles for the mapping gate fixture.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
  return {
    world,
    jurisdictionId,
    propositionId: proposition.id,
    answer: mapping.answer,
    sponsorPersonId: fixture.personId,
    designation: "TEST 1",
    intakeKey: "test:pack-mapping",
    governmentLevel: mapping.governmentLevel,
  };
}

function federalContext(): AutomaticLawCompileContext {
  const { variant } = programVariant(
    federalMapping.familyKey,
    federalMapping.variantKey,
  );
  const amount = variant.defaults[federalMapping.effectParameterKey];
  if (amount?.kind !== "money" || !federalMapping.authorityKey)
    throw new Error(
      "Federal fixture requires the shipped money profile authority.",
    );
  return {
    governmentLevel: "federal",
    jurisdictionId: federal,
    rulePackId: US_CONGRESS_RULE_PACK.packId,
    scenarioKey: legislativeWorkKey(US_CONGRESS_RULE_PACK),
    predicateAuthority: {
      kind: "game-profile",
      authorityKey: federalMapping.authorityKey,
      authorityVersion: "test:mapping/v1",
      profileVersion: variant.npcServiceProfile?.profileId ?? "test:profile/v1",
      rulePackId: US_CONGRESS_RULE_PACK.packId,
      governmentLevel: "federal",
      publicGovernmentIdentity: {
        kind: "jurisdiction",
        jurisdictionId: federal,
      },
      permittedEffects: ["public-program-appropriation"],
      citationLabel: "Explicit mapping gate fixture",
      programLabel: variant.label,
      authorizedCeilingMinorUnits: null,
      currency: amount.currency,
      basis: "game-profile",
    },
  };
}

// The law reader stops compilation at its real missing-law boundary. Its call
// proves candidate admission; null alone would not distinguish rejected context
// from an admitted candidate lacking law. No enacted law or budget is invented.
afterEach(() => vi.restoreAllMocks());
describe("automatic law mapping resolves the institution from the jurisdiction", () => {
  it("admits the default federal context through the canonical jurisdiction reader", () => {
    const input = inputFor(federalMapping, federal);
    const before = serializeWorld(input.world);
    const pack = vi.spyOn(institutions, "legislativePackForJurisdiction");
    const work = vi.spyOn(institutions, "legislativePackForWorkKey");
    const law = vi.spyOn(laws, "lawInForce").mockReturnValue(null);
    expect(compileAutomaticLawDraft(input)).toBeNull();
    expect(pack).toHaveBeenCalledWith(federal);
    expect(work).not.toHaveBeenCalled();
    expect(law).toHaveBeenCalledWith(input.world, federal, input.propositionId);
    expect(serializeWorld(input.world)).toBe(before);
  });

  it("refuses a federal default when the saved jurisdiction is absent or has a different kind", () => {
    const law = vi.spyOn(laws, "lawInForce").mockReturnValue(null);
    for (const kind of ["absent", "state"] as const) {
      const jurisdictions = { ...base.jurisdictions };
      if (kind === "absent") delete jurisdictions[federal];
      else
        jurisdictions[federal] = {
          ...NATIONAL_ELECTION_JURISDICTION,
          kind: "state",
        };
      const world: World = {
        ...base,
        jurisdictions,
        jurisdictionOrder:
          kind === "absent"
            ? base.jurisdictionOrder.filter((id) => id !== federal)
            : base.jurisdictionOrder,
      };
      expect(
        compileAutomaticLawDraft(inputFor(federalMapping, federal, world)),
      ).toBeNull();
    }
    expect(law).not.toHaveBeenCalled();
  });

  it("admits a supplied federal context with the jurisdiction's pack and work key", () => {
    const input = inputFor(federalMapping, federal);
    const law = vi.spyOn(laws, "lawInForce").mockReturnValue(null);
    expect(
      compileAutomaticLawDraft({ ...input, context: federalContext() }),
    ).toBeNull();
    expect(law).toHaveBeenCalledWith(input.world, federal, input.propositionId);
  });

  it("refuses a supplied wrong pack and a work-key alias even if the work reader resolves that alias", () => {
    const input = inputFor(federalMapping, federal);
    const context = federalContext();
    // A diagnostic reader alias resolves the real pack; jurisdiction ownership
    // must still require its canonical work key, rather than accepting the alias.
    const work = vi
      .spyOn(institutions, "legislativePackForWorkKey")
      .mockReturnValue(US_CONGRESS_RULE_PACK);
    const law = vi.spyOn(laws, "lawInForce").mockReturnValue(null);
    for (const invalid of [
      { ...context, rulePackId: "test:wrong-pack" },
      { ...context, scenarioKey: "test:congress-alias" },
    ]) {
      expect(
        compileAutomaticLawDraft({ ...input, context: invalid }),
      ).toBeNull();
    }
    expect(law).not.toHaveBeenCalled();
    expect(work).not.toHaveBeenCalled();
  });

  it("retains state jurisdiction resolution for the all56 sampled state", () => {
    const mapping = AUTOMATIC_LAW_POSITION_MAPPINGS.find(
      (row) =>
        row.governmentLevel === "state" &&
        row.authorityKind === "game-profile" &&
        row.answer === "yes",
    )!;
    const jurisdiction = stateJurisdictionForKey(place.stateJurisdictionKey!)!;
    const input = inputFor(mapping, jurisdiction.id);
    const context = stateTransitAutomaticLawContext(
      input.world,
      jurisdiction.id,
    );
    expect(context?.rulePackId).toBe(
      institutions.legislativePackForJurisdiction(jurisdiction.id)?.packId,
    );
    const law = vi.spyOn(laws, "lawInForce").mockReturnValue(null);
    expect(compileAutomaticLawDraft(input)).toBeNull();
    expect(law).toHaveBeenCalledWith(
      input.world,
      jurisdiction.id,
      input.propositionId,
    );
  });

  it("keeps local mapping intake closed without a supplied saved local context", () => {
    const mapping = AUTOMATIC_LAW_POSITION_MAPPINGS.find(
      (row) =>
        row.authorityKind === "game-profile" &&
        (row.governmentLevel === "municipality" ||
          row.governmentLevel === "county") &&
        programVariant(row.familyKey, row.variantKey).variant.npcServiceProfile
          ?.profileIdScope === "local-government",
    );
    if (!mapping) throw new Error("The local mapping fixture is unavailable.");
    const input = inputFor(mapping, fixture.jurisdictionId);
    const law = vi.spyOn(laws, "lawInForce").mockReturnValue(null);
    expect(compileAutomaticLawDraft(input)).toBeNull();
    expect(law).not.toHaveBeenCalled();
  });
});
