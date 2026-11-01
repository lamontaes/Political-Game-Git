// The one timeline: a life's dated records down a gold line, each a round
// icon on the line and a small card with its year and its sentence, paged by
// chapter of years, never a scroll (owner, Oct 29: a history is a "Vertical
// timeline", not lines of text on the panel). The person card's history is
// the first screen on it.
import { el } from "./dom.mjs";
import { pager } from "./pager.mjs";

// Kit 13 line art on a 24-unit grid, one per kind of record a history tells
// (the bank's moves in data/english/parts/person-history.json).
const ICONS = {
  born: [
    '<path d="M12 3.5l2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.5l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />',
  ],
  school: [
    '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z" />',
    '<path d="M6.5 11v4.6c1.6 1.4 3.4 2.1 5.5 2.1s3.9-.7 5.5-2.1V11M21.5 9v5.5" />',
  ],
  moved: [
    '<path d="M4 11.5L12 4.5l8 7M6.5 9.5V19.5h11V9.5" />',
    '<path d="M10 19.5v-5h4v5" />',
  ],
  partner: [
    '<circle cx="9" cy="13" r="5" />',
    '<circle cx="15" cy="13" r="5" />',
  ],
  child: [
    '<circle cx="12" cy="7.5" r="3" />',
    '<path d="M7 20c.4-4 2.2-6.2 5-6.2s4.6 2.2 5 6.2z" />',
  ],
  work: [
    '<rect x="3.5" y="7.5" width="17" height="12" rx="1.2" />',
    '<path d="M9 7.5V5.5h6v2M3.5 12.5h17" />',
  ],
  loss: [
    '<path d="M12 20.5v-9M12 11.5c-2.8 0-4.5-2-4.5-4.4 1.8 0 3.5.7 4.5 2.2 1-1.5 2.7-2.2 4.5-2.2 0 2.4-1.7 4.4-4.5 4.4z" />',
    '<path d="M8 20.5h8" />',
  ],
  office: [
    '<path d="M3.5 9.5L12 4.5l8.5 5zM5.5 9.5v8M9.8 9.5v8M14.2 9.5v8M18.5 9.5v8M3.5 19.5h17" />',
  ],
  tie: [
    '<circle cx="8" cy="8.5" r="2.8" />',
    '<circle cx="16" cy="8.5" r="2.8" />',
    '<path d="M3 19c.4-3.4 2.2-5.2 5-5.2s4.6 1.8 5 5.2M11 19c.4-3.4 2.2-5.2 5-5.2s4.6 1.8 5 5.2" />',
  ],
};

/** One record on the line: its icon, its year and its sentence. */
function entry({ year, text, kind, recordId }) {
  const icon = el("span", { className: "timeline-icon" });
  icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${(ICONS[kind] ?? ICONS.born).join("")}</svg>`;
  const node = el(
    "div",
    { className: `timeline-entry ${kind ?? ""}` },
    icon,
    el(
      "div",
      { className: "timeline-card" },
      el("span", { className: "timeline-when", textContent: year }),
      el("p", { className: "timeline-text", textContent: text }),
    ),
  );
  if (recordId) node.dataset.record = recordId;
  return node;
}

/**
 * `entries`: [{ year, text, kind, recordId }], oldest first. `rows` show on a
 * page; each page is a chapter named by its years ("1994 – 2008"), and the
 * arrows turn to the next. `words` = { previous, next } for the arrows.
 */
export function timeline({ entries, rows = 5, words }) {
  return pager({
    items: entries,
    render: entry,
    rows,
    columns: 1,
    rowHeight: 58,
    gap: 6,
    words: { ...words, page: "" },
    className: "timeline",
    where: (shown) => {
      const first = shown[0]?.year;
      const last = shown.at(-1)?.year;
      return first === last ? String(first ?? "") : `${first} – ${last}`;
    },
  });
}
