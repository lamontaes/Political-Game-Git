import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { stateJurisdictionForKey } from "./life-places";
import { STATES } from "./state-reference";
import { serializeWorld, deserializeWorld } from "./serialization";
import { createWorld } from "./world";
import { constitutionalProposalRuleForWorld } from "./constitutional-process";
import type { Jurisdiction } from "./types";

function ruleFor(jurisdiction: Jurisdiction) {
  const world = createWorld({
    seed: "a109-recorded-constitutional-identity",
    currentDate: makeIsoDate("2026-09-30"),
    people: [],
    jurisdictions: [
      {
        ...jurisdiction,
        provenance: {
          ...jurisdiction.provenance,
          jurisdiction: jurisdiction.id,
        },
      },
    ],
  });
  const restored = deserializeWorld(serializeWorld(world));
  const input = {
    jurisdictionId: jurisdiction.id,
    processKind: "state-amendment" as const,
  };
  const rule = constitutionalProposalRuleForWorld(world, input);
  expect(constitutionalProposalRuleForWorld(restored, input)).toEqual(rule);
  return rule;
}

describe("constitutional identity uses saved canonical state aliases", () => {
  it("preserves both existing legacy aliases through save and reopen", () => {
    const canonical = stateJurisdictionForKey("US-CA")!;
    for (const slug of ["california", "us-ca"]) {
      const rule = ruleFor({
        ...canonical,
        id: createStableId("jurisdiction", `legacy:${slug}`),
        slug,
      });
      expect(rule.available).toBe(true);
      if (rule.available) expect(rule.jurisdictionKey).toBe("US-CA");
    }
  });

  it("admits the 50 state records and excludes all six nonstate references", () => {
    let included = 0;
    let excluded = 0;
    for (const [usps, reference] of Object.entries(STATES)) {
      const jurisdiction = stateJurisdictionForKey(`US-${usps}`);
      expect(jurisdiction, usps).not.toBeNull();
      const rule = ruleFor(jurisdiction!);
      const isState = reference.jurisdictionKind === "state";
      expect(rule.available, usps).toBe(isState);
      if (rule.available) {
        expect(rule.jurisdictionKey).toBe(`US-${usps}`);
        included += 1;
      } else excluded += 1;
    }
    expect([included, excluded]).toEqual([50, 6]);
  });

  it("retains canonical-ID fallback and rejects an unrelated saved identity", () => {
    const canonical = stateJurisdictionForKey("US-CA")!;
    expect(
      ruleFor({ ...canonical, slug: "unrecognized-saved-slug" }).available,
    ).toBe(true);
    expect(
      ruleFor({
        ...canonical,
        id: createStableId("jurisdiction", "unrelated-local-record"),
        slug: "unrecognized-saved-slug",
      }).available,
    ).toBe(false);
  });
});
