/* global document */
// The element builder every shared part and screen uses: one place makes a node.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}
