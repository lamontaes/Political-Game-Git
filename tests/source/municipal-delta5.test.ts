import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderMunicipalGovernments } from "../../scripts/source/export-municipal-governments";
import { renderMunicipalCapacity } from "../../scripts/source/export-municipal-capacity";
import {
  municipalGovernments,
  municipalRuleSourceRef,
} from "../../src/simulation/municipal-government";

describe("MUNI-DELTA5 exact evidence and generated consumer boundaries", () => {
  it("replays the entire government projection including every declared hash", () => {
    expect(
      readFileSync("src/simulation/municipal-governments.generated.ts", "utf8"),
    ).toBe(renderMunicipalGovernments());
  }, 30000);
  it("the CLI gate rejects a changed generated provenance hash", () => {
    const dir = mkdtempSync(join(tmpdir(), "municipal-replay-control-"));
    try {
      const path = join(dir, "projection.ts");
      const bytes = readFileSync(
        "src/simulation/municipal-governments.generated.ts",
        "utf8",
      );
      writeFileSync(
        path,
        bytes.replace(/(productionCorpusSha256": ")[a-f0-9]/, "$1z"),
      );
      expect(() =>
        execFileSync(
          process.execPath,
          [
            "--import",
            "tsx",
            "scripts/source/export-municipal-governments.ts",
            "--check",
            "--check-file",
            path,
          ],
          { stdio: "pipe" },
        ),
      ).toThrow(/Municipal browser projection differs/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);
  it("replays capacity and its actual accepted corpus hashes", () => {
    const bytes = readFileSync(
      "src/simulation/municipal-capacity.generated.json",
      "utf8",
    );
    expect(bytes).toBe(renderMunicipalCapacity());
    const data = JSON.parse(bytes);
    for (const [domain, key] of [
      ["government-finances", "financeSha256"],
      ["public-employment", "employmentSha256"],
    ]) {
      expect(data.provenance[key!]).toBe(
        createHash("sha256")
          .update(readFileSync(`data/source/${domain}/corpus.json`))
          .digest("hex"),
      );
    }
  });
  it("never labels a research reading as statutory authority or a legal-section locator", () => {
    for (const government of municipalGovernments())
      for (const reading of government.readings) {
        expect(municipalRuleSourceRef(reading, "quorum").authority).toBe(
          reading.evidence === "enacted-text"
            ? "statute"
            : "research-reference",
        );
        if (reading.evidence !== "enacted-text")
          for (const fact of reading.facts)
            for (const evidence of fact.evidence ?? []) {
              expect(evidence.locator).toHaveProperty(
                "kind",
                "document-section",
              );
            }
      }
  });
});
