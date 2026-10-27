// The one list row part. A row is a `.row` line in play.css: a label and its value, a
// record's line, a narrative paragraph. `variant` is the extra class that says which kind
// (`campaign`, `narrative`, `race`, `elect`, `map`). Screens call this and never write
// `el("div", { className: "row ..." })`.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

export function listRow(variant, props = {}, ...children) {
  const { as = "div", ...rest } = props;
  return el(
    as,
    { ...rest, className: variant ? `row ${variant}` : "row" },
    ...children,
  );
}

/** A person in a list: a face (initials until the figure's headshot is known), the name
 * as a control that opens their card, then their office and party. */
export function personRow({ name, detail, party, portraitUrl, onOpen }) {
  const face = portraitUrl
    ? el("img", { className: "person-row-face", src: portraitUrl, alt: "" })
    : el("span", {
        className: "person-row-face people-initial",
        textContent: name
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join(""),
      });
  face.addEventListener?.("error", () => face.remove(), { once: true });
  const open = makeButton({
    className: "member-name",
    textContent: name,
  });
  if (onOpen) open.addEventListener("click", onOpen);
  const line = listRow("person-row", {}, face, open);
  for (const text of [detail, party])
    if (text)
      line.append(
        el("span", { className: "person-row-note", textContent: text }),
      );
  return line;
}
