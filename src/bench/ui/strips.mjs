// The approved strip screen (owner, Nov 7, 2026: You, the person card,
// Government, Budgets; docs/mocks/2026-11-07-approved/): a left column with
// the screen's name, the role line under it and a bust, and sections down the
// right, each a header strip of its own depth under a broken gold outline.
// Every screen of that look builds from these parts, never its own markup.
import { el } from "./dom.mjs";
import { pager } from "./pager.mjs";
import { partyClass as partyClassOf } from "./map.mjs";
import { makeButton } from "./button.mjs";

/** Characters a chapter needs to run in two columns, and a first paragraph to take a drop cap (layout, not game rules). */
const JOURNAL_TWO_COLUMNS = 700;
const JOURNAL_DROP_CAP = 120;

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
export function bust(face, alt, column = COLUMN_PX) {
  if (!face) return el("div", { className: "mxglow" });
  const [top, middle, width] = face.head;
  const scale = column / COLUMN_PX;
  const k = (HEAD_PX * scale) / width;
  const image = el("img", { src: face.url, alt });
  Object.assign(image.style, {
    height: `${Math.round(face.height * k)}px`,
    left: `${Math.round(column / 2 - middle * k)}px`,
    top: `${Math.round(12 * scale - top * k)}px`,
  });
  const frame = el("div", { className: "mxbust" }, image);
  frame.style.height = `${Math.round(12 * scale + BUST_BELOW_HEAD * HEAD_PX * scale)}px`;
  frame.style.width = `${column}px`;
  const glow = el("div", { className: "mxglow" }, frame);
  glow.style.width = `${column}px`;
  return glow;
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
    line.append(
      person.onOpen
        ? nameLink(person.name, person.onOpen)
        : el("span", { className: "nm", textContent: person.name }),
    );
    if (person.relation) line.append(` (${person.relation.toLowerCase()})`);
  });
  return line;
}

/** Typed rows with a dot leader from the label to the figure: `rows` are { label, value }; a value may be a node (a name that opens its card). */
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
        row.value instanceof Node
          ? el("span", { className: "dotvalue" }, row.value)
          : el("span", { className: "dotvalue", textContent: row.value }),
      ),
    ),
  );
}

/**
 * The budget board: a row of tabs and a fiscal-year line over three columns of
 * strip sections (the approved Budgets screen, bud-strips). `fiscal` is typed in
 * Courier Prime capitals at the right of the tabs.
 */
export function stripBoard({ tabs, fiscal, columns, className = "" }) {
  return el(
    "div",
    { className: `strip-screen strip-board strips ol-g ${className}` },
    el(
      "div",
      { className: "board-top" },
      ...(tabs ? [tabs] : []),
      ...(fiscal
        ? [el("span", { className: "bfy", textContent: fiscal })]
        : []),
    ),
    el(
      "div",
      { className: `board-cols${columns.length === 2 ? " two" : ""}` },
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

/**
 * A leader: a bust at the left, the name big beside it, the party and post under
 * it, then a line (the mock's mayor and governor). `onOpen` opens their card.
 */
export function leaderBlock({ face, name, party, post, line, onOpen }) {
  const nameNode = nameLink(name, onOpen);
  nameNode.className = "leader-name pick";
  return el(
    "div",
    { className: "leader" },
    bust(face, name, 200),
    el(
      "div",
      { className: "leader-text" },
      nameNode,
      el(
        "p",
        { className: "leader-post" },
        ...(party
          ? [
              el("span", { className: "leader-party", textContent: party }),
              " · ",
            ]
          : []),
        post,
      ),
      ...(line ? [el("p", { className: "intro", textContent: line })] : []),
    ),
  );
}

/** Seats as big numbers, each in its party's color: `parts` are { party, seats, label }. */
export function seatNumbers(parts, vacant) {
  return el(
    "div",
    { className: "seat-numbers" },
    ...parts.map((part) =>
      el(
        "div",
        { className: `seat-number ${partyClassOf(part.party)}` },
        el("b", { textContent: String(part.seats) }),
        el("span", { textContent: part.label }),
      ),
    ),
    ...(vacant
      ? [
          el(
            "div",
            { className: "seat-number party-none" },
            el("b", { textContent: String(vacant.count) }),
            el("span", { textContent: vacant.label }),
          ),
        ]
      : []),
  );
}

/** Roll calls in type: the title, the result and the count, the date under it; a row with `onOpen` opens its bill. */
export function voteRows(rows) {
  return el(
    "div",
    { className: "vote-rows" },
    ...rows.map((row) => {
      const node = typedRow(row.title, row.result, row.when);
      if (!row.onOpen) return node;
      // A row with a paper behind it opens it: a button for the pointer and the keyboard.
      node.classList.add("pick");
      node.tabIndex = 0;
      node.setAttribute("role", "button");
      node.addEventListener("click", row.onOpen);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          row.onOpen();
        }
      });
      return node;
    }),
  );
}

/** A saved life as a strip: its name over a bust, the game's date and the Load button. */
export function savedLifeRow({ name, face, date, load }) {
  return el(
    "div",
    { className: "strip-screen strip-wrap strips ol-g saves-row" },
    stripSection(
      1,
      name,
      bust(face, name, 300),
      el("p", { className: "save-date", textContent: date }),
      el("div", { className: "acts" }, load),
    ),
  );
}

/** One setting: its small-capitals label over its toggle. */
export function settingRow(label, control) {
  return el(
    "div",
    { className: "setting" },
    el("span", { className: "setting-label", textContent: label }),
    control,
  );
}

