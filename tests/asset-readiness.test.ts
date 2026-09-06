import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  reconcileAssetReadiness,
  type AssetReadinessDeclaration,
} from "../src/authoring/asset-readiness";
import {
  openAssetRequests,
  type AssetRequest,
} from "../src/authoring/asset-request";
import { readAssetReadinessInputs } from "../scripts/art-asset-factory/asset-readiness-inputs";

const ROOT = path.resolve(__dirname, "..");
const inputs = readAssetReadinessInputs(ROOT);
const report = reconcileAssetReadiness(
  inputs.requests.requests,
  inputs.declaration,
  inputs.preservedUnits,
  inputs.existingPaths,
);

/**
 * The failure this suite exists to stop is a specific one that has already
 * happened here: the queue asked for the twelve footwear pairs to be
 * re-rendered front-on while the corrected front-facing source sat ingested,
 * chopped and hash-verified in the same repository.
 */
describe("the preserved-asset reconciliation", () => {
  it("holds together against the repository", () => {
    expect(report.findings).toEqual([]);
    expect(report.valid).toBe(true);
  });

  it("reconciles every open request", () => {
    const ruled = new Set(
      inputs.declaration.requestVerdicts.map((verdict) => verdict.requestId),
    );
    for (const request of openAssetRequests(inputs.requests.requests)) {
      expect(ruled, request.requestId).toContain(request.requestId);
    }
  });

  it("finds every cited evidence path on disk", () => {
    const cited = [
      ...inputs.declaration.requestVerdicts.flatMap((v) => v.evidencePaths),
      ...inputs.declaration.unlinkedPreservedAssets.flatMap(
        (e) => e.evidencePaths,
      ),
    ];
    expect(cited.length).toBeGreaterThan(0);
    for (const relative of cited) {
      expect(fs.existsSync(path.join(ROOT, relative)), relative).toBe(true);
    }
  });

  /**
   * A verdict of "the art already exists" that leaves the request open is the
   * same queue that commissioned the second copy, so it fails rather than
   * being reported.
   */
  it("refuses to leave a request open once preserved art answers it", () => {
    const closed = inputs.requests.requests.find(
      (request) => request.status === "withdrawn-already-covered",
    )!;
    const stillOpen: AssetRequest = { ...closed, status: "queued" };
    const result = reconcileAssetReadiness(
      inputs.requests.requests.map((request) =>
        request.requestId === closed.requestId ? stillOpen : request,
      ),
      inputs.declaration,
      inputs.preservedUnits,
      inputs.existingPaths,
    );
    expect(result.findings.map((finding) => finding.code)).toContain(
      "closed-request-still-open",
    );
  });

  /**
   * Newly ingested art that nobody reconciled is invisible to the queue that
   * would otherwise ask for it again. It has to be a loud state, not a gap.
   */
  it("refuses preserved art that answers no request and is not recorded", () => {
    const result = reconcileAssetReadiness(
      inputs.requests.requests,
      inputs.declaration,
      [...inputs.preservedUnits, "newly-ingested-family"],
      inputs.existingPaths,
    );
    expect(result.findings.map((finding) => finding.code)).toContain(
      "preserved-unit-unreconciled",
    );
  });

  it("refuses a verdict that cites art the repository does not have", () => {
    const declaration: AssetReadinessDeclaration = {
      ...inputs.declaration,
      requestVerdicts: inputs.declaration.requestVerdicts.map((verdict) =>
        verdict.evidencePaths.length > 0
          ? { ...verdict, evidencePaths: ["art/generated/candidates/absent"] }
          : verdict,
      ),
    };
    const result = reconcileAssetReadiness(
      inputs.requests.requests,
      declaration,
      inputs.preservedUnits,
      inputs.existingPaths,
    );
    expect(result.findings.map((finding) => finding.code)).toContain(
      "missing-evidence-path",
    );
  });

  /**
   * The reconciliation is allowed to restate a request and it is allowed to
   * close one. It is not allowed to promote candidate art into the runtime,
   * which is a different gate entirely.
   */
  it("promotes nothing into the runtime manifest", () => {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "art/manifest/asset_manifest.json"),
        "utf8",
      ),
    ) as { assets: { final_path: string }[] };
    const registered = new Set(
      manifest.assets.map((asset) => asset.final_path),
    );
    const cited = inputs.declaration.requestVerdicts.flatMap(
      (verdict) => verdict.evidencePaths,
    );
    for (const relative of cited) {
      for (const registeredPath of registered) {
        expect(registeredPath.startsWith(relative), relative).toBe(false);
      }
    }
  });
});
