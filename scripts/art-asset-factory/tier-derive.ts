import fs from "fs";
import path from "path";
import * as PImage from "pureimage";

import {
  planRuntimeTiers,
  type PlannedTier,
  type TierPlan,
  type TierPlanMaster,
} from "../../src/authoring/tier-plan";
import { hashArtFile } from "./content-hash";
import { resampleLanczos } from "./resample";

/**
 * SYSTEM 2, filesystem half.
 *
 * EXECUTES a tier plan. It makes no decisions of its own: which widths exist,
 * which were skipped and what lineage each carries were all settled by
 * `planRuntimeTiers`, and this module's whole job is to produce the bytes and
 * hash them.
 *
 * Keeping the decision and the execution apart is what makes the guarantee
 * testable. "Never enlarges" is a property of a pure function with a test
 * suite, not a claim about an image-processing script nobody can run in CI.
 *
 * The approved master is opened read-only and never written back. A derived
 * tier goes to its own path under its own directory, which the planner has
 * already refused to place alongside the master.
 */

export interface DerivedTier extends PlannedTier {
  /** SHA-256 of the file this run produced. */
  readonly hash: string;
  readonly byteLength: number;
}

export interface TierDerivationResult {
  readonly plan: TierPlan;
  readonly derived: readonly DerivedTier[];
  /** Absolute path of the master, which this run did not modify. */
  readonly masterPath: string;
  readonly masterHashBefore: string;
  readonly masterHashAfter: string;
}

export interface TierDerivationOptions {
  readonly assetId: string;
  /** Absolute or process-relative path to the approved master. */
  readonly masterPath: string;
  /** Directory derived tiers are written into. Created if absent. */
  readonly outputDirectory: string;
  /**
   * Where real detail stops.
   *
   * - a number — the intake report's declared `nativeDetailWidth`;
   * - `"assume-native"` — the master's own width is its detail, resolved here
   *   because only this module has opened the file;
   * - `null` — nobody has vouched for it, and every tier says so.
   *
   * There is no default. Which of the three is true is a claim about the art's
   * history, and this module will not make it on an author's behalf.
   */
  readonly nativeDetailWidth: number | null | "assume-native";
  readonly requestedWidths?: readonly number[];
  readonly repositoryRoot: string;
}

async function readPng(filePath: string): Promise<PImage.Bitmap> {
  return PImage.decodePNGFromStream(fs.createReadStream(filePath));
}

async function writePng(
  bitmap: PImage.Bitmap,
  filePath: string,
): Promise<void> {
  await PImage.encodePNGToStream(bitmap, fs.createWriteStream(filePath));
}

/**
 * Derives every tier the plan allows.
 *
 * Hashes the master before and after so the result can state, as evidence
 * rather than as assurance, that the approved original was untouched.
 */
export async function deriveRuntimeTiers(
  options: TierDerivationOptions,
): Promise<TierDerivationResult> {
  const masterPath = path.resolve(options.masterPath);
  if (!fs.existsSync(masterPath)) {
    throw new Error(`No master at '${masterPath}'.`);
  }
  const masterHashBefore = hashArtFile(masterPath);
  const source = await readPng(masterPath);

  const repositoryRoot = path.resolve(options.repositoryRoot);
  const outputDirectory = path.resolve(options.outputDirectory);
  const relativeOutput = path
    .relative(repositoryRoot, outputDirectory)
    .replace(/\\/g, "/");
  const relativeMaster = path
    .relative(repositoryRoot, masterPath)
    .replace(/\\/g, "/");

  const master: TierPlanMaster = {
    assetId: options.assetId,
    width: source.width,
    height: source.height,
    nativeDetailWidth:
      options.nativeDetailWidth === "assume-native"
        ? source.width
        : options.nativeDetailWidth,
    masterPath: relativeMaster,
  };

  const plan = planRuntimeTiers({
    master,
    outputDirectory: relativeOutput,
    ...(options.requestedWidths !== undefined
      ? { requestedWidths: options.requestedWidths }
      : {}),
  });

  fs.mkdirSync(outputDirectory, { recursive: true });

  const derived: DerivedTier[] = [];
  for (const tier of plan.tiers) {
    if (tier.width > source.width || tier.height > source.height) {
      // Unreachable by construction; asserted here because the cost of being
      // wrong is a silently upscaled production plate.
      throw new Error(
        `Refusing to write tier ${tier.width}x${tier.height} from a ${source.width}x${source.height} master: the pipeline does not enlarge.`,
      );
    }
    const absolute = path.resolve(repositoryRoot, tier.path);
    const bitmap =
      tier.width === source.width && tier.height === source.height
        ? source
        : resampleLanczos(source, tier.width, tier.height);
    await writePng(bitmap, absolute);
    derived.push({
      ...tier,
      hash: hashArtFile(absolute),
      byteLength: fs.statSync(absolute).size,
    });
  }

  return {
    plan,
    derived,
    masterPath: relativeMaster,
    masterHashBefore,
    masterHashAfter: hashArtFile(masterPath),
  };
}

/** Content hashes by tier width, for handing to the scene scaffold. */
export function tierHashMap(
  result: TierDerivationResult,
): ReadonlyMap<number, string> {
  return new Map(result.derived.map((tier) => [tier.width, tier.hash]));
}
