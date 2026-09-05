/**
 * Responsive raster tier selection.
 *
 * One logical asset identity owns an ordered ladder of raster tiers. This
 * module decides which tier a viewport and device pixel ratio require. It is
 * pure: no DOM, no timers, no network. The browser-facing half (decode before
 * swap) lives in `src/player/useRasterTier.ts` and drives the state machine
 * declared here.
 *
 * The pipeline never synthesizes a tier. A ladder contains exactly the rasters
 * that were authored or deterministically downscaled from a master, and a tier
 * that carries less real detail than its pixel dimensions claim must say so
 * through `nativeDetailWidth`.
 */

/** Ordered width ladder every production environment plate must supply. */
export const ENVIRONMENT_TIER_LADDER = [1024, 2048, 3072, 4096] as const;

/**
 * THE SUPPORTED FIDELITY ENVELOPE
 *
 * Political Game guarantees no-upscale fidelity wherever the required device
 * width is 4096 pixels or fewer. Above that the largest registered tier is used
 * and the runtime records a development warning. No asset is ever upscaled by
 * the asset pipeline; only the browser may upscale, only above this envelope,
 * and only from the top tier.
 *
 * The envelope is stated on REQUIRED DEVICE WIDTH rather than on display width,
 * and the difference is load-bearing. For a viewport at or wider than the
 * plate's own aspect the cover-fit camera paints the plate at roughly the
 * display width, so the two are interchangeable — which is where the familiar
 * "4096 physical pixels" sentence comes from. For a viewport TALLER than the
 * plate aspect, height governs the scale, the plate is painted wider than the
 * screen and the sides are cropped: a 1920x1200 window at DPR 2 is a 3840-wide
 * panel that nonetheless needs about 4297 device pixels of plate. Stating the
 * envelope on display width alone would quietly promise fidelity there that no
 * 4096 tier can deliver.
 */
export const FIDELITY_ENVELOPE_MAX_PHYSICAL_WIDTH = 4096;

/** Milliseconds a smaller tier must remain sufficient before stepping down. */
export const TIER_STEP_DOWN_DELAY_MS = 250;

/**
 * How a tier raster came to exist.
 *
 * - `native-master` — the authored raster itself.
 * - `deterministic-downscale` — a reproducible reduction of a larger master.
 *   Its pixel width IS its detail; that is what makes the reduction honest.
 * - `external-upscale-derivative` — a reduction of a master that was itself
 *   enlarged OUTSIDE this repository (a Firefly upscale, a retouch pass). The
 *   pixels are real and the tier is admissible in production, but the detail
 *   behind them stops at `nativeDetailWidth`, which it must declare. The
 *   repository pipeline still never enlarges anything: it only carries forward
 *   a lineage an approver knowingly accepted.
 * - `upscaled-development-fixture` — an enlargement performed for fixture art.
 *   It carries no detail beyond `nativeDetailWidth` and is only ever admissible
 *   for development fixture art, never for a production plate.
 */
export type RasterTierDerivation =
  | "native-master"
  | "deterministic-downscale"
  | "external-upscale-derivative"
  | "upscaled-development-fixture";

/**
 * The derivations whose pixel width overstates the detail behind it, and which
 * must therefore declare `nativeDetailWidth`. Every other derivation is
 * forbidden from declaring one, so `width` stays trustworthy by default.
 */
export const DERIVATIONS_REQUIRING_NATIVE_DETAIL: ReadonlySet<RasterTierDerivation> =
  new Set(["external-upscale-derivative", "upscaled-development-fixture"]);

/** Whether this derivation must state the real detail behind its pixels. */
export function requiresNativeDetailWidth(
  derivation: RasterTierDerivation,
): boolean {
  return DERIVATIONS_REQUIRING_NATIVE_DETAIL.has(derivation);
}

export interface RasterTier {
  /** Raster width in pixels. Unique and ascending within one ladder. */
  readonly width: number;
  readonly height: number;
  /** Repository-relative path of this tier's file. */
  readonly path: string;
  /** SHA-256 of the tier file. */
  readonly hash: string;
  readonly derivation: RasterTierDerivation;
  /**
   * Real detail carried by this raster, when it is less than `width`. A tier
   * with enlarged lineage declares the width the detail actually stops at;
   * every other derivation leaves this undefined and `width` is the truth.
   */
  readonly nativeDetailWidth?: number;
}

export interface RasterTierLadder {
  readonly assetId: string;
  /** Ascending by width. */
  readonly tiers: readonly RasterTier[];
}

export type RasterTierWarningCode =
  /** W7: no registered tier reaches the required device width. */
  | "raster-tier-under-resolved"
  /** The selected tier's real detail is below its declared pixel width. */
  | "raster-tier-detail-below-declared-width";

export interface RasterTierWarning {
  readonly code: RasterTierWarningCode;
  readonly assetId: string;
  /** Required device width divided by the detail actually available. */
  readonly shortfallRatio: number;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly devicePixelRatio: number;
  readonly selectedTierWidth: number;
  readonly requiredDeviceWidth: number;
  readonly message: string;
}

