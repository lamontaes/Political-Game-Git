// The one bust part (owner, Nov 10, 2026: "we need to start transitioning to
// the bust system"). A person on a menu is a few pictures stacked on one
// square canvas: head, top, facial hair, hair (src/bench/bust.ts picks them).
// Every piece is one file shared by everyone who wears it, so the browser
// fetches and decodes each once. Screens call `bustStack` only through the
// one face part (face.mjs); nothing else draws a person on a menu.
import { el } from "./dom.mjs";

/**
 * `bust` is a face record's bust: { layers: [url], head: [top, middle, width],
 * size }. Returns the square stack; the caller sizes and places it.
 */
export function bustStack(bust, alt = "") {
  const stack = el("div", { className: "bust-stack" });
  stack.setAttribute("role", "img");
  stack.setAttribute("aria-label", alt);
  // A person is shown whole or not yet: the stack stays clear until every
  // piece has arrived, so nobody is ever a head with no shoulders.
  stack.classList.add("loading");
  let waiting = bust.layers.length;
  const arrived = () => {
    waiting -= 1;
    if (waiting <= 0) stack.classList.remove("loading");
  };
  for (const src of bust.layers) {
    const piece = el("img", { src, alt: "", draggable: false });
    if (piece.complete) arrived();
    else {
      piece.addEventListener("load", arrived, { once: true });
      piece.addEventListener("error", arrived, { once: true });
    }
    stack.append(piece);
  }
  return stack;
}

/**
 * Where a stack sits in a frame so the head lands at a set place: the stack's
 * side, and its left and top, all as fractions of the frame's width. `share`
 * is the head's share of the frame's width, `middle` where the head's middle
 * sits across the frame, and `top` how far the head's top sits below the
 * frame's top.
 */
export function bustPlace(bust, { share, middle = 0.5, top = 0 }) {
  const [headTop, headMiddle, headWidth] = bust.head;
  const side = (share * bust.size) / headWidth;
  return {
    side,
    left: middle - (headMiddle / bust.size) * side,
    top: top - (headTop / bust.size) * side,
  };
}
