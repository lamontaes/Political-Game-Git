import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  compileMunicipalProjection,
  renderMunicipalRuleRegistry,
} from "../../scripts/source/export-municipal-governments";
import {
  municipalCouncilRulePacks,
  municipalGovernments,
  municipalRulePackFor,
} from "../../src/simulation/municipal-government";
import {
  MUNICIPAL_RULE_PACKS_JSON,
  MUNICIPAL_RULE_REGISTRY_META,
} from "../../src/simulation/municipal-rule-registry.generated";

import { MUNICIPAL_GOVERNMENTS_META } from "../../src/simulation/municipal-governments.generated";

describe("municipal compact registry is the complete source admission result", () => {
  it("replays the compact projection and preserves every inventory record", () => {
    const projection = compileMunicipalProjection();
    expect(projection.governments).toEqual(municipalGovernments());
    expect(
      readFileSync(
        "src/simulation/municipal-rule-registry.generated.ts",
        "utf8",
      ),
    ).toBe(renderMunicipalRuleRegistry(projection));
    expect(JSON.parse(MUNICIPAL_RULE_PACKS_JSON)).toEqual(
      municipalCouncilRulePacks(),
    );
    expect(MUNICIPAL_RULE_REGISTRY_META.inventoryGovernments).toBe(
      projection.governments.length,
    );
  }, 30_000);

  it("serializes a newly admissible pack instead of hard-coding an empty registry", () => {
    const original = municipalGovernments().find(
      (g) => g.key === "us-va-charlottesville",
    )!;
    // Deliberately synthetic test procedure; no production source is edited.
    const government = {
      ...original,
      readings: [
        {
          ...original.readings[0]!,
          procedure: {
            ...original.readings[0]!.procedure,
            introductionSponsorship: "Synthetic test member introduction",
            readings: 2,
            mayoralActionState: "NOT_APPLICABLE",
            publicHearing: null,
          },
        },
      ],
    };
    const admitted = municipalRulePackFor(government);
    expect(admitted.ok).toBe(true);
    if (!admitted.ok)
      throw new Error("Synthetic positive control did not admit");
    const rendered = renderMunicipalRuleRegistry({
      governments: [government],
      meta: MUNICIPAL_GOVERNMENTS_META,
    });
    expect(rendered).toContain(JSON.stringify(JSON.stringify([admitted.pack])));
    expect(rendered).toContain('"admittedPacks": 1');
  });

  it("the real CLI check rejects corrupted compact data", () => {
    const dir = mkdtempSync(join(tmpdir(), "municipal-load6-control-"));
    try {
      const path = join(dir, "registry.ts");
      writeFileSync(
        path,
        readFileSync(
          "src/simulation/municipal-rule-registry.generated.ts",
          "utf8",
        ).replace(/"admittedPacks": \d+/, '"admittedPacks": -1'),
      );
      expect(() =>
        execFileSync(
          process.execPath,
          [
            "--import",
            "tsx",
            "scripts/source/export-municipal-governments.ts",
            "--check",
            "--check-registry-file",
            path,
          ],
          { stdio: "pipe" },
        ),
      ).toThrow(/Municipal runtime registry differs/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