export interface RasterTierSelection {
  readonly assetId: string;
  readonly tier: RasterTier;
  /** paintedPlateCssWidth * devicePixelRatio, before rounding. */
  readonly requiredDeviceWidth: number;
  /** Detail available divided by detail required; >= 1 means no upscale. */
  readonly effectiveSourceCoverage: number;
  /** True when the chosen tier meets the requirement without browser upscale. */
  readonly sufficient: boolean;
  /** Development warnings; empty when the selection is sufficient. */
  readonly warnings: readonly RasterTierWarning[];
}

export interface RasterTierRequest {
  readonly paintedPlateCssWidth: number;
  readonly devicePixelRatio: number;
  /** Reported in warnings so a shortfall names the screen that caused it. */
  readonly viewport?: { readonly width: number; readonly height: number };
}

const UNKNOWN_VIEWPORT = { width: 0, height: 0 } as const;

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Detail this tier really carries, which an upscale reports honestly. */
export function tierDetailWidth(tier: RasterTier): number {
  return tier.nativeDetailWidth ?? tier.width;
}

/**
 * Builds a ladder, rejecting the shapes that would let an under-resolved or
 * synthesized raster reach the runtime.
 */
export function createRasterTierLadder(
  assetId: string,
  tiers: readonly RasterTier[],
): RasterTierLadder {
  if (tiers.length === 0) {
    throw new Error(`Raster tier ladder '${assetId}' declares no tiers.`);
  }
  const ordered = [...tiers].sort((a, b) => a.width - b.width);
  let previousWidth = 0;
  let previousAspect: number | null = null;
  for (const tier of ordered) {
    if (!isPositive(tier.width) || !isPositive(tier.height)) {
      throw new Error(
        `Raster tier ladder '${assetId}' declares a tier without positive dimensions.`,
      );
    }
    if (tier.width === previousWidth) {
      throw new Error(
        `Raster tier ladder '${assetId}' declares two tiers at width ${tier.width}.`,
      );
    }
    previousWidth = tier.width;
    const aspect = tier.width / tier.height;
    if (previousAspect !== null && Math.abs(aspect - previousAspect) > 0.005) {
      throw new Error(
        `Raster tier ladder '${assetId}' tier ${tier.width}x${tier.height} does not preserve the ladder's source aspect.`,
      );
    }
    previousAspect = aspect;
    if (
      tier.nativeDetailWidth !== undefined &&
      (!isPositive(tier.nativeDetailWidth) ||
        tier.nativeDetailWidth > tier.width)
    ) {
      throw new Error(
        `Raster tier ladder '${assetId}' tier ${tier.width} declares an impossible nativeDetailWidth ${tier.nativeDetailWidth}.`,
      );
    }
    if (
      requiresNativeDetailWidth(tier.derivation) &&
      tier.nativeDetailWidth === undefined
    ) {
      throw new Error(
        `Raster tier ladder '${assetId}' tier ${tier.width} carries enlarged lineage ('${tier.derivation}') and must declare the nativeDetailWidth behind it.`,
      );
    }
    if (
      !requiresNativeDetailWidth(tier.derivation) &&
      tier.nativeDetailWidth !== undefined
    ) {
      throw new Error(
        `Raster tier ladder '${assetId}' tier ${tier.width} declares nativeDetailWidth but its derivation '${tier.derivation}' claims full native detail.`,
      );
    }
  }
  return { assetId, tiers: ordered };
}

/**
 * The 10A selection rule, implemented exactly and with no safety multiplier.
 *
 *   requiredDeviceWidth = paintedPlateCssWidth * devicePixelRatio
 *   chosen = the smallest registered tier whose width >= requiredDeviceWidth
 *   if none qualifies, chosen = the largest registered tier and a development
 *   warning names the asset, shortfall ratio, viewport and DPR.
 */
export function selectRasterTier(
  ladder: RasterTierLadder,
  request: RasterTierRequest,
): RasterTierSelection {
  if (
    !isPositive(request.paintedPlateCssWidth) ||
    !isPositive(request.devicePixelRatio)
  ) {
    throw new Error(
      `Raster tier selection for '${ladder.assetId}' needs a positive painted width and device pixel ratio.`,
    );
  }
  const requiredDeviceWidth =
    request.paintedPlateCssWidth * request.devicePixelRatio;
  const viewport = request.viewport ?? UNKNOWN_VIEWPORT;
  const qualifying = ladder.tiers.find(
    (tier) => tier.width >= requiredDeviceWidth,
  );
  const tier = qualifying ?? ladder.tiers[ladder.tiers.length - 1]!;
  const detailWidth = tierDetailWidth(tier);
  const effectiveSourceCoverage = detailWidth / requiredDeviceWidth;
  const warnings: RasterTierWarning[] = [];

  if (!qualifying) {
    warnings.push({
      code: "raster-tier-under-resolved",
      assetId: ladder.assetId,
      shortfallRatio: requiredDeviceWidth / tier.width,
      viewport,
      devicePixelRatio: request.devicePixelRatio,
      selectedTierWidth: tier.width,
      requiredDeviceWidth,
      message:
        `Asset '${ladder.assetId}' has no tier at or above ${Math.ceil(requiredDeviceWidth)} device px; ` +
        `painting the largest tier (${tier.width}px) short by ${(requiredDeviceWidth / tier.width).toFixed(2)}x ` +
        `at viewport ${viewport.width}x${viewport.height} DPR ${request.devicePixelRatio}.`,
    });
  }
  if (detailWidth < tier.width && detailWidth < requiredDeviceWidth) {
    warnings.push({
      code: "raster-tier-detail-below-declared-width",
      assetId: ladder.assetId,
      shortfallRatio: requiredDeviceWidth / detailWidth,
      viewport,
      devicePixelRatio: request.devicePixelRatio,
      selectedTierWidth: tier.width,
      requiredDeviceWidth,
      message:
        `Asset '${ladder.assetId}' tier ${tier.width}px carries only ${detailWidth}px of real detail; ` +
        `${Math.ceil(requiredDeviceWidth)} device px were required ` +
        `at viewport ${viewport.width}x${viewport.height} DPR ${request.devicePixelRatio}.`,
    });
  }

  return {
    assetId: ladder.assetId,
    tier,
    requiredDeviceWidth,
    effectiveSourceCoverage,
    sufficient: effectiveSourceCoverage >= 1,
    warnings,
  };
}

