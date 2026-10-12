import { describe, expect, it } from "vitest";

import {
  AUTHORING_SCENE_FAMILY_FIXTURES,
  HOME_APARTMENT_MODEST_01,
  PRESS_BRIEFING_ROOM_01,
  PUBLIC_PARK_PAVILION_01,
} from "./fixtures/scene-families";
import {
  bindSceneSemantics,
  evaluateSceneAccess,
  validatePhysicalSceneFamily,
  worldLabelsForFamily,
  type PhysicalSceneFamily,
  type SceneSemanticBinding,
} from "./semantic-context";

function bind(
  family: PhysicalSceneFamily,
  useId: string,
  worldLabel: string,
): SceneSemanticBinding {
  const result = bindSceneSemantics(family, {
    familyId: family.familyId,
    useId,
    worldLabel,
    labelSource: "canonical-world",
  });
  expect(result.errors).toEqual([]);
  return result.binding!;
}

describe("one physical family, many world meanings", () => {
  it("renders one apartment as four different homes without changing its identity", () => {
    const bindings = [
      bind(HOME_APARTMENT_MODEST_01, "parents-home", "Parents' apartment"),
      bind(HOME_APARTMENT_MODEST_01, "player-home", "Your apartment"),
      bind(HOME_APARTMENT_MODEST_01, "acquaintance-home", "Jordan's apartment"),
      bind(HOME_APARTMENT_MODEST_01, "acquaintance-home", "Friend's apartment"),
    ];

    expect(worldLabelsForFamily("HOME_APARTMENT_MODEST_01", bindings)).toEqual([
      "Parents' apartment",
      "Your apartment",
      "Jordan's apartment",
      "Friend's apartment",
    ]);
    // The asset identity never moved.
    expect(new Set(bindings.map((b) => b.familyId)).size).toBe(1);
  });

  it("supports a pavilion across a birthday and a campaign event alike", () => {
    const uses = PUBLIC_PARK_PAVILION_01.semanticUses.map((use) => use.useId);
    expect(uses).toEqual(
      expect.arrayContaining([
        "childhood-birthday",
        "family-picnic",
        "neighborhood-meeting",
        "campaign-meet-and-greet",
        "constituent-event",
      ]),
    );
    const birthday = bind(
      PUBLIC_PARK_PAVILION_01,
      "childhood-birthday",
      "Your ninth birthday",
    );
    const campaign = bind(
      PUBLIC_PARK_PAVILION_01,
      "campaign-meet-and-greet",
      "Saturday meet-and-greet",
    );
    expect(birthday.familyId).toBe(campaign.familyId);
    expect(birthday.worldLabel).not.toBe(campaign.worldLabel);
  });

  it("collects the surface slots a use needs alongside the family's own", () => {
    const binding = bind(
      PRESS_BRIEFING_ROOM_01,
      "policy-briefing",
      "This morning's briefing",
    );
    expect(binding.requiredSurfaceSlots).toContain("briefing-screen");
    expect(binding.requiredSurfaceSlots).toContain("lectern-plate");
  });
});

describe("the world label is never inferred", () => {
  it("refuses an empty label rather than defaulting to the family id", () => {
    const result = bindSceneSemantics(HOME_APARTMENT_MODEST_01, {
      familyId: HOME_APARTMENT_MODEST_01.familyId,
      useId: "player-home",
      worldLabel: "   ",
      labelSource: "canonical-world",
    });
    expect(result.binding).toBeNull();
    expect(result.errors.map((e) => e.code)).toContain("empty-world-label");
  });

  it("refuses a label that did not come from the canonical world", () => {
    const result = bindSceneSemantics(HOME_APARTMENT_MODEST_01, {
      familyId: HOME_APARTMENT_MODEST_01.familyId,
      useId: "player-home",
      worldLabel: "Your apartment",
      labelSource: "filename" as never,
    });
    expect(result.binding).toBeNull();
    expect(result.errors.map((e) => e.code)).toContain(
      "label-source-not-canonical",
    );
  });

  it("refuses a use the family was never authored for", () => {
    const result = bindSceneSemantics(HOME_APARTMENT_MODEST_01, {
      familyId: HOME_APARTMENT_MODEST_01.familyId,
      useId: "press-conference",
      worldLabel: "A press conference in an apartment",
      labelSource: "canonical-world",
    });
    expect(result.binding).toBeNull();
    expect(result.errors.map((e) => e.code)).toContain("unknown-use");
  });
});

