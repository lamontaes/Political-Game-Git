import crypto from "crypto";
import fs from "fs";
import path from "path";

import type {
  AssetReadinessDeclaration,
  EvidenceProbe,
  PreservedEvidenceFile,
  PreservedUnit,
  ProbeEvidence,
} from "../../src/authoring/asset-readiness";
import type { AssetRequestDocument } from "../../src/authoring/asset-request";

/**
 * The repository side of the readiness reconciliation.
 *
 * `src/authoring/asset-readiness.ts` stays free of the filesystem so it can be
 * reasoned about and tested on literals. Everything that has to look at the
 * repository — which units the preserved evidence holds, what is actually on
 * disk and what it hashes — is gathered here and handed to it.
 */

interface ComponentReview {
  readonly components: readonly {
    readonly family: string;
    readonly sourceFilename: string;
    readonly sourceSha256: string;
    readonly choppedOutputPath: string;
    readonly outputSha256: string;
  }[];
}

interface DriveInventory {
  readonly files: readonly {
    readonly filename: string;
    readonly sha256: string;
    readonly classification: string;
  }[];
}

/**
 * Classifications that name art nobody has to reconcile, each for a stated
 * reason: it is the same bytes as something else, it is already represented by
 * released art, or it was swept as reference and never as a candidate.
 *
 * This set is CLOSED, and that is the point. A sweep that invents a new
 * classification does not quietly fall through it — the file becomes a
 * preserved unit and readiness fails until somebody reconciles it. The previous
 * shape of this file listed the classifications that DO need a decision, which
 * meant any future class was hidden by default.
 */
const NOT_A_PRESERVED_UNIT = new Set([
  "EXACT_DUPLICATE",
  "ALREADY_REPRESENTED",
  "REFERENCE_ONLY",
]);

/** Where a swept source sheet is kept once it is in the repository. */
const SOURCE_IMAGE_DIRECTORY =
  "art/references/candidates/recent-drive-sweep/source-images";

export interface AssetReadinessInputs {
  readonly requests: AssetRequestDocument;
  readonly declaration: AssetReadinessDeclaration;
  readonly preservedUnits: readonly PreservedUnit[];
  readonly probe: ProbeEvidence;
}

function load<T>(root: string, relative: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8")) as T;
}

function sha256(absolute: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(absolute))
    .digest("hex");
}

/**
 * Every unit of preserved art the reconciliation has to account for, each with
 * the closed set of evidence admissible for it.
 *
 * A chopped family is one unit: its component directory with the exact member
 * set and hashes the review recorded, plus its source sheet when the sheet is
 * in the repository. A standalone source is one unit: the file, at the hash the
 * sweep recorded.
 *
 * A sheet that became a family is counted once, as the family, and that
 * subsumption comes from the review's exact source record — the filename or
 * the source hash — never from a filename resembling a family id.
 */
