/**
 * Keyboard overlay placement and return-focus, without timers or fake clicks.
 *
 * Menus and conversations mount, unmount, and sometimes portal. The invoker
 * is found by its stable test id on a still-mounted control. If that control
 * is gone, the shell cluster is the deliberate fallback — never the page body.
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

export function browsingSurfaceOpen(root: ParentNode = document): boolean {
  return Boolean(root.querySelector(".pg-workspace"));
}

export function invokerSelector(
  personId: string,
  prefer: "scene" | "panel" = "scene",
): readonly string[] {
  const scene = `[data-testid="scene-person-${personId}"]`;
  const panel = `[data-testid="life-talk-${personId}"]`;
  return prefer === "panel" ? [panel, scene] : [scene, panel];
}

export const FOCUS_FALLBACK_SELECTOR = '[data-testid="shell-nav-cluster"]';

export function findInvokerControl(
  personId: string,
  root: ParentNode = document,
  prefer: "scene" | "panel" = "scene",
): HTMLElement | null {
  for (const selector of invokerSelector(personId, prefer)) {
    const node = root.querySelector<HTMLElement>(selector);
    if (node && !node.hasAttribute("disabled")) return node;
  }
  return root.querySelector<HTMLElement>(FOCUS_FALLBACK_SELECTOR);
}

export function focusInvokerOrFallback(
  personId: string,
  root: ParentNode = document,
  prefer: "scene" | "panel" = "scene",
): HTMLElement | null {
  const node = findInvokerControl(personId, root, prefer);
  node?.focus();
  return node;
}
