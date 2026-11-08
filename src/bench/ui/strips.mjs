// The approved strip screen (owner, Nov 7, 2026: You, the person card,
// Government, Budgets; docs/mocks/2026-11-07-approved/): a left column with
// the screen's name, the role line under it and a bust, and sections down the
// right, each a header strip of its own depth under a broken gold outline.
// Every screen of that look builds from these parts, never its own markup.
import { el } from "./dom.mjs";

/**
 * A section: its header strip (`depth` 1 to 5 sets how deep the strip's
 * bronze runs, lit first and deeper down the screen) over `nodes`.
 */
export function stripSection(depth, title, ...nodes) {
  return el(
    "section",
    { className: `sec strips dp${depth}` },
    el("h3", { className: "sechead", textContent: title }),
    el("div", { className: "secbody" }, ...nodes),
  );
}

/** The bust's size: the head fills this share of the column, and the crop ends this far below the head's top. */
const HEAD_PX = 190;
const BUST_BELOW_HEAD = 1.65;
const COLUMN_PX = 320;

/**
 * A bust from a pack figure: head to upper chest, ending in a soft fade. `face`
 * is the card's face record (the figure's url and size, and its head
 * [top, middle, width] in the figure's pixels).
 */
export function bust(face, alt) {
  if (!face) return el("div", { className: "mxglow" });
  const [top, middle, width] = face.head;
  const k = HEAD_PX / width;
  const image = el("img", { src: face.url, alt });
  Object.assign(image.style, {
    height: `${Math.round(face.height * k)}px`,
    left: `${Math.round(COLUMN_PX / 2 - middle * k)}px`,
    top: `${Math.round(12 - top * k)}px`,
  });
  const frame = el("div", { className: "mxbust" }, image);
  frame.style.height = `${Math.round(12 + BUST_BELOW_HEAD * HEAD_PX)}px`;
  return el("div", { className: "mxglow" }, frame);
}

/**
 * The strip screen: `name` and `role` over a `bust` at the left, `columns`
 * (an array of arrays of sections) beside it.
 */
export function stripScreen({ name, role, face, columns }) {
  return el(
    "div",
    { className: "strip-screen mx3 strips ol-g glow-on" },
    el(
      "div",
      { className: "mx3left" },
      el(
        "div",
        { className: "mxbanner" },
        el("h2", { className: "strip-name", textContent: name }),
        ...(role
          ? [el("p", { className: "strip-role", textContent: role })]
          : []),
      ),
      bust(face, name),
    ),
    el(
      "div",
      { className: "mx3main" },
      el(
        "div",
        { className: `mx3cols${columns.length === 1 ? " one" : ""}` },
        ...columns.map((sections) =>
          el("div", { className: "mx3col" }, ...sections),
        ),
      ),
    ),
  );
}

/** Perk rows: the leaning's name, how strong it runs, and its line in the first person. */
export function perkList(rows) {
  return el(
    "div",
    { className: "perks" },
    ...rows.map((row) =>
      el(
        "div",
        { className: "perk" },
        el(
          "div",
          { className: "perkname" },
          el("b", { textContent: row.name }),
          ...(row.strength ? [el("span", { textContent: row.strength })] : []),
        ),
        el("p", { textContent: row.line }),
      ),
    ),
  );
}

/** A paragraph set in the story face; `names` clickable inside it are the caller's own nodes. */
export function introText(...parts) {
  return el("p", { className: "intro" }, ...parts);
}

/** A name that opens its card: bold gold in the sentence, a button for keyboard and screen reader. */
export function nameLink(text, onOpen) {
  const node = el("span", { className: "nm pick", textContent: text });
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.addEventListener("click", onOpen);
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  });
  return node;
}

/** The people you're closest to as one line: each name opens its card, its relation in lower case after it. Null with nobody. */
export function peopleSentence(people) {
  if (!people.length) return null;
  const line = el("p", { className: "hispeople" });
  people.forEach((person, at) => {
    if (at) line.append(", ");
    line.append(nameLink(person.name, person.onOpen));
    if (person.relation) line.append(` (${person.relation.toLowerCase()})`);
  });
  return line;
}

/** Typed rows with a dot leader from the label to the figure: `rows` are { label, value }. */
export function dotRows(rows) {
  return el(
    "div",
    { className: "dotrows" },
    ...rows.map((row) =>
      el(
        "div",
        { className: "dotrow" },
        el("span", { className: "dotlabel", textContent: row.label }),
        el("span", { className: "dotleader" }),
        el("span", { className: "dotvalue", textContent: row.value }),
      ),
    ),
  );
}

/**
 * The budget board: a row of tabs and a fiscal-year line over three columns of
 * strip sections (the approved Budgets screen, bud-strips). `fiscal` is typed in
 * Courier Prime capitals at the right of the tabs.
 */
export function stripBoard({ tabs, fiscal, columns }) {
  return el(
    "div",
    { className: "strip-screen strip-board strips ol-g" },
    el(
      "div",
      { className: "board-top" },
      tabs,
      ...(fiscal
        ? [el("span", { className: "bfy", textContent: fiscal })]
        : []),
    ),
    el(
      "div",
      { className: "board-cols" },
      ...columns.map((sections) =>
        el("div", { className: "mx3col" }, ...sections),
      ),
    ),
  );
}

/** One typed row with a leader and, under it, a smaller line: the money rows of a budget page. */
export function typedRow(label, value, note) {
  return el(
    "div",
    { className: "dl" },
    el(
      "div",
      { className: "dotrow typed" },
      el("span", { className: "dotlabel", textContent: label }),
      el("span", { className: "dotleader" }),
      el("span", { className: "dotvalue", textContent: value }),
    ),
    ...(note ? [el("p", { className: "bmsub", textContent: note })] : []),
  );
}

/** A department in the list: its name and amount, and who heads it when the record says. */
export function departmentRow({ name, amount, head, selected, onSelect }) {
  const row = el(
    "div",
    { className: `bsdept pick${selected ? " sel" : ""}` },
    el("b", { textContent: name }),
    el("em", { textContent: amount }),
    ...(head ? [el("span", { textContent: head })] : []),
  );
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  row.addEventListener("click", onSelect);
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  });
  return row;
}

/** The list the department rows sit in. */
export function departmentList(...rows) {
  return el("div", { className: "bsdepts" }, ...rows);
}
