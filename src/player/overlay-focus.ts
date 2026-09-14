/**
 * Overlay placement inside the actual content viewport.
 *
 * Safari chrome and the preview banner shrink usable height. Menus and the
 * conversation box are clamped into that rectangle rather than covered with
 * overflow:hidden.
 */

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export function contentViewportSize(
  view: Pick<VisualViewport, "width" | "height"> | null | undefined,
  windowSize: ViewportSize,
): ViewportSize {
  if (!view || view.width <= 0 || view.height <= 0) return windowSize;
  return { width: view.width, height: view.height };
}

/** Safari chrome shrinks the content rectangle inside the layout viewport. */
export function visualViewportInsets(
  view: Pick<VisualViewport, "height" | "offsetTop"> | null | undefined,
  layoutHeight: number,
): { readonly top: number; readonly bottom: number; readonly height: number } {
  if (!view || view.height <= 0) {
    return { top: 0, bottom: 0, height: layoutHeight };
  }
  const top = Math.max(0, view.offsetTop);
  const bottom = Math.max(0, layoutHeight - view.height - top);
  return { top, bottom, height: view.height };
}

export function firstEnabledControl(
  root: ParentNode | null,
): HTMLElement | null {
  if (!root) return null;
  const controls = root.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  for (const control of controls) {
    if (control.hasAttribute("disabled")) continue;
    if (control.getAttribute("aria-disabled") === "true") continue;
    if (control.tabIndex < 0) continue;
    return control;
  }
  return null;
}

export function clampOverlayBox(
  preferred: Box,
  viewport: ViewportSize,
  margin = 8,
): { readonly left: number; readonly top: number } {
  const width = Math.min(
    preferred.width,
    Math.max(0, viewport.width - margin * 2),
  );
  const height = Math.min(
    preferred.height,
    Math.max(0, viewport.height - margin * 2),
  );
  const maxLeft = Math.max(margin, viewport.width - width - margin);
  const maxTop = Math.max(margin, viewport.height - height - margin);
  return {
    left: Math.min(Math.max(preferred.left, margin), maxLeft),
    top: Math.min(Math.max(preferred.top, margin), maxTop),
  };
}

/** Place a menu beside its subject, preferring the right, then clamp. */
export function menuBesideAnchor(
  anchor: Box,
  menu: { readonly width: number; readonly height: number },
  viewport: ViewportSize,
  gap = 8,
): { readonly left: number; readonly top: number } {
  const rightLeft = anchor.left + anchor.width + gap;
  const fitsRight = rightLeft + menu.width <= viewport.width - 8;
  const preferred = fitsRight
    ? {
        left: rightLeft,
        top: anchor.top,
        width: menu.width,
        height: menu.height,
      }
    : {
        left: anchor.left - gap - menu.width,
        top: anchor.top,
        width: menu.width,
        height: menu.height,
      };
  return clampOverlayBox(preferred, viewport);
}

/** Bottom-centre conversation, kept above the resting cluster. */
export function conversationInViewport(
  box: { readonly width: number; readonly height: number },
  viewport: ViewportSize,
  reservedBottom = 72,
): { readonly left: number; readonly top: number } {
  const preferred: Box = {
    left: Math.round((viewport.width - box.width) / 2),
    top: viewport.height - reservedBottom - box.height,
    width: box.width,
    height: box.height,
  };
  return clampOverlayBox(preferred, viewport);
}
