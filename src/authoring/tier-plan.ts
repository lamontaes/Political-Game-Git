/**
 * SYSTEM 2 — RUNTIME-TIER DERIVATION PLAN
 *
 * Decides, from an accepted master, exactly which rasters of the 1024 / 2048 /
 * 3072 / 4096 ladder may be produced — and says plainly which ones may not.
 *
 * Two refusals define this module.
 *
 * The first is that it never plans a tier wider than the master. Enlarging is
 * how a library ends up with a 4096 file that looks like a 2048 file, and the
 * cost is paid later by everyone who assumes the number means something. A
 * requested tier above the master is SKIPPED, with the shortfall stated, and
 * the ladder is simply shorter.
 *
 * The second is that it never launders declared lineage. A tier downscaled from
 * an externally upscaled master contains real pixels but not real detail, and
 * it inherits `nativeDetailWidth` so the runtime's fidelity warnings stay true.
 * Downscaling does not restore information; it only makes the loss less
 * visible, which is precisely why it must not be allowed to erase the record.
 *
 * The plan is a value. Producing the actual bytes is
 * `scripts/art-asset-factory/tier-derive.ts`, which executes a plan rather than
 * making its own decisions.
 */

import {
  ENVIRONMENT_TIER_LADDER,
  type RasterTierDerivation,
} from "../presentation/raster-tiers";

export interface TierPlanMaster {
  readonly assetId: string;
  readonly width: number;
  readonly height: number;
  /**
   * Where real detail stops. Equal to `width` for a native master; lower for a
   * master with declared upscale lineage; null when nobody has vouched for it.
   */
  readonly nativeDetailWidth: number | null;
  /** Repository-relative POSIX path of the preserved master. */
  readonly masterPath: string;
}

export interface TierPlanRequest {
  readonly master: TierPlanMaster;
  /** Defaults to the standard environment ladder. */
  readonly requestedWidths?: readonly number[];
  /**
   * Directory the derived tiers are written to, repository-relative. Must not
   * be the directory holding the master: a runtime tier never overwrites the
   * approved original.
   */
  readonly outputDirectory: string;
  /** File extension for derived tiers, without a dot. */
  readonly extension?: string;
}

export interface PlannedTier {
  readonly width: number;
  readonly height: number;
  readonly path: string;
  readonly derivation: RasterTierDerivation;
  /** Present only when detail stops short of `width`. */
  readonly nativeDetailWidth?: number;
  /** Exact scale factor from master to tier. At most 1; never above it. */
  readonly scaleFromMaster: number;
}

/**
 * Why a requested width produced no tier. There is exactly one reason, because
 * there is exactly one thing this planner refuses to do.
 */
export type SkippedTierReason = "would-enlarge-master";

export interface SkippedTier {
  readonly width: number;
  readonly reason: SkippedTierReason;
  /** How much enlargement was avoided. */
  readonly enlargementFactorAvoided: number;
  readonly message: string;
}

export type TierPlanWarningCode =
  | "ladder-top-below-envelope"
  | "tier-detail-below-width"
  | "native-detail-unverified"
  | "master-below-smallest-tier";

export interface TierPlanWarning {
  readonly code: TierPlanWarningCode;
  readonly message: string;
}

export interface TierPlan {
  readonly assetId: string;
  readonly masterPath: string;
  readonly masterWidth: number;
  readonly masterHeight: number;
  readonly nativeDetailWidth: number | null;
  /** Ascending by width. */
  readonly tiers: readonly PlannedTier[];
  /** Ascending by width. Requested but not derivable, with the reason. */
  readonly skipped: readonly SkippedTier[];
  readonly warnings: readonly TierPlanWarning[];
  /** The widest real detail this ladder can ever deliver. */
  readonly bestAvailableDetailWidth: number | null;
}

/**
 * Height for a target width, preserving the master's aspect exactly.
 *
 * Rounds to nearest and floors at 1. The ladder validator allows 0.5% of aspect
 * drift, which this always stays inside; rounding is unavoidable because
 * rasters have integer dimensions.
 */
export function tierHeightFor(
  master: { readonly width: number; readonly height: number },
  targetWidth: number,
): number {
  return Math.max(1, Math.round((targetWidth * master.height) / master.width));
}

function tierFileName(
  assetId: string,
  width: number,
  extension: string,
): string {
  return `${assetId}-${width}.${extension}`;
}

function normalizeDirectory(directory: string): string {
  return directory.replace(/\\/g, "/").replace(/\/+$/, "");
}

/**
 * Plans the ladder for one accepted master.
 *
 * The top of the ladder is the widest requested width the master can honestly
 * fill. When the master is NARROWER than the widest requested tier but wider
 * than the next one down, the master's own width joins the ladder as a
 * `native-master` tier: the alternative would be to discard real detail the
 * master actually has, purely because it does not land on a round number.
 */