/** The options board: columns of strips, each { title, rows } with its controls in order. */
export function optionsBoard({ columns }) {
  return stripBoard({
    columns: columns.map((sections, column) =>
      sections.map((section, at) =>
        stripSection(
          Math.min(column + at + 1, 5),
          section.title,
          ...section.rows,
        ),
      ),
    ),
  });
}

/** The Quit to title button, alone on its row. */
export function quitButton(label, onQuit) {
  const button = makeButton({ className: "action", textContent: label });
  button.dataset.testid = "quit-to-title";
  button.addEventListener("click", onQuit);
  return el("div", { className: "acts" }, button);
}

/**
 * The patch notes screen: the builds in one strip, the chosen build's notes in a strip per
 * heading. `builds`: [{ name, when, groups: [{ heading, notes: [text] }] }], newest first.
 */
export function patchNotesScreen({ builds, title, rows }) {
  const holder = el("div");
  let chosen = builds[0];
  const draw = () =>
    holder.replaceChildren(
      stripBoard({
        columns: [
          [
            stripSection(
              1,
              title,
              pager({
                items: builds.map((build) =>
                  departmentRow({
                    name: build.name,
                    amount: build.when,
                    selected: build === chosen,
                    onSelect: () => {
                      chosen = build;
                      draw();
                    },
                  }),
                ),
                render: (node) => node,
                rows,
                columns: 1,
                rowHeight: 52,
                gap: 2,
                className: "bsdepts",
              }),
            ),
          ],
          [
            // A build's notes run long: they scroll inside their own box, never the sheet.
            el(
              "div",
              { className: "patch-detail" },
              ...(chosen?.groups ?? []).map((group, at) =>
                stripSection(
                  Math.min(at + 2, 5),
                  group.heading,
                  ...group.notes.map((note) => introText(note)),
                ),
              ),
            ),
          ],
        ],
      }),
    );
  draw();
  return holder;
}

/**
 * The journal as the Nov 8 play mock draws it (pl-journal): "My story" lists the chapters,
 * newest last and chosen, each with its years; the chosen chapter is its title over two
 * columns of prose with a drop cap. `chapters`: [{ title, from, through, lines: [{ text }] }].
 */
export function journalScreen({ chapters, labels, yearOf, rows }) {
  const holder = el("div");
  let chosen = chapters.at(-1);
  const yearsOf = (chapter) => {
    const from = yearOf(chapter.from);
    const through = yearOf(chapter.through);
    return from === through ? from : `${from} to ${through}`;
  };
  const draw = () =>
    holder.replaceChildren(
      stripBoard({
        columns: [
          [
            stripSection(
              1,
              labels.title,
              chapters.length
                ? pager({
                    items: chapters.map((chapter) =>
                      departmentRow({
                        name: chapter.title,
                        amount: yearsOf(chapter),
                        selected: chapter === chosen,
                        onSelect: () => {
                          chosen = chapter;
                          draw();
                        },
                      }),
                    ),
                    render: (node) => node,
                    rows,
                    columns: 1,
                    rowHeight: 52,
                    gap: 2,
                    className: "bsdepts",
                  })
                : el("p", { className: "intro", textContent: labels.empty }),
            ),
          ],
          chosen
            ? [
                stripSection(
                  2,
                  chosen.title,
                  // Two columns and a drop cap only where the words fill them: a short
                  // chapter is one column and a one-line first paragraph has no drop cap.
                  el(
                    "div",
                    {
                      className: `journal-text${
                        chosen.lines.reduce((n, l) => n + l.text.length, 0) <
                        JOURNAL_TWO_COLUMNS
                          ? " one-column"
                          : ""
                      }`,
                    },
                    ...chosen.lines.map((line, at) =>
                      el("p", {
                        className: `intro${at === 0 && line.text.length >= JOURNAL_DROP_CAP ? " lead" : ""}`,
                        textContent: line.text,
                      }),
                    ),
                  ),
                ),
              ]
            : [],
        ],
      }),
    );
  draw();
  return holder;
}

/**
 * The money board: columns of strips, each { title, figure?, rows: [{ label, value }] }, the
 * rows typed with dot leaders and the figure, when there is one, in large type above them.
 */
export function moneyBoard({ columns }) {
  return stripBoard({
    columns: columns.map((sections, column) =>
      sections.map((section, at) =>
        stripSection(
          Math.min(column + at + 1, 5),
          section.title,
          ...(section.figure
            ? [
                el("p", {
                  className: "money-figure",
                  textContent: section.figure,
                }),
              ]
            : []),
          dotRows(section.rows),
        ),
      ),
    ),
  });
}

/** The campaign board's raised figure, big. */
export const moneyFigure = (text) =>
  el("p", { className: "money-figure", textContent: text });

/** On my desk: a list of papers, one paper a block, its title bold. */
export const deskList = (...nodes) =>
  el("div", { className: "desk" }, ...nodes);
export const deskBill = (...nodes) =>
  el("div", { className: "desk-bill" }, ...nodes);
export const deskTitle = (text) => el("b", { textContent: text });

/** A race, party or law page: its title (with a date or other small word after it) over its columns. */
export const rosterTitle = (text, small) =>
  el(
    "h2",
    { className: "roster-title" },
    text,
    ...(small ? [el("span", { textContent: small })] : []),
  );
export const rosterCols = (...nodes) =>
  el("div", { className: "roster-cols" }, ...nodes);
export const rosterSide = (...nodes) =>
  el("div", { className: "roster-side" }, ...nodes);
export const candidate = (...nodes) =>
  el("div", { className: "candidate" }, ...nodes);