describe("access comes from the world, never from a tag", () => {
  const restricted: PhysicalSceneFamily = {
    familyId: "RESTRICTED_MEMBERS_ROOM_01",
    label: "Members-only room",
    environmentTags: ["institutional"],
    accessClass: "role-restricted",
    lifeStageSuitability: ["adulthood"],
    supportsStanding: true,
    supportsSeated: true,
    requiredSurfaceSlots: [],
    roleEligibilityTags: ["mayor", "council-member"],
    architectureScope: "generic",
    semanticUses: [
      { useId: "members-business", description: "Members' business." },
    ],
  };

  it("does not let an eligibility tag grant the role it names", () => {
    const decision = evaluateSceneAccess(restricted, { heldRoles: [] });
    expect(decision.outcome).toBe("not-permitted");
    expect(decision.reason).toMatch(/never grant it/);
  });

  it("permits only when the world records the role held", () => {
    expect(
      evaluateSceneAccess(restricted, { heldRoles: ["mayor"] }).outcome,
    ).toBe("permitted");
    expect(
      evaluateSceneAccess(restricted, { heldRoles: ["journalist"] }).outcome,
    ).toBe("not-permitted");
  });

  it("gates a private household on canonical household membership", () => {
    expect(
      evaluateSceneAccess(HOME_APARTMENT_MODEST_01, { heldRoles: [] }).outcome,
    ).toBe("not-permitted");
    expect(
      evaluateSceneAccess(HOME_APARTMENT_MODEST_01, {
        heldRoles: [],
        isHouseholdMember: true,
      }).outcome,
    ).toBe("permitted");
  });

  it("lets anyone into a public place", () => {
    expect(
      evaluateSceneAccess(PUBLIC_PARK_PAVILION_01, { heldRoles: [] }).outcome,
    ).toBe("permitted");
  });

  it("gates an institutional space on canonical clearance", () => {
    expect(
      evaluateSceneAccess(PRESS_BRIEFING_ROOM_01, { heldRoles: ["mayor"] })
        .outcome,
    ).toBe("not-permitted");
    expect(
      evaluateSceneAccess(PRESS_BRIEFING_ROOM_01, {
        heldRoles: [],
        hasInstitutionalAccess: true,
      }).outcome,
    ).toBe("permitted");
  });
});

describe("family validation", () => {
  it("accepts every shipped fixture", () => {
    for (const family of AUTHORING_SCENE_FAMILY_FIXTURES) {
      const result = validatePhysicalSceneFamily(family);
      expect(result.findings.filter((f) => f.severity === "error")).toEqual([]);
    }
  });

  it("keeps every fixture generic and jurisdiction-free", () => {
    for (const family of AUTHORING_SCENE_FAMILY_FIXTURES) {
      expect(family.architectureScope).toBe("generic");
      expect(family.jurisdictionScope).toBeUndefined();
    }
    const serialized = JSON.stringify(
      AUTHORING_SCENE_FAMILY_FIXTURES,
    ).toLowerCase();
    for (const forbidden of ["kentucky", "lexington", "fayette"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("rejects a generic room that claims a jurisdiction", () => {
    const result = validatePhysicalSceneFamily({
      ...HOME_APARTMENT_MODEST_01,
      jurisdictionScope: "Somewhere",
    });
    expect(result.valid).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "jurisdiction-on-generic-family",
    );
  });

  it("rejects jurisdiction-specific architecture that names no jurisdiction", () => {
    const result = validatePhysicalSceneFamily({
      ...HOME_APARTMENT_MODEST_01,
      architectureScope: "jurisdiction-specific",
    });
    expect(result.valid).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "jurisdiction-missing-on-specific-family",
    );
  });

  it("rejects a family nobody could ever stand or sit in", () => {
    const result = validatePhysicalSceneFamily({
      ...HOME_APARTMENT_MODEST_01,
      supportsStanding: false,
      supportsSeated: false,
    });
    expect(result.valid).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain("no-pose-support");
  });

  it("flags inert role tags on a family that is not role-restricted", () => {
    const result = validatePhysicalSceneFamily({
      ...PUBLIC_PARK_PAVILION_01,
      roleEligibilityTags: ["mayor"],
    });
    expect(result.findings.map((f) => f.code)).toContain(
      "role-tags-without-role-restriction",
    );
  });
});
