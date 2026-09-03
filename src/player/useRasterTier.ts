import { useEffect, useMemo, useRef, useState } from "react";

import {
  advanceTierHysteresis,
  commitDecodedTier,
  createTierHysteresisState,
  createTierPaintState,
  requestTierPaint,
  selectRasterTier,
  TIER_STEP_DOWN_DELAY_MS,
  type RasterTierLadder,
  type RasterTierSelection,
} from "../presentation/raster-tiers";

/**
 * Browser half of the raster tier system.
 *
 * The arithmetic lives in `raster-tiers.ts` and is pure; this hook only supplies
 * time, decoding and a timer. It steps up immediately, waits out the step-down
 * delay before dropping to a smaller tier, and keeps the currently decoded
 * raster on screen until its replacement has decoded — so resizing a window
 * never blanks the scene.
 */

export interface RasterTierPaint {
  /** The tier the runtime wants, with its selection warnings. */
  readonly selection: RasterTierSelection | null;
  /** The URL to paint right now, which may still be the previous tier. */
  readonly paintedUrl: string | null;
  readonly paintedWidth: number | null;
  /** True while a larger or smaller raster is decoding behind the scenes. */
  readonly swapPending: boolean;
}

export function useRasterTier(
  ladder: RasterTierLadder | null,
  tierUrls: ReadonlyMap<number, string> | null,
  paintedPlateCssWidth: number,
  devicePixelRatio: number,
  viewport: { readonly width: number; readonly height: number },
): RasterTierPaint {
  const desired = useMemo(() => {
    if (!ladder || paintedPlateCssWidth <= 0 || devicePixelRatio <= 0) {
      return null;
    }
    return selectRasterTier(ladder, {
      paintedPlateCssWidth,
      devicePixelRatio,
      viewport,
    });
  }, [ladder, paintedPlateCssWidth, devicePixelRatio, viewport]);

  const initialWidth = desired?.tier.width ?? ladder?.tiers[0]?.width ?? 0;
  const hysteresis = useRef(createTierHysteresisState(initialWidth));
  const [committedWidth, setCommittedWidth] = useState(initialWidth);
  const [paint, setPaint] = useState(() => createTierPaintState(initialWidth));

  useEffect(() => {
    if (!desired) return;
    const apply = (now: number) => {
      hysteresis.current = advanceTierHysteresis(
        hysteresis.current,
        desired.tier.width,
        now,
      );
      setCommittedWidth(hysteresis.current.committedWidth);
    };
    apply(Date.now());
    if (hysteresis.current.committedWidth === desired.tier.width) return;
    // A step down is pending: re-evaluate once the delay has elapsed.
    const timer = setTimeout(
      () => apply(Date.now()),
      TIER_STEP_DOWN_DELAY_MS + 1,
    );
    return () => clearTimeout(timer);
  }, [desired]);

  useEffect(() => {
    if (committedWidth <= 0) return;
    setPaint((current) => requestTierPaint(current, committedWidth));

    const url = tierUrls?.get(committedWidth);
    if (!url) return;
    let cancelled = false;
    const image = new Image();
    const settle = () => {
      if (cancelled) return;
      setPaint((current) => commitDecodedTier(current, committedWidth));
    };
    image.onload = settle;
    // A failed decode must not blank the scene: keep painting what is up.
    image.onerror = () => {};
    image.src = url;
    if (image.complete) settle();
    return () => {
      cancelled = true;
    };
  }, [committedWidth, tierUrls]);

  const paintedUrl = tierUrls?.get(paint.paintedWidth) ?? null;

  return {
    selection: desired,
    paintedUrl,
    paintedWidth: paintedUrl ? paint.paintedWidth : null,
    swapPending: paint.paintedWidth !== paint.requestedWidth,
  };
}
