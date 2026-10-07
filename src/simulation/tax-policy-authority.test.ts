import { createWorld } from "./world";
import { makeIsoDate } from "./dates";
import { STATES } from "./state-reference";
import { stateJurisdictionForKey } from "./life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { describe, expect, it } from "vitest";
import { createLegislativeScenario } from "./legislation-scenarios";
import {
  appendWorldConditions,
  ensureWorldStartingConditions,
} from "./world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";
import {
  stateTaxServiceProfileForJurisdictionKey,
  stateTaxServiceProfileByRef,
  drawStateTaxServiceStartingConditions,
  stateTaxServiceStartingConditions,
} from "./world-setup/state-tax-service-profiles";
import { introduceMeasure } from "./legislation";
import { attachTaxProposal, taxPowerEvidenceFor } from "./tax-policy";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  proposalFixture,
  TEST_TAX_TERMS,
} from "../../tests/fixtures/tax-policy-fixture";

describe("M7 new tax proposals require researched authority", () => {
  it.each(Object.keys(STATES).map((key) => `US-${key}`))(
    "keeps fictional profiles out of a new %s world and preserves other opening conditions",
    (stateKey) => {
      const start = createWorld({
        seed: `m7:no-fictional-power:${stateKey}`,
        currentDate: makeIsoDate("2026-01-05"),
        jurisdictions: [
          NATIONAL_ELECTION_JURISDICTION,
          stateJurisdictionForKey(stateKey)!,
        ],
        people: [],
      });
      const opened = ensureWorldStartingConditions(start, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      });
      expect(opened.history.worldConditions!.map((row) => row.kind)).toEqual([
        "world-opening",
        "macro-starting-conditions",
        "legislative-starting-procedures",
      ]);
      expect(
        stateTaxServiceProfileForJurisdictionKey(opened, stateKey),
      ).toBeNull();
      const saved = deserializeWorld(serializeWorld(opened));
      expect(saved.history.worldConditions).toEqual(
        opened.history.worldConditions,
      );
      expect(
        ensureWorldStartingConditions(saved, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        }),
      ).toBe(saved);
      expect(saved.history.resourceTransferOutcomes).toEqual(
        start.history.resourceTransferOutcomes,
      );
    },
  );

  it("rejects a saved fictional profile as authority while preserving its evidence through Save/Continue", () => {
    const scenario = createLegislativeScenario("kentucky");
    let world = ensureWorldStartingConditions(scenario.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    // Recreate an explicit old-profile save using its original canonical
    // fixture generator; the production opening no longer calls it.
    if (!stateTaxServiceStartingConditions(world))
      world = appendWorldConditions(world, [
        drawStateTaxServiceStartingConditions(world),
      ]);
    const profile = stateTaxServiceProfileForJurisdictionKey(world, "US-KY")!;
    expect(profile).toBeDefined();
    expect(taxPowerEvidenceFor(profile.jurisdictionKey)).toBeNull();
    world = introduceMeasure(world, {
      stableKey: "m7:unsupported-profile-measure",
      jurisdictionId: profile.jurisdictionId,
      rulePackId: scenario.pack.packId,
      designation: "HB Authority Fixture",
      shortTitle: "Unsupported fictional authority test",
      summary: "Explicit test proposal, no sourced tax power.",
      origin: "member-introduction",
      subjectClass: "revenue",
      sponsorPersonId: scenario.playerPersonId,
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    const before = serializeWorld(world);
    expect(() =>
      attachTaxProposal(world, {
        stableKey: "m7:unsupported-profile-tax",
        measureId,
        sponsorPersonId: scenario.playerPersonId,
        power: null,
        gameProfileRef: profile.ref,
        terms: profile.taxTerms,
      }),
    ).toThrow(/tax authority is unsupported/i);
    expect(serializeWorld(world)).toBe(before);
    const saved = deserializeWorld(before);
    expect(stateTaxServiceProfileByRef(saved, profile.ref)).toEqual(profile);
    expect(saved.history.taxProposals).toEqual(world.history.taxProposals);
    expect(saved.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
  });
  it("retains canonical sourced tax proposals and rejects an unresearched power", () => {
    const fixture = proposalFixture();
    const proposal = fixture.world.history.taxProposals!.at(-1)!;
    expect(proposal.power).toEqual(taxPowerEvidenceFor("US-AK"));
    expect(proposal.gameProfileRef).toBeNull();
    expect(proposal.terms).toEqual(TEST_TAX_TERMS);
    expect(
      deserializeWorld(serializeWorld(fixture.world)).history.taxProposals!.at(
        -1,
      ),
    ).toEqual(proposal);
    expect(() =>
      attachTaxProposal(fixture.world, {
        stableKey: "m7:unknown-power",
        measureId: proposal.measureId,
        sponsorPersonId: fixture.personId,
        power: null,
        terms: TEST_TAX_TERMS,
      }),
    ).toThrow();
  });
});
