import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  auditRuntimeAssets,
  RUNTIME_ASSET_BUDGET_SEMANTICS,
} from "../scripts/art-asset-factory/runtime-asset-budget";
import type { AssetManifest } from "../scripts/art-asset-factory/schemas";

const temporaryRoots: string[] = [];

function hash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function write(root: string, relativePath: string, content: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function createFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-asset-budget-"));
  temporaryRoots.push(root);

  const runtime = "runtime-image";
  const developer = "developer-proof";
  const candidate = "candidate-source";
  const unmatched = "unmatched-raster";

  write(root, "art/families/office/runtime.png", runtime);
  write(root, "art/fixtures/proof.png", developer);
  write(root, "art/generated/candidates/wave/candidate.png", candidate);
  write(root, "dist/client/assets/runtime-a.png", runtime);
  write(root, "dist/client/assets/runtime-b.png", runtime);
  write(root, "dist/client/assets/proof.png", developer);
  write(root, "dist/client/assets/candidate.png", candidate);
  write(root, "dist/client/assets/unknown.png", unmatched);
  write(root, "dist/client/assets/application.js", "javascript");

  const manifest: AssetManifest = {
    assets: [
      {
        asset_id: "office_runtime",
        asset_type: "environment-plate",
        art_class: "production",
        hero_asset: false,
        reuse_allowed: true,
        generation_status: "approved",
        qa_status: "approved",
        runtime_release_status: "released",
        final_path: "art/families/office/runtime.png",
        hash: hash(runtime),
        raster_tiers: [
          {
            width: 1,
            height: 1,
            path: "art/families/office/runtime.png",
            hash: hash(runtime),
            derivation: "native-master",
          },
        ],
      },
      {
        asset_id: "developer_proof",
        asset_type: "fixture",
        art_class: "development-fixture",
        hero_asset: false,
        reuse_allowed: true,
        generation_status: "approved",
        qa_status: "approved",
        runtime_release_status: "released",
        final_path: "art/fixtures/proof.png",
        hash: hash(developer),
      },
    ],
  };
  write(
    root,
    "art/manifest/asset_manifest.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("runtime asset budget audit", () => {
  it("hashes and byte-counts emitted files while preserving duplicate paths", () => {
    const root = createFixture();
    const report = auditRuntimeAssets({ repositoryRoot: root });
    const runtimeRows = report.rasters.filter(
      (row) => row.contentHash === hash("runtime-image"),
    );

    expect(runtimeRows.map((row) => row.emittedPath)).toEqual([
      "client/assets/runtime-a.png",
      "client/assets/runtime-b.png",
    ]);
    expect(runtimeRows.every((row) => row.byteSize === 13)).toBe(true);
    expect(report.totals.emitted.files).toBe(6);
    expect(report.totals.rasters.files).toBe(5);
    expect(report.totals.rasters.bytes).toBe(
      report.rasters.reduce((total, row) => total + row.byteSize, 0),
    );
  });

  it("matches final/tier identity and separates runtime, developer, candidate, and unmatched rows", () => {
    const root = createFixture();
    const report = auditRuntimeAssets({ repositoryRoot: root });
    const byName = Object.fromEntries(
      report.rasters.map((row) => [path.basename(row.emittedPath), row]),
    );

    expect(byName["runtime-a.png"]?.classification).toBe("player-runtime");
    expect(byName["runtime-a.png"]?.manifestMatches).toEqual([
      {
        assetId: "office_runtime",
        assetType: "environment-plate",
        artClass: "production",
        runtimeReleaseStatus: "released",
        roles: [
          {
            role: "final",
            repositoryPath: "art/families/office/runtime.png",
          },
          {
            role: "tier",
            repositoryPath: "art/families/office/runtime.png",
          },
        ],
      },
    ]);
    expect(byName["proof.png"]?.classification).toBe("developer-evidence-qa");
    expect(byName["candidate.png"]?.classification).toBe(
      "source-candidate-reference",
    );
    expect(byName["unknown.png"]?.classification).toBe(
      "unmatched-unclassified",
    );
    expect(byName["unknown.png"]?.inPruningInvestigationPool).toBe(true);
    expect(
      fs.existsSync(path.join(root, "dist/client/assets/unknown.png")),
    ).toBe(true);
  });

  it("keeps classification totals mutually exclusive and complete", () => {
    const root = createFixture();
    const report = auditRuntimeAssets({ repositoryRoot: root });
    const classificationTotals = Object.values(
      report.totals.classifications,
    ).reduce(
      (total, rollup) => ({
        files: total.files + rollup.files,
        bytes: total.bytes + rollup.bytes,
      }),
      { files: 0, bytes: 0 },
    );

    expect(classificationTotals).toEqual(report.totals.rasters);
    expect(report.totals.manifestHashMatchedFinalOrTier.files).toBe(3);
    expect(report.totals.noManifestHashMatch.files).toBe(2);
    expect(report.largestInvestigationGroups).toEqual([
      {
        classification: "source-candidate-reference",
        files: 1,
        bytes: 16,
      },
      {
        classification: "unmatched-unclassified",
        files: 1,
        bytes: 16,
      },
    ]);
  });

  it("does not infer network demand or enforce an unapproved size budget", () => {
    const root = createFixture();
    write(
      root,
      "dist/client/assets/very-large-unclassified.png",
      "x".repeat(1_000_000),
    );

    const report = auditRuntimeAssets({ repositoryRoot: root });

    expect(report.semantics).toEqual(RUNTIME_ASSET_BUDGET_SEMANTICS);
    expect(report.semantics.emittedBytesAreNetworkDemand).toBe(false);
    expect(report.semantics.emittedFilesAreAutomaticallyPlayerReachable).toBe(
      false,
    );
    expect(report.budget).toEqual({
      approvedLimitBytes: null,
      enforced: false,
      status: "not-evaluated-no-approved-budget",
    });
  });

  it("fails for structural manifest hash drift", () => {
    const root = createFixture();
    const manifestPath = path.join(root, "art/manifest/asset_manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      assets: Array<{ hash?: string }>;
    };
    manifest.assets[0]!.hash = "0".repeat(64);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    expect(() => auditRuntimeAssets({ repositoryRoot: root })).toThrow(
      /Manifest hash mismatch/,
    );
  });

  it("is deterministic and read-only", () => {
    const root = createFixture();
    const sentinel = path.join(root, "src/presentation/visual-integration.ts");
    write(
      root,
      "src/presentation/visual-integration.ts",
      "eager glob sentinel\n",
    );
    const before = fs.readFileSync(sentinel, "utf8");
    const first = auditRuntimeAssets({ repositoryRoot: root });
    const second = auditRuntimeAssets({ repositoryRoot: root });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(fs.readFileSync(sentinel, "utf8")).toBe(before);
    expect(
      fs.existsSync(path.join(root, "dist/client/assets/unknown.png")),
    ).toBe(true);
  });
});
