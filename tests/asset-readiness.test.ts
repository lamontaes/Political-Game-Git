import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  reconcileAssetReadiness,
  type AssetReadinessDeclaration,
  type AssetReadinessFindingCode,
  type EvidenceProbe,
  type PreservedUnit,
  type ProbeEvidence,
} from "../src/authoring/asset-readiness";
import {
  openAssetRequests,
  type AssetRequest,
} from "../src/authoring/asset-request";
import {
  preservedUnits as preservedUnitsOf,
  readAssetReadinessInputs,
} from "../scripts/art-asset-factory/asset-readiness-inputs";

const ROOT = path.resolve(__dirname, "..");
const inputs = readAssetReadinessInputs(ROOT);
const report = reconcileAssetReadiness(
  inputs.requests.requests,
  inputs.declaration,
  inputs.preservedUnits,
  inputs.probe,
);

const codesOf = (
  declaration: AssetReadinessDeclaration = inputs.declaration,
  units: readonly PreservedUnit[] = inputs.preservedUnits,
  probe: ProbeEvidence = inputs.probe,
): AssetReadinessFindingCode[] =>
  reconcileAssetReadiness(
    inputs.requests.requests,
    declaration,
    units,
    probe,
  ).findings.map((finding) => finding.code);

const withVerdicts = (
  change: (
    verdict: AssetReadinessDeclaration["requestVerdicts"][number],
  ) => AssetReadinessDeclaration["requestVerdicts"][number],
): AssetReadinessDeclaration => ({
  ...inputs.declaration,
  requestVerdicts: inputs.declaration.requestVerdicts.map(change),
});

/** The first verdict that actually rests on preserved art. */
const evidencedVerdict = inputs.declaration.requestVerdicts.find(
  (verdict) => verdict.preservedUnits.length > 0,
)!;

/**
 * The failure this suite exists to stop is a specific one that has already
 * happened here: the queue asked for the twelve footwear pairs to be
 * re-rendered front-on while the corrected front-facing source sat ingested,
 * chopped and hash-verified in the same repository.
 *
 * The second half of the suite is adversarial. Every case is a way a
 * declaration could look correct while meaning nothing — a path that merely
 * contains a unit's name, a directory that exists but has lost a component, a
 * unit filed as both used and forgotten — and each one has to fail closed.
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
    const codes = reconcileAssetReadiness(
      inputs.requests.requests.map((request) =>
        request.requestId === closed.requestId ? stillOpen : request,
      ),
      inputs.declaration,
      inputs.preservedUnits,
      inputs.probe,
    ).findings.map((finding) => finding.code);
    expect(codes).toContain("closed-request-still-open");
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

describe("the current preserved universe", () => {
  /**
   * The partition is the whole claim: twenty units, each one either linked to
   * a request or recorded as answering none, never both and never neither.
   */
  it("reconciles all twenty units exactly once", () => {
    expect(inputs.preservedUnits).toHaveLength(20);
    const linked = new Set(report.linkedPreservedUnits);
    const unlinked = new Set(report.unlinkedPreservedUnits);
    expect(linked.size + unlinked.size).toBe(20);
    for (const unit of inputs.preservedUnits) {
      const isLinked = linked.has(unit.unitKey);
      const isUnlinked = unlinked.has(unit.unitKey);
      expect(isLinked || isUnlinked, unit.unitKey).toBe(true);
      expect(isLinked && isUnlinked, unit.unitKey).toBe(false);
    }
  });

  /**
   * Five components carry a baked lectern. An earlier reading of the same
   * evidence cited four and left out the skinny-man back view, which the
   * review classifies LECTERN.
   */
  it("represents all five lectern components", () => {
    const review = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          "art/qa/p95-recent-drive-sweep/candidate-component-review.json",
        ),
        "utf8",
      ),
    ) as {
      components: { bakedPropStatus: string; choppedOutputPath: string }[];
    };
    const lecterns = review.components
      .filter((component) => component.bakedPropStatus === "LECTERN")
      .map((component) => component.choppedOutputPath);
    expect(lecterns).toHaveLength(5);
    const verdict = inputs.declaration.requestVerdicts.find(
      (entry) => entry.requestId === "person-adult-lectern-pose",
    )!;
    for (const lectern of lecterns) {
      expect(verdict.evidencePaths, lectern).toContain(lectern);
    }
  });

  /**
   * IMG_5190 and IMG_5207 are different bytes that decode to the same picture,
   * and IMG_5205 is the clean storefront. All three bear on the storefront
   * request; none of them is filed as answering no request.
   */
  it("represents the storefront relationships exactly", () => {
    const verdict = inputs.declaration.requestVerdicts.find(
      (entry) => entry.requestId === "env-campaign-storefront",
    )!;
    expect([...verdict.preservedUnits].sort()).toEqual([
      "source:IMG_5190.JPG",
      "source:IMG_5205.JPG",
      "source:IMG_5207.JPG",
    ]);
    for (const unit of verdict.preservedUnits) {
      expect(report.unlinkedPreservedUnits, unit).not.toContain(unit);
    }
    // The accessory sheet is the environment-shaped unit that stays unlinked.
    expect(report.unlinkedPreservedUnits).toContain("source:IMG_5203.PNG");
  });
});

