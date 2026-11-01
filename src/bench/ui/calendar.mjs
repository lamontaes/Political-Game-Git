/* global window */
// The calendar, to its mock (MOCKS calendar.png): a compact month of day tiles with a small
// icon for each thing on the day, the chosen day on a plate of its own between, and Coming up
// beside it paged inside its box (owner, Oct 29: a menu never scrolls as a page). The screen
// hands it the day that is today, the dated items in words, the labels from the controls
// file, and what skipping forward to a day does.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { listRow } from "./list-row.mjs";
import { pager } from "./pager.mjs";
import { plate } from "./plate.mjs";
import { dateWords, monthWords } from "../../english/plain-words.mjs";

// The icon each kind of dated thing shows on its day.
const dayIcon = (kind) =>
  ({
    birthday: "birthday",
    "your-birthday": "birthday",
    "filing-opens": "deadline",
    "filing-deadline": "deadline",
    primary: "election",
    election: "election",
  })[kind] ?? "meeting";

const DAY_MS = 86400000;
const daysBetween = (from, to) =>
  Math.round(
    (new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / DAY_MS,
  );

/** The calendar's node, for the sheet's body. */
export function calendarScreen({ date, items, labels, onAdvance }) {
  const byDate = new Map();
  for (const item of items)
    byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  // A day on the calendar says its year only when it is not this year's.
  const dayWords = (iso, options) => dateWords(iso, { ...options, year: date });
  const icon = (item) =>
    el("img", {
      src: `/ui/kit13/calendar-${dayIcon(item.kind)}.png`,
      alt: "",
      className: "day-icon",
    });
  let month = new Date(`${date.slice(0, 7)}-01T12:00:00`);
  let selected = date;
  const root = el("div", { className: "calendar-layout" });
  const monthBox = el("section", { className: "calendar-month" });
  const dayBox = el("div", { className: "calendar-day" });
  const side = el("section", { className: "calendar-side" });
  const button = (label, fn, className) => {
    const b = makeButton({
      textContent: label,
      ...(className ? { className } : {}),
    });
    b.addEventListener("click", fn);
    return b;
  };
  const goTo = (iso) => {
    month = new Date(`${iso.slice(0, 7)}-01T12:00:00`);
    select(iso);
  };
  // How far off the chosen day is, in words from the controls file.
  const distance = (iso) => {
    const n = daysBetween(date, iso);
    if (n === 0) return labels.today;
    if (n === 1) return labels.tomorrow;
    return (n > 0 ? labels.daysAhead : labels.daysAgo).replace(
      "{n}",
      String(Math.abs(n)),
    );
  };
  // The chosen day on its plate: weekday, the date large, how far off it is, each thing on
  // it with its icon, and the jump to it.
  const drawDay = () => {
    const day = (byDate.get(selected) ?? []).toSorted(
      (a, b) => Number(b.own) - Number(a.own),
    );
    const weekday = new Date(`${selected}T12:00:00`).toLocaleDateString(
      "en-US",
      { weekday: "long" },
    );
    const lines = day.length
      ? day.map((item) =>
          el(
            "div",
            { className: `calendar-entry${item.own ? " own" : ""}` },
            icon(item),
            el("span", { className: "what", textContent: item.line }),
          ),
        )
      : [el("p", { className: "calendar-empty", textContent: labels.nothing })];
    dayBox.replaceChildren(
      plate(
        null,
        el("span", { className: "label", textContent: weekday }),
        el("h3", { textContent: dayWords(selected) }),
        el("p", {
          className: "calendar-distance",
          textContent: distance(selected),
        }),
        el("div", { className: "calendar-day-list" }, ...lines),
        ...(selected > date
          ? [
              button(
                labels.advance,
                () => onAdvance(selected),
                "action go-to-day",
              ),
            ]
          : []),
      ),
    );
  };
  // Coming up lists the player's own dates first, then everything else by date.
  const ahead = items
    .filter((i) => i.date >= date)
    .toSorted(
      (a, b) => Number(b.own) - Number(a.own) || a.date.localeCompare(b.date),
    );
  const drawSide = () => {
    const rowOf = (item) => {
      const row = listRow(
        `calendar-entry${item.own ? " own" : ""}`,
        { as: "button", type: "button" },
        el("span", {
          className: "when",
          textContent: dayWords(item.date, { month: "short" }),
        }),
        icon(item),
        el("span", { className: "what", textContent: item.line }),
      );
      row.addEventListener("click", () => goTo(item.date));
      return row;
    };
    side.replaceChildren(
      el("h3", {
        className: "calendar-side-head",
        textContent: labels.upcoming,
      }),
      pager({
        items: ahead,
        render: rowOf,
        rows: Math.max(
          4,
          Math.min(12, Math.floor((window.innerHeight - 260) / 56)),
        ),
        columns: 1,
        rowHeight: 52,
        gap: 4,
        words: {
          page: labels.page,
          previous: labels.previousPage,
          next: labels.nextPage,
        },
        className: "calendar-pager",
      }),
    );
  };
  const select = (iso) => {
    selected = iso;
    drawMonth();
    drawDay();
  };
  const drawMonth = () => {
    const move = (delta) => {
      month = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
      drawMonth();
    };
    const step = (label, mark, fn) => {
      const b = button(mark, fn, "month-step");
      b.setAttribute("aria-label", label);
      b.title = label;
      return b;
    };
    const header = el(
      "nav",
      { className: "calendar-heading" },
      step(labels.previousMonth, "‹", () => move(-1)),
      el("h3", {
        textContent: monthWords(
          `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
        ),
      }),
      step(labels.nextMonth, "›", () => move(1)),
      button(labels.today, () => goTo(date), "month-step today-step"),
    );
    const grid = el("div", { className: "month" });
    for (const weekday of labels.weekdays)
      grid.append(el("span", { className: "weekday", textContent: weekday }));
    for (let i = 0; i < month.getDay(); i++)
      grid.append(el("span", { className: "blank" }));
    const days = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    for (let day = 1; day <= days; day++) {
      const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entries = (byDate.get(iso) ?? []).toSorted(
        (a, b) => Number(b.own) - Number(a.own),
      );
      const cell = button("", () => select(iso));
      cell.className = `day${iso === date ? " today" : ""}${iso === selected ? " selected" : ""}${iso < date ? " past" : ""}${entries.some((e) => e.own) ? " own" : ""}`;
      cell.dataset.date = iso;
      cell.setAttribute(
        "aria-label",
        [dayWords(iso), ...entries.map((e) => e.line)].join(". "),
      );
      cell.setAttribute("aria-pressed", String(iso === selected));
      if (iso === date) cell.setAttribute("aria-current", "date");
      cell.append(el("span", { className: "num", textContent: String(day) }));
      // Each kind of thing on the day is a small icon; its words are on the day's plate.
      if (entries.length)
        cell.append(
          el(
            "span",
            { className: "marks" },
            ...[...new Set(entries.map((e) => dayIcon(e.kind)))]
              .slice(0, 3)
              .map((name) =>
                el("img", {
                  src: `/ui/kit13/calendar-${name}.png`,
                  alt: "",
                  className: "day-icon",
                }),
              ),
          ),
        );
      grid.append(cell);
    }
    monthBox.replaceChildren(header, grid);
  };
  drawMonth();
  drawDay();
  drawSide();
  root.append(monthBox, dayBox, side);
  return root;
}