export function preservedUnits(
  review: ComponentReview,
  inventory: DriveInventory,
): PreservedUnit[] {
  const units: PreservedUnit[] = [];

  const families = new Map<
    string,
    { members: PreservedEvidenceFile[]; sources: Map<string, string> }
  >();
  for (const component of review.components) {
    const family =
      families.get(component.family) ??
      families
        .set(component.family, { members: [], sources: new Map() })
        .get(component.family)!;
    family.members.push({
      path: component.choppedOutputPath,
      sha256: component.outputSha256,
    });
    family.sources.set(component.sourceFilename, component.sourceSha256);
  }

  for (const [familyId, family] of [...families].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const directories = new Map<string, PreservedEvidenceFile[]>();
    for (const member of family.members) {
      const directory = path.posix.dirname(member.path);
      (
        directories.get(directory) ??
        directories.set(directory, []).get(directory)!
      ).push(member);
    }
    units.push({
      unitKey: `family:${familyId}`,
      // The source sheet when it is here, and every component individually, so
      // a verdict may cite the exact cell it rests on and have that cell's own
      // hash checked rather than the family's.
      files: [
        ...[...family.sources].map(([filename, hash]) => ({
          path: `${SOURCE_IMAGE_DIRECTORY}/${filename}`,
          sha256: hash,
        })),
        ...family.members,
      ].sort((a, b) => (a.path < b.path ? -1 : 1)),
      directories: [...directories]
        .map(([directory, members]) => ({
          path: directory,
          members: [...members].sort((a, b) => (a.path < b.path ? -1 : 1)),
        }))
        .sort((a, b) => (a.path < b.path ? -1 : 1)),
    });
  }

  /**
   * A sheet that became a family is counted once, as the family. The relation
   * is the review's own source record and nothing weaker: the exact filename,
   * or the exact source SHA-256 for the same bytes swept under another name.
   * The `supplies` sheet is swept extensionless and banked as `supplies.png`;
   * it is the same bytes, and the hash is what proves that. A basename that
   * merely resembles a family id proves nothing and is never consulted.
   */
  const familySourceNames = new Set(
    review.components.map((component) => component.sourceFilename),
  );
  const familySourceHashes = new Set(
    review.components.map((component) => component.sourceSha256),
  );

  const standalone = new Map<string, string>();
  for (const file of inventory.files) {
    if (familySourceNames.has(file.filename)) continue;
    if (familySourceHashes.has(file.sha256)) continue;
    if (NOT_A_PRESERVED_UNIT.has(file.classification)) continue;
    standalone.set(file.filename, file.sha256);
  }
  for (const [filename, hash] of [...standalone].sort(([a], [b]) =>
    a < b ? -1 : 1,
  )) {
    units.push({
      unitKey: `source:${filename}`,
      files: [{ path: `${SOURCE_IMAGE_DIRECTORY}/${filename}`, sha256: hash }],
      directories: [],
    });
  }

  return units;
}

/**
 * Looks at one declared path.
 *
 * The path has already passed the canonical-shape gate before it gets here.
 * This still resolves it, because a symlink inside the repository can point
 * anywhere: what the repository holds is decided by the REAL path, and a real
 * path outside the root is reported as an escape rather than read.
 */
export function probeRepository(root: string): ProbeEvidence {
  const realRoot = fs.realpathSync(root);
  return (declaredPath: string): EvidenceProbe => {
    const absolute = path.resolve(realRoot, declaredPath);
    let real: string;
    try {
      real = fs.realpathSync(absolute);
    } catch {
      return { status: "missing" };
    }
    if (real !== realRoot && !real.startsWith(realRoot + path.sep)) {
      return { status: "escapes-repository" };
    }
    const stats = fs.statSync(real);
    if (stats.isFile()) return { status: "regular-file", sha256: sha256(real) };
    if (!stats.isDirectory()) return { status: "irregular" };
    const members: PreservedEvidenceFile[] = [];
    for (const entry of fs.readdirSync(real, { withFileTypes: true })) {
      const memberAbsolute = path.join(real, entry.name);
      if (!fs.statSync(memberAbsolute).isFile()) continue;
      members.push({
        path: path.posix.join(declaredPath, entry.name),
        sha256: sha256(memberAbsolute),
      });
    }
    members.sort((a, b) => (a.path < b.path ? -1 : 1));
    return { status: "directory", members };
  };
}

export function readAssetReadinessInputs(root: string): AssetReadinessInputs {
  const requests = load<AssetRequestDocument>(
    root,
    "art/requests/asset-requests.json",
  );
  const declaration = load<AssetReadinessDeclaration>(
    root,
    "art/requests/preserved-asset-reconciliation.json",
  );
  const review = load<ComponentReview>(
    root,
    "art/qa/p95-recent-drive-sweep/candidate-component-review.json",
  );
  const inventory = load<DriveInventory>(
    root,
    "art/qa/p95-recent-drive-sweep/drive-image-inventory.json",
  );

  return {
    requests,
    declaration,
    preservedUnits: preservedUnits(review, inventory),
    probe: probeRepository(root),
  };
}
