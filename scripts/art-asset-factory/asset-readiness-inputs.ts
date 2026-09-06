import fs from "fs";
import path from "path";

import type { AssetReadinessDeclaration } from "../../src/authoring/asset-readiness";
import type { AssetRequestDocument } from "../../src/authoring/asset-request";

/**
 * The repository side of the readiness reconciliation.
 *
 * `src/authoring/asset-readiness.ts` stays free of the filesystem so it can be
 * reasoned about and tested on literals. Everything that has to look at the
 * repository - which families were preserved, which cited evidence is really
 * on disk - is gathered here and handed to it.
 */

interface ComponentReview {
  readonly components: readonly {
    readonly family: string;
    readonly sourceFilename: string;
  }[];
}

interface DriveInventory {
  readonly files: readonly {
    readonly filename: string;
    readonly classification: string;
  }[];
}

/** Classifications that name art somebody has to make a decision about. */
const ACTIONABLE_STANDALONE = new Set([
  "NEW_PRODUCTION_SOURCE_CANDIDATE",
  "ADDITIONAL_VARIANT",
]);

export interface AssetReadinessInputs {
  readonly requests: AssetRequestDocument;
  readonly declaration: AssetReadinessDeclaration;
  readonly preservedUnits: readonly string[];
  readonly existingPaths: ReadonlySet<string>;
}

function load<T>(root: string, relative: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8")) as T;
}

/**
 * Every unit of preserved art the reconciliation has to account for: each
 * chopped candidate family, plus each standalone source the sweep marked as a
 * production candidate or a variant. A sheet that became a family is counted
 * once, as the family, so the same pixels are not asked about twice.
 */
export function preservedUnits(
  review: ComponentReview,
  inventory: DriveInventory,
): string[] {
  const families = new Set(review.components.map((c) => c.family));
  const sheetFilenames = new Set(
    review.components.flatMap((c) => [
      c.sourceFilename,
      c.sourceFilename.replace(/\.[^.]+$/, ""),
    ]),
  );
  const standalone = inventory.files
    .filter((file) => ACTIONABLE_STANDALONE.has(file.classification))
    .map((file) => file.filename)
    .filter((filename) => !sheetFilenames.has(filename));
  return [...new Set([...families, ...standalone])].sort();
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

  const cited = [
    ...declaration.requestVerdicts.flatMap((v) => v.evidencePaths),
    ...declaration.unlinkedPreservedAssets.flatMap((e) => e.evidencePaths),
  ];
  const existingPaths = new Set(
    cited.filter((relative) => fs.existsSync(path.join(root, relative))),
  );

  return {
    requests,
    declaration,
    preservedUnits: preservedUnits(review, inventory),
    existingPaths,
  };
}
