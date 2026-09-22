import { describe, expect, it } from "vitest";

import registry from "../../art/manifest/character_candidate_registry.json";
import characterCatalog from "../../art/manifest/character_catalog.json";
import {
  CHARACTER_CATALOG_APPROVALS,
  promoteApproval,
  unapprovedCatalogComponents,
  type CatalogApproval,
} from "./catalog-approval";
import type { CharacterComponentManifestRecord } from "./character-components";

const bank =
  registry.assets as unknown as readonly CharacterComponentManifestRecord[];

const approvalFor = (
  componentIds: readonly string[],
  generation = 3,
): CatalogApproval => ({
  approvalId: "test-approval",
  approvedBy: "a person",
  approvedAt: "2026-09-22",
  evidence: "a contact sheet",
  generation,
  componentIds,
});

describe("nothing reaches the catalog without a named approval", () => {
  it("passes on the catalog as it stands", () => {
    expect(unapprovedCatalogComponents()).toEqual([]);
  });

  it("holds no approvals, which is the truthful state and not an empty gate", () => {
    // Stated so the case above cannot be read as "the gate is satisfied".
    // Nothing has been accepted, so there is nothing for it to be satisfied by.
    expect(CHARACTER_CATALOG_APPROVALS.approvals).toEqual([]);
    expect(CHARACTER_CATALOG_APPROVALS.grandfathered.componentIds).toHaveLength(
      46,
    );
  });

  it("CONTROL: refuses a component added to a new generation", () => {
    const problems = unapprovedCatalogComponents(CHARACTER_CATALOG_APPROVALS, [
      ...characterCatalog.generations,
      {
        generation: 3,
        component_ids: ["wave_a_average_man_standing_neutral_front_a_v1"],
      },
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("no approval naming it");
  });

  /**
   * The hole an easier rule would have left.
   *
   * Grandfathering generations 1 and 2 wholesale would have let a new id be
   * appended to generation 2 and pass, which is the shape the catalog would
   * actually grow in. The clause lists ids instead, and this is the case that
   * says so.
   */
  it("CONTROL: refuses a component appended to a grandfathered generation", () => {
    const problems = unapprovedCatalogComponents(CHARACTER_CATALOG_APPROVALS, [
      {
        generation: 2,
        component_ids: [
          ...characterCatalog.generations[1]!.component_ids,
          "dev_g2_something_nobody_approved_v1",
        ],
      },
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("dev_g2_something_nobody_approved_v1");
  });

  it("CONTROL: refuses an approval for a different generation than the catalog uses", () => {
    const id = "wave_a_average_man_standing_neutral_front_a_v1";
    const problems = unapprovedCatalogComponents(
      { ...CHARACTER_CATALOG_APPROVALS, approvals: [approvalFor([id], 4)] },
      [{ generation: 3, component_ids: [id] }],
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("approved into generation 4");
  });

  it("accepts exactly what an approval names", () => {
    const id = "wave_a_average_man_standing_neutral_front_a_v1";
    expect(
      unapprovedCatalogComponents(
        { ...CHARACTER_CATALOG_APPROVALS, approvals: [approvalFor([id])] },
        [{ generation: 3, component_ids: [id] }],
      ),
    ).toEqual([]);
  });
});

describe("promoting an approval", () => {
  it("turns the named candidates into catalog components", () => {
    const ids = [
      "wave_a_average_man_standing_neutral_front_a_v1",
      "wave_a_average_woman_seated_front_neutral_v1",
    ];
    const promoted = promoteApproval(approvalFor(ids), bank);
    expect(promoted.map((record) => record.asset_id)).toEqual(ids);
    for (const record of promoted) {
      expect(record.asset_type).toBe("character-component");
      expect(record.component?.catalog_generation).toBe(3);
      expect(record.candidate_component).toBeUndefined();
    }
  });

  it("writes nothing: the bank is unchanged and still all candidates", () => {
    promoteApproval(
      approvalFor(["wave_a_average_man_standing_neutral_front_a_v1"]),
      bank,
    );
    for (const record of bank) {
      expect(record.asset_type).toBe("character-component-candidate");
      expect(record.runtime_release_status).toBe("unreleased");
    }
  });

  it("refuses an approval naming art the bank does not hold", () => {
    expect(() =>
      promoteApproval(
        approvalFor([
          "wave_a_average_man_standing_neutral_front_a_v1",
          "a_body_that_does_not_exist_v1",
        ]),
        bank,
      ),
    ).toThrow("the bank does not hold");
  });
});
