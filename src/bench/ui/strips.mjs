/* global Node */
// The approved strip screen (owner, Nov 7, 2026: You, the person card,
// Government, Budgets; docs/mocks/2026-11-07-approved/): a left column with
// the screen's name, the role line under it and a bust, and sections down the
// right, each a header strip of its own depth under a broken gold outline.
// Every screen of that look builds from these parts, never its own markup.
import { el } from "./dom.mjs";
import { picture } from "./picture.mjs";
import { rosterScreen } from "./roster-screen.mjs";
import { partyClass as partyClassOf } from "./map.mjs";
import { makeButton } from "./button.mjs";
import { face as drawFace } from "./face.mjs";

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
      drawFace(face, { shape: "bust", alt: name }),
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

/** Perk rows: the leaning's name, how strong it runs, and its line where it has one. */
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
        ...(row.line ? [el("p", { textContent: row.line })] : []),
      ),
    ),
  );
}

/** A paragraph set in the story face; `names` clickable inside it are the caller's own nodes. */
export function introText(...parts) {
  return el("p", { className: "intro" }, ...parts);
}

/**
 * A life's lines as paragraphs, in the order they were lived (Fable A, Nov 13,
 * rule 17: "A life is told in order everywhere it is told"): the card's lines
 * come oldest first, and a new paragraph starts where the kind of thing
 * changes (`groups`: the kinds that belong together), so related lines sit
 * together without ever moving a line out of its year.
 */
export function inOrderParagraphs(lines, groups) {
  const at = new Map(
    groups.flatMap((kinds, i) => kinds.map((kind) => [kind, i])),
  );
  const paragraphs = [];
  let last;
  for (const line of lines) {
    const group = at.get(line.kind) ?? groups.length;
    if (!paragraphs.length || group !== last) paragraphs.push([]);
    paragraphs.at(-1).push(line);
    last = group;
  }
  return paragraphs;
}

/**
 * A life told as sentences, never a list of dates: the card's lines (oldest
 * first, each with its kind and the record behind it) in the order they were
 * lived (`inOrderParagraphs`), each paragraph in the story face, each sentence
 * on its record.
 */
export function lifeStory(lines, groups, onOpen) {
  const paragraphs = inOrderParagraphs(lines, groups);
  return paragraphs
    .filter((rows) => rows.length)
    .map((rows) =>
      introText(
        ...rows.flatMap((row, i) => {
          const sentence = el("span", { textContent: row.text });
          sentence.dataset.record = row.recordId;
          // Dev mode only: the sentence opens its record in the one Trace box.
          if (onOpen && row.recordId) {
            const open = () => onOpen(row.recordId);
            sentence.classList.add("pick");
            sentence.tabIndex = 0;
            sentence.setAttribute("role", "button");
            sentence.addEventListener("click", open);
            sentence.addEventListener("keydown", (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                open();
              }
            });
          }
          return i ? [" ", sentence] : [sentence];
        }),
      ),
    );
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
 * capitals at the right of the tabs.
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
 * The patch notes screen on the one list-beside-detail part (`rosterScreen`): the builds
 * listed at the left, newest first, and the chosen build's notes in a strip per heading.
 * `builds`: [{ name, when, groups: [{ heading, notes: [text] }] }], newest first.
 */
export function patchNotesScreen({ builds, title }) {
  return rosterScreen({
    title,
    className: "patch-notes",
    groups: [
      {
        entries: builds.map((build, at) => ({
          key: String(at),
          label: build.name,
          aside: build.when,
          build,
        })),
      },
    ],
    render: ({ build }) =>
      build.groups.map((group, at) =>
        stripSection(
          Math.min(at + 2, 5),
          group.heading,
          ...group.notes.map((note) => introText(note)),
        ),
      ),
  });
}

/**
 * The journal as the Nov 8 play mock draws it (pl-journal), on the one list-beside-detail
 * part (`rosterScreen`): "My story" lists the chapters, each with its years, the newest
 * chosen; the chosen chapter is its title over two columns of prose with a drop cap.
 * `chapters`: [{ title, from, through, lines: [{ text }] }].
 */
export function journalScreen({ chapters, labels, yearOf }) {
  const yearsOf = (chapter) => {
    const from = yearOf(chapter.from);
    const through = yearOf(chapter.through);
    return from === through ? from : `${from} to ${through}`;
  };
  if (!chapters.length)
    return [
      stripSection(
        1,
        labels.title,
        el("p", { className: "intro", textContent: labels.empty }),
      ),
    ];
  return rosterScreen({
    title: labels.title,
    className: "journal",
    chosenKey: String(chapters.length - 1),
    groups: [
      {
        entries: chapters.map((chapter, at) => ({
          key: String(at),
          label: chapter.title,
          aside: yearsOf(chapter),
          chapter,
        })),
      },
    ],
    render: ({ chapter }) => [
      stripSection(
        2,
        chapter.title,
        // The picture of the place the chapter's lines happened in; none on record, no slot.
        ...(chapter.picture
          ? [
              picture({
                src: chapter.picture.url,
                className: "journal-picture",
              }),
            ]
          : []),
        // Two columns and a drop cap only where the words fill them: a short
        // chapter is one column and a one-line first paragraph has no drop cap.
        el(
          "div",
          {
            className: `journal-text${
              chapter.lines.reduce((n, l) => n + l.text.length, 0) <
              JOURNAL_TWO_COLUMNS
                ? " one-column"
                : ""
            }`,
          },
          ...chapter.lines.map((line, at) =>
            el("p", {
              className: `intro${at === 0 && line.text.length >= JOURNAL_DROP_CAP ? " lead" : ""}`,
              textContent: line.text,
            }),
          ),
        ),
      ),
    ],
  });
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
