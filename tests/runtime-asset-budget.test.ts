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

function createExternalFixture(): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "runtime-asset-budget-external-"),
  );
  temporaryRoots.push(root);
  write(root, "fakebuild/client/assets/planted.png", "runtime-image");
  write(root, "fakemanifest.json", `${JSON.stringify({ assets: [] })}\n`);
  return root;
}

function readManifest(root: string): AssetManifest {
  return JSON.parse(
    fs.readFileSync(
      path.join(root, "art/manifest/asset_manifest.json"),
      "utf8",
    ),
  ) as AssetManifest;
}

function writeManifest(root: string, manifest: AssetManifest): void {
  write(
    root,
    "art/manifest/asset_manifest.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
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

describe("canonical input containment", () => {
  it("rejects a relative external build root", () => {
    const root = createFixture();
    const external = createExternalFixture();
    const relativeEscape = path.relative(
      root,
      path.join(external, "fakebuild"),
    );

    expect(relativeEscape.startsWith("..")).toBe(true);
    expect(() =>
      auditRuntimeAssets({ repositoryRoot: root, buildRoot: relativeEscape }),
    ).toThrow(/Build root must stay inside the repository root/);
  });

  it("rejects an absolute external build root", () => {
    const root = createFixture();
    const external = createExternalFixture();

    expect(() =>
      auditRuntimeAssets({
        repositoryRoot: root,
        buildRoot: path.join(external, "fakebuild"),
      }),
    ).toThrow(/Build root must stay inside the repository root/);
  });

  it("rejects a build root reached through a repository-relative symlink", () => {
    const root = createFixture();
    const external = createExternalFixture();
    fs.symlinkSync(
      path.join(external, "fakebuild"),
      path.join(root, "dist-link"),
    );

    expect(() =>
      auditRuntimeAssets({ repositoryRoot: root, buildRoot: "dist-link" }),
    ).toThrow(/Build root must stay inside the repository root/);
  });

  it("rejects a sibling directory that merely shares the repository prefix", () => {
    const root = createFixture();
    const sibling = `${root}-external`;
    fs.mkdirSync(sibling, { recursive: true });
    temporaryRoots.push(sibling);

    expect(() =>
      auditRuntimeAssets({ repositoryRoot: root, buildRoot: sibling }),
    ).toThrow(/Build root must stay inside the repository root/);
  });

  it("rejects a relative external manifest", () => {
    const root = createFixture();
    const external = createExternalFixture();
    const relativeEscape = path.relative(
      root,
      path.join(external, "fakemanifest.json"),
    );

    expect(relativeEscape.startsWith("..")).toBe(true);
    expect(() =>
      auditRuntimeAssets({
        repositoryRoot: root,
        manifestPath: relativeEscape,
      }),
    ).toThrow(/Asset manifest must stay inside the repository root/);
  });

  it("rejects an absolute external manifest", () => {
    const root = createFixture();
    const external = createExternalFixture();

    expect(() =>
      auditRuntimeAssets({
        repositoryRoot: root,
        manifestPath: path.join(external, "fakemanifest.json"),
      }),
    ).toThrow(/Asset manifest must stay inside the repository root/);
  });

  it("rejects manifest path traversal that climbs out of the repository", () => {
    const root = createFixture();
    const external = createExternalFixture();
    const traversal = path.join(
      "art",
      "manifest",
      "..",
      "..",
      "..",
      path.basename(external),
      "fakemanifest.json",
    );

    expect(() =>
      auditRuntimeAssets({ repositoryRoot: root, manifestPath: traversal }),
    ).toThrow(/Asset manifest must stay inside the repository root/);
  });

  it("rejects a manifest reached through a repository-relative symlink", () => {
    const root = createFixture();
    const external = createExternalFixture();
    fs.symlinkSync(
      path.join(external, "fakemanifest.json"),
      path.join(root, "art/manifest/external.json"),
    );

    expect(() =>
      auditRuntimeAssets({
        repositoryRoot: root,
        manifestPath: "art/manifest/external.json",
      }),
    ).toThrow(/Asset manifest must stay inside the repository root/);
  });

  it("rejects a manifest path that is not a regular file", () => {
    const root = createFixture();

    expect(() =>
      auditRuntimeAssets({
        repositoryRoot: root,
        manifestPath: "art/manifest",
      }),
    ).toThrow(/Asset manifest is not a regular file/);
  });

  it("rejects a symlink anywhere in audited build output", () => {
    const root = createFixture();
    fs.symlinkSync(
      path.join(root, "art/families/office/runtime.png"),
      path.join(root, "dist/client/assets/linked.png"),
    );

    expect(() => auditRuntimeAssets({ repositoryRoot: root })).toThrow(
      /Symlinks are not allowed in audited build output/,
    );
  });

  it("still supports a repository-contained alternate build directory", () => {
    const root = createFixture();
    write(root, "dist-alternate/client/assets/runtime-a.png", "runtime-image");

    const report = auditRuntimeAssets({
      repositoryRoot: root,
      buildRoot: "dist-alternate",
    });

    expect(report.inputs.buildRoot).toBe("dist-alternate");
    expect(report.totals.rasters.files).toBe(1);
    expect(report.rasters[0]?.classification).toBe("player-runtime");
  });

  it("reports canonical repository-relative inputs for the default audit", () => {
    const root = createFixture();
    const byDefault = auditRuntimeAssets({ repositoryRoot: root });
    const explicit = auditRuntimeAssets({
      repositoryRoot: root,
      buildRoot: "dist",
      manifestPath: "art/manifest/asset_manifest.json",
    });

    expect(byDefault.inputs.buildRoot).toBe("dist");
    expect(byDefault.inputs.manifestPath).toBe(
      "art/manifest/asset_manifest.json",
    );
    expect(byDefault.inputs.repositoryArtRoot).toBe("art");
    expect(JSON.stringify(explicit)).toBe(JSON.stringify(byDefault));
  });
});

describe("hash and identity overlap retention", () => {
  it("keeps repository source overlap on a released production hash", () => {
    const root = createFixture();
    write(
      root,
      "art/generated/candidates/wave/runtime-duplicate.png",
      "runtime-image",
    );

    const report = auditRuntimeAssets({ repositoryRoot: root });
    const row = report.rasters.find(
      (candidate) => candidate.emittedPath === "client/assets/runtime-a.png",
    );

    expect(row?.classification).toBe("player-runtime");
    expect(row?.knownPlayerRuntimeMaterial).toBe(true);
    expect(row?.sourceCandidateReference).toBe(true);
    expect(row?.repositorySourcePaths).toEqual([
      "art/families/office/runtime.png",
      "art/generated/candidates/wave/runtime-duplicate.png",
    ]);
    expect(row?.manifestMatches.map((match) => match.assetId)).toEqual([
      "office_runtime",
    ]);
  });

  it("retains every manifest identity that shares one content hash", () => {
    const root = createFixture();
    write(root, "art/families/office/runtime-alias.png", "runtime-image");
    const manifest = readManifest(root);
    manifest.assets.push({
      ...manifest.assets[0]!,
      asset_id: "office_runtime_alias",
      final_path: "art/families/office/runtime-alias.png",
      raster_tiers: undefined,
    });
    writeManifest(root, manifest);

    const report = auditRuntimeAssets({ repositoryRoot: root });
    const row = report.rasters.find(
      (candidate) => candidate.emittedPath === "client/assets/runtime-a.png",
    );

    expect(row?.manifestMatches.map((match) => match.assetId)).toEqual([
      "office_runtime",
      "office_runtime_alias",
    ]);
    expect(row?.manifestMatches[1]?.roles).toEqual([
      {
        role: "final",
        repositoryPath: "art/families/office/runtime-alias.png",
      },
    ]);
    expect(row?.classification).toBe("player-runtime");
  });

  it("de-duplicates only genuinely identical final and tier roles", () => {
    const root = createFixture();
    write(root, "art/families/office/runtime-alias.png", "runtime-image");
    const manifest = readManifest(root);
    const runtimeAsset = manifest.assets[0]!;
    const existingTier = runtimeAsset.raster_tiers![0]!;
    runtimeAsset.raster_tiers = [
      existingTier,
      { ...existingTier },
      { ...existingTier, path: "art/families/office/runtime-alias.png" },
    ];
    writeManifest(root, manifest);

    const report = auditRuntimeAssets({ repositoryRoot: root });
    const row = report.rasters.find(
      (candidate) => candidate.emittedPath === "client/assets/runtime-a.png",
    );

    expect(row?.manifestMatches[0]?.roles).toEqual([
      { role: "final", repositoryPath: "art/families/office/runtime.png" },
      {
        role: "tier",
        repositoryPath: "art/families/office/runtime-alias.png",
      },
      { role: "tier", repositoryPath: "art/families/office/runtime.png" },
    ]);
  });
});
