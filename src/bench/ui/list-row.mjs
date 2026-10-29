// The one list row part. A row is a `.row` line in play.css: a label and its value, a
// record's line, a narrative paragraph. `variant` is the extra class that says which kind
// (`campaign`, `narrative`, `race`, `elect`, `map`). Screens call this and never write
// `el("div", { className: "row ..." })`.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { headshot } from "./headshot.mjs";

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

/** A person in a list: their round headshot (the same face the People map draws; an
 * empty ring until their figure is known, never initials: owner, Oct 28), the name as a
 * control that opens their card, then their office (text, or a term word the screen
 * drew so it underlines and explains itself) and party. */
export function personRow({ name, detail, party, face, onOpen }) {
  const picture = face ? headshot(face) : el("span", { className: "headshot" });
  picture.classList.add("person-row-face");
  const open = makeButton({
    className: "member-name",
    textContent: name,
  });
  if (onOpen) open.addEventListener("click", onOpen);
  const line = listRow("person-row", {}, picture, open);
  for (const note of [detail, party])
    if (note)
      line.append(
        typeof note === "string"
          ? el("span", { className: "person-row-note", textContent: note })
          : el("span", { className: "person-row-note" }, note),
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