/**
 * Whether a requirement is inside the declared fidelity envelope. Outside it,
 * browser upscale from the top tier is the documented behaviour rather than a
 * defect.
 *
 * Pass `selection.requiredDeviceWidth`, or `paintedPlateCssWidth * dpr`. See
 * the note on FIDELITY_ENVELOPE_MAX_PHYSICAL_WIDTH for why this is not the
 * same as the display's own pixel width on a viewport taller than the plate.
 */
export function withinFidelityEnvelope(requiredDeviceWidth: number): boolean {
  return requiredDeviceWidth <= FIDELITY_ENVELOPE_MAX_PHYSICAL_WIDTH;
}

/** The required device width for a painted plate at a device pixel ratio. */
export function requiredDeviceWidthFor(
  paintedPlateCssWidth: number,
  devicePixelRatio: number,
): number {
  return paintedPlateCssWidth * devicePixelRatio;
}

// ---------------------------------------------------------------------------
// Hysteresis
// ---------------------------------------------------------------------------

export interface TierHysteresisState {
  /** Tier width the runtime has settled on. */
  readonly committedWidth: number;
  /**
   * Timestamp at which a smaller sufficient tier was first observed, or null
   * while the committed tier is still the smallest sufficient one.
   */
  readonly stepDownSince: number | null;
}

export function createTierHysteresisState(
  committedWidth: number,
): TierHysteresisState {
  return { committedWidth, stepDownSince: null };
}

/**
 * Steps up to a larger tier immediately; steps down only after the smaller tier
 * has been sufficient continuously for `TIER_STEP_DOWN_DELAY_MS`, so dragging a
 * window edge does not thrash the network.
 *
 * Pure and time-injected: `now` is supplied by the caller, never read here.
 */
export function advanceTierHysteresis(
  state: TierHysteresisState,
  desiredWidth: number,
  now: number,
  delayMs = TIER_STEP_DOWN_DELAY_MS,
): TierHysteresisState {
  if (desiredWidth > state.committedWidth) {
    return { committedWidth: desiredWidth, stepDownSince: null };
  }
  if (desiredWidth === state.committedWidth) {
    return state.stepDownSince === null
      ? state
      : { committedWidth: state.committedWidth, stepDownSince: null };
  }
  const since = state.stepDownSince ?? now;
  if (now - since >= delayMs) {
    return { committedWidth: desiredWidth, stepDownSince: null };
  }
  return { committedWidth: state.committedWidth, stepDownSince: since };
}

// ---------------------------------------------------------------------------
// Decode-before-swap
// ---------------------------------------------------------------------------

/**
 * Which raster is on screen versus which one the runtime wants next. The scene
 * keeps painting `paintedWidth` until `requestedWidth` reports decoded, so a
 * resize never blanks the scene.
 */
export interface TierPaintState {
  readonly paintedWidth: number;
  readonly requestedWidth: number;
}

export function createTierPaintState(width: number): TierPaintState {
  return { paintedWidth: width, requestedWidth: width };
}

export function requestTierPaint(
  state: TierPaintState,
  requestedWidth: number,
): TierPaintState {
  return requestedWidth === state.requestedWidth
    ? state
    : { paintedWidth: state.paintedWidth, requestedWidth };
}

/**
 * Promotes a decoded raster to the painted one. A stale decode (a tier the
 * runtime has already moved past) is ignored rather than flashing backwards.
 */
export function commitDecodedTier(
  state: TierPaintState,
  decodedWidth: number,
): TierPaintState {
  if (decodedWidth !== state.requestedWidth) return state;
  return decodedWidth === state.paintedWidth
    ? state
    : { paintedWidth: decodedWidth, requestedWidth: state.requestedWidth };
}

export function isTierSwapPending(state: TierPaintState): boolean {
  return state.paintedWidth !== state.requestedWidth;
}