export function planRuntimeTiers(request: TierPlanRequest): TierPlan {
  const { master } = request;
  if (!Number.isFinite(master.width) || master.width <= 0) {
    throw new Error(
      `Tier plan for '${master.assetId}' needs a positive master width.`,
    );
  }
  if (!Number.isFinite(master.height) || master.height <= 0) {
    throw new Error(
      `Tier plan for '${master.assetId}' needs a positive master height.`,
    );
  }
  if (
    master.nativeDetailWidth !== null &&
    master.nativeDetailWidth > master.width
  ) {
    throw new Error(
      `Tier plan for '${master.assetId}' declares ${master.nativeDetailWidth}px of detail behind a ${master.width}px master.`,
    );
  }

  const outputDirectory = normalizeDirectory(request.outputDirectory);
  const masterDirectory = normalizeDirectory(
    master.masterPath.replace(/\/[^/]*$/, ""),
  );
  if (outputDirectory === masterDirectory) {
    throw new Error(
      `Tier plan for '${master.assetId}' would write runtime tiers into '${outputDirectory}', the directory holding the approved master. The master is preserved separately from the ladder derived from it.`,
    );
  }

  const extension = request.extension ?? "png";
  const requested = [
    ...new Set(request.requestedWidths ?? ENVIRONMENT_TIER_LADDER),
  ].sort((a, b) => a - b);

  const tiers: PlannedTier[] = [];
  const skipped: SkippedTier[] = [];
  const warnings: TierPlanWarning[] = [];
  const claimed = new Set<number>();

  for (const width of requested) {
    if (width > master.width) {
      skipped.push({
        width,
        reason: "would-enlarge-master",
        enlargementFactorAvoided: width / master.width,
        message: `No ${width}px tier was produced: the master is ${master.width}px, and deriving one would mean enlarging it by ${(width / master.width).toFixed(2)}x. The ladder stops honestly instead.`,
      });
      continue;
    }
    claimed.add(width);
    tiers.push(buildPlannedTier(master, width, outputDirectory, extension));
  }

  // The master's own width earns a place only when the ladder would otherwise
  // throw away detail the master genuinely has.
  const widestRequested = requested[requested.length - 1] ?? 0;
  const widestPlanned = tiers.reduce(
    (widest, tier) => Math.max(widest, tier.width),
    0,
  );
  if (
    master.width < widestRequested &&
    master.width > widestPlanned &&
    !claimed.has(master.width)
  ) {
    claimed.add(master.width);
    tiers.push(
      buildPlannedTier(master, master.width, outputDirectory, extension),
    );
  }

  tiers.sort((a, b) => a.width - b.width);
  skipped.sort((a, b) => a.width - b.width);

  const bestAvailableDetailWidth =
    master.nativeDetailWidth === null
      ? null
      : Math.min(master.nativeDetailWidth, master.width);

  const smallestRequested = requested[0] ?? 0;
  if (master.width < smallestRequested) {
    warnings.push({
      code: "master-below-smallest-tier",
      message: `Master '${master.assetId}' is ${master.width}px, narrower than even the smallest requested tier (${smallestRequested}px). The ladder holds the master's own pixels and nothing else; no standard tier could be derived without enlargement, so none was.`,
    });
  }

  const top = tiers[tiers.length - 1];
  if (top && top.width < widestRequested) {
    warnings.push({
      code: "ladder-top-below-envelope",
      message: `The ladder tops out at ${top.width}px against a requested ${widestRequested}px. Displays needing more than ${top.width} device pixels of plate will be served a browser upscale, and the runtime will report it.`,
    });
  }
  if (master.nativeDetailWidth === null) {
    warnings.push({
      code: "native-detail-unverified",
      message: `Detail behind '${master.assetId}' is unverified, so every tier is planned as a plain downscale of pixels nobody has vouched for. Verify the master's lineage before this ladder is treated as production fidelity.`,
    });
  }
  for (const tier of tiers) {
    if (tier.nativeDetailWidth !== undefined) {
      warnings.push({
        code: "tier-detail-below-width",
        message: `Tier ${tier.width}px carries only ${tier.nativeDetailWidth}px of real detail, inherited from the master's declared upscale lineage. It is registered with that declaration so the runtime never treats it as ${tier.width}px of detail.`,
      });
    }
  }

  return {
    assetId: master.assetId,
    masterPath: master.masterPath,
    masterWidth: master.width,
    masterHeight: master.height,
    nativeDetailWidth: master.nativeDetailWidth,
    tiers,
    skipped,
    warnings,
    bestAvailableDetailWidth,
  };
}

function buildPlannedTier(
  master: TierPlanMaster,
  width: number,
  outputDirectory: string,
  extension: string,
): PlannedTier {
  const height = tierHeightFor(master, width);
  const path = `${outputDirectory}/${tierFileName(master.assetId, width, extension)}`;
  const scaleFromMaster = width / master.width;

  // Detail this tier can actually carry: never more than the master's own
  // declared detail, and never more than the tier's own pixels.
  const inheritedDetail =
    master.nativeDetailWidth === null
      ? null
      : Math.min(master.nativeDetailWidth, width);

  if (inheritedDetail !== null && inheritedDetail < width) {
    return {
      width,
      height,
      path,
      derivation: "external-upscale-derivative",
      nativeDetailWidth: inheritedDetail,
      scaleFromMaster,
    };
  }

  // A tier at exactly the master's width is the master's own pixels, not a
  // reduction of them.
  const derivation: RasterTierDerivation =
    width === master.width ? "native-master" : "deterministic-downscale";
  return { width, height, path, derivation, scaleFromMaster };
}

/**
 * Whether a plan would enlarge anything. Always false by construction; it is
 * asserted by the tests as an executable statement of the guarantee rather than
 * left as a comment nobody checks.
 */
export function planEnlargesAnything(plan: TierPlan): boolean {
  return plan.tiers.some((tier) => tier.width > plan.masterWidth);
}
