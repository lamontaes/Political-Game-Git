// A label on screen. When the whole label is a Guide term it is underlined until learned:
// hover shows its definition and a click opens the Guide there (the screen passes both).
import { el } from "./dom.mjs";

export function termWord({ text, isTerm, learned, onHover, onLeave, onOpen }) {
  if (!isTerm) return el("b", { textContent: text });
  const b = el("b", { className: learned ? "" : "term", textContent: text });
  b.addEventListener("mouseenter", () => {
    if (b.classList.contains("term")) onHover?.(b);
  });
  if (onLeave) b.addEventListener("mouseleave", onLeave);
  if (onOpen) b.addEventListener("click", onOpen);
  return b;
}
