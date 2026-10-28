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

/** One labeled line: the label (a term word) and its value; a value the screen could not
 * word (null) hides the line, so nothing half-printed shows. */
export function factRow(label, value) {
  const line = listRow(
    "",
    {},
    label,
    el("span", { className: "record-value", textContent: value ?? "" }),
  );
  if (value === null) line.hidden = true;
  return line;
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

/** A short note in a list in the label style (nothing found, nothing yet). */
export function noteLine(text) {
  return el("p", { className: "label", textContent: text });
}

/**
 * A row with what follows its name: short notes on the same line ({ text, className?,
 * data? }, the person-row note style by default) and full-width lines under it ({ variant,
 * text, data? }: who won the seat, your race for it). `data` is kept for the browser
 * checks, never shown. Empty notes are left out.
 */
export function withNotes(line, notes = [], lines = []) {
  for (const note of notes.filter((n) => n?.text)) {
    const span = el("span", {
      className: note.className ?? "person-row-note",
      textContent: note.text,
    });
    Object.assign(span.dataset, note.data ?? {});
    line.append(span);
  }
  for (const sub of lines.filter(Boolean)) {
    const row = listRow(sub.variant, { textContent: sub.text });
    Object.assign(row.dataset, sub.data ?? {});
    line.append(row);
  }
  return line;
}
