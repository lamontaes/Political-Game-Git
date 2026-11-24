/* global document, window */
// The element builder every shared part and screen uses: one place makes a node.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

/**
 * The one UI scale above 1440x900: the game is drawn in a logical window and enlarged
 * to fill the real one (--ui-scale on the root, set by `fitUiScale`). Sizes that read the
 * window go through these, never window.innerWidth/innerHeight.
 */
export const uiScale = () =>
  Number.parseFloat(
    document.documentElement.style.getPropertyValue("--ui-scale"),
  ) || 1;
export const viewWidth = () => window.innerWidth / uiScale();
export const viewHeight = () => window.innerHeight / uiScale();
/** Sets the scale from the real window: 1 up to 1440x900, larger above it. */
export function fitUiScale() {
  const scale = Math.max(
    1,
    Math.min(window.innerWidth / 1440, window.innerHeight / 900),
  );
  document.documentElement.style.setProperty("--ui-scale", String(scale));
}