describe("the reconciliation fails closed when", () => {
  const anyUnit = inputs.preservedUnits[0]!;
  const familyUnit = inputs.preservedUnits.find(
    (unit) => unit.directories.length > 0,
  )!;
  const familyDirectory = familyUnit.directories[0]!;

  /** A probe that answers for literals rather than the repository. */
  const probeOf =
    (answers: Readonly<Record<string, EvidenceProbe>>): ProbeEvidence =>
    (declaredPath) =>
      answers[declaredPath] ?? { status: "missing" };

  const citing = (
    unitKey: string,
    evidencePaths: readonly string[],
  ): AssetReadinessDeclaration => ({
    ...inputs.declaration,
    requestVerdicts: inputs.declaration.requestVerdicts.map((verdict) =>
      verdict.requestId === evidencedVerdict.requestId
        ? { ...verdict, preservedUnits: [unitKey], evidencePaths }
        : verdict,
    ),
  });

  /**
   * 1. The old check accepted any path containing the unit's name. A file in
   * an unrelated tree whose name happens to embed it is not evidence for it.
   */
  it("an unrelated path merely contains a unit's name", () => {
    const decoy = `art/scratch/notes-about-${familyUnit.unitKey.replace("family:", "")}-do-not-use.png`;
    const codes = codesOf(
      citing(familyUnit.unitKey, [decoy]),
      inputs.preservedUnits,
      probeOf({
        [decoy]: { status: "regular-file", sha256: "0".repeat(64) },
      }),
    );
    expect(codes).toContain("evidence-outside-declared-universe");
  });

  /**
   * 2. `male-tops` is a substring of nothing, but `average-man` sits inside
   * `average-man-rejects`. Overlapping names must not lend each other proof.
   */
  it("one unit's name overlaps another's", () => {
    const overlapping: PreservedUnit = {
      unitKey: "family:average-man-rejects",
      files: [
        {
          path: "art/generated/candidates/wave-a-morphology/average-man-rejects/reject.png",
          sha256: "1".repeat(64),
        },
      ],
      directories: [],
    };
    const codes = codesOf(
      citing("family:average-man", [overlapping.files[0]!.path]),
      [...inputs.preservedUnits, overlapping],
      probeOf({
        [overlapping.files[0]!.path]: {
          status: "regular-file",
          sha256: "1".repeat(64),
        },
      }),
    );
    expect(codes).toContain("evidence-outside-declared-universe");
  });

  /**
   * 3. Two sources may share a basename in different directories. Identity is
   * the full recorded path, never the basename.
   */
  it("two sources collide on their basename", () => {
    const collision: PreservedUnit = {
      unitKey: "source:shoes.png",
      files: [
        {
          path: "art/references/candidates/other-sweep/source-images/shoes.png",
          sha256: "2".repeat(64),
        },
      ],
      directories: [],
    };
    const codes = codesOf(
      citing("family:shoes", [collision.files[0]!.path]),
      [...inputs.preservedUnits, collision],
      probeOf({
        [collision.files[0]!.path]: {
          status: "regular-file",
          sha256: "2".repeat(64),
        },
      }),
    );
    expect(codes).toContain("evidence-outside-declared-universe");
  });

  /** 4. A directory proves nothing by existing. */
  it("a cited family directory has lost a component", () => {
    const codes = codesOf(
      citing(familyUnit.unitKey, [familyDirectory.path]),
      inputs.preservedUnits,
      probeOf({
        [familyDirectory.path]: {
          status: "directory",
          members: familyDirectory.members.slice(1),
        },
      }),
    );
    expect(codes).toContain("evidence-member-missing");
  });

  /** 5. One member re-rendered under the same name is still a different asset. */
  it("one component of a cited family has drifted", () => {
    const codes = codesOf(
      citing(familyUnit.unitKey, [familyDirectory.path]),
      inputs.preservedUnits,
      probeOf({
        [familyDirectory.path]: {
          status: "directory",
          members: familyDirectory.members.map((member, index) =>
            index === 0 ? { ...member, sha256: "3".repeat(64) } : member,
          ),
        },
      }),
    );
    expect(codes).toContain("evidence-hash-drift");
  });

  /** 6. The same, for a standalone file. */
  it("a cited file has drifted", () => {
    const fileUnit = inputs.preservedUnits.find(
      (unit) => unit.unitKey.startsWith("source:") && unit.files.length > 0,
    )!;
    const cited = fileUnit.files[0]!;
    const codes = codesOf(
      citing(fileUnit.unitKey, [cited.path]),
      inputs.preservedUnits,
      probeOf({
        [cited.path]: { status: "regular-file", sha256: "4".repeat(64) },
      }),
    );
    expect(codes).toContain("evidence-hash-drift");
  });

  /** 7. A path that climbs out never reaches the filesystem. */
  it("evidence traverses out of the repository with ..", () => {
    const codes = codesOf(
      citing(anyUnit.unitKey, ["../outside-the-repository/stolen.png"]),
      inputs.preservedUnits,
      probeOf({}),
    );
    expect(codes).toContain("evidence-path-not-canonical");
  });

  /** 8. Neither does an absolute one. */
  it("evidence is an absolute external path", () => {
    const codes = codesOf(
      citing(anyUnit.unitKey, ["/etc/passwd"]),
      inputs.preservedUnits,
      probeOf({}),
    );
    expect(codes).toContain("evidence-path-not-canonical");
  });

  /**
   * 9. A canonical-looking path can still resolve outside the root through a
   * symlink, so the probe reports where it really landed. This is the real
   * filesystem, not a literal.
   */
  it("evidence escapes the repository through a symlink", () => {
    const link = "art/qa/asset-readiness-escape-fixture";
    const absolute = path.join(ROOT, link);
    const outside = fs.realpathSync(path.join(ROOT, ".."));
    fs.symlinkSync(outside, absolute);
    try {
      const escaping: PreservedUnit = {
        unitKey: "family:escape-fixture",
        files: [],
        directories: [{ path: link, members: [] }],
      };
      const codes = codesOf(
        citing(escaping.unitKey, [link]),
        [...inputs.preservedUnits, escaping],
        inputs.probe,
      );
      expect(codes).toContain("evidence-escapes-repository");
    } finally {
      fs.unlinkSync(absolute);
    }
  });

  /** 10. A key nobody preserved. */
  it("a verdict names an unknown preserved unit", () => {
    const codes = codesOf(
      withVerdicts((verdict) =>
        verdict.requestId === evidencedVerdict.requestId
          ? { ...verdict, preservedUnits: ["family:invented"] }
          : verdict,
      ),
    );
    expect(codes).toContain("unknown-preserved-unit");
  });

  /** 11. The same key twice in one verdict. */
  it("a verdict names the same preserved unit twice", () => {
    const codes = codesOf(
      withVerdicts((verdict) =>
        verdict.requestId === evidencedVerdict.requestId
          ? {
              ...verdict,
              preservedUnits: [
                ...verdict.preservedUnits,
                verdict.preservedUnits[0]!,
              ],
            }
          : verdict,
      ),
    );
    expect(codes).toContain("duplicate-preserved-unit");
  });

  /** 12. Used and forgotten at the same time. */
  it("a unit is both linked and recorded as unlinked", () => {
    const linkedUnit = evidencedVerdict.preservedUnits[0]!;
    const source = inputs.declaration.unlinkedPreservedAssets[0]!;
    const codes = codesOf({
      ...inputs.declaration,
      unlinkedPreservedAssets: [
        ...inputs.declaration.unlinkedPreservedAssets,
        {
          ...source,
          preservedUnit: linkedUnit,
          evidencePaths: evidencedVerdict.evidencePaths,
        },
      ],
    });
    expect(codes).toContain("unit-linked-and-unlinked");
  });

  /** 13. Forgotten twice. */
  it("a unit is recorded as unlinked twice", () => {
    const source = inputs.declaration.unlinkedPreservedAssets[0]!;
    const codes = codesOf({
      ...inputs.declaration,
      unlinkedPreservedAssets: [
        ...inputs.declaration.unlinkedPreservedAssets,
        { ...source },
      ],
    });
    expect(codes).toContain("duplicate-unlinked-unit");
  });

  /**
   * 14. "We have this and nobody wants it" is a claim about art that is here.
   * Without evidence it is a claim about nothing.
   */
  it("an unlinked declaration cites no evidence", () => {
    const codes = codesOf({
      ...inputs.declaration,
      unlinkedPreservedAssets: inputs.declaration.unlinkedPreservedAssets.map(
        (entry, index) =>
          index === 0 ? { ...entry, evidencePaths: [] } : entry,
      ),
    });
    expect(codes).toContain("unlinked-without-evidence");
  });

  /**
   * 15. The blind spot this repair closes. The old inputs listed the
   * classifications that DO need a decision, so a sweep inventing a new class
   * hid its art by default. The set is now the classifications that do not,
   * and anything else becomes a unit that has to be reconciled.
   */
  it("newly preserved material carries an unfamiliar classification", () => {
    const review = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          "art/qa/p95-recent-drive-sweep/candidate-component-review.json",
        ),
        "utf8",
      ),
    );
    const inventory = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          "art/qa/p95-recent-drive-sweep/drive-image-inventory.json",
        ),
        "utf8",
      ),
    ) as {
      files: { filename: string; sha256: string; classification: string }[];
    };
    const widened = {
      files: [
        ...inventory.files,
        {
          filename: "IMG_9999.JPG",
          sha256: "6".repeat(64),
          classification: "SOME_CLASSIFICATION_INVENTED_LATER",
        },
      ],
    };
    const units = preservedUnitsOf(review, widened);
    expect(units.map((unit) => unit.unitKey)).toContain("source:IMG_9999.JPG");
    expect(codesOf(inputs.declaration, units)).toContain(
      "preserved-unit-unreconciled",
    );
  });

  /** 16. And an ordinary new family is just as loud. */
  it("a newly ingested family answers no request", () => {
    const codes = codesOf(inputs.declaration, [
      ...inputs.preservedUnits,
      {
        unitKey: "family:newly-ingested",
        files: [],
        directories: [
          {
            path: "art/generated/candidates/newly-ingested",
            members: [
              {
                path: "art/generated/candidates/newly-ingested/a.png",
                sha256: "7".repeat(64),
              },
            ],
          },
        ],
      },
    ]);
    expect(codes).toContain("preserved-unit-unreconciled");
  });

  /** 17. A verdict that rests on art it never cites. */
  it("a declared unit is backed by no cited evidence", () => {
    const spare = inputs.preservedUnits.find(
      (unit) => !evidencedVerdict.preservedUnits.includes(unit.unitKey),
    )!;
    const codes = codesOf(
      withVerdicts((verdict) =>
        verdict.requestId === evidencedVerdict.requestId
          ? {
              ...verdict,
              preservedUnits: [...verdict.preservedUnits, spare.unitKey],
            }
          : verdict,
      ),
    );
    expect(codes).toContain("preserved-unit-without-evidence");
  });

  /** 18. And one that says nothing bears on it while citing art that does. */
  it("an unaffected verdict names preserved art", () => {
    const codes = codesOf(
      withVerdicts((verdict) =>
        verdict.verdict === "unaffected-still-required"
          ? { ...verdict, preservedUnits: [anyUnit.unitKey] }
          : verdict,
      ),
    );
    expect(codes).toContain("unaffected-verdict-cites-evidence");
  });
});
