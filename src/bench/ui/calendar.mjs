/* global window, localStorage */
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
    holiday: "meeting",
  })[kind] ?? "meeting";

// The kinds a player keeps on a calendar, each with its own color (owner, Nov
// 1: "color code those things. Like town meetings and stuff. And be able to
// hide them if you want"); the key above the month names them and hides them.
const GROUPS = [
  { key: "birthday", kinds: ["birthday", "your-birthday"] },
  { key: "deadline", kinds: ["filing-opens", "filing-deadline"] },
  { key: "election", kinds: ["primary", "election"] },
  { key: "meeting", kinds: ["meeting"] },
  { key: "holiday", kinds: ["holiday"] },
];
const groupOf = (kind) =>
  GROUPS.find((group) => group.kinds.includes(kind))?.key ?? "meeting";
const HIDDEN_KEY = "ocd-calendar-hidden";
const savedHidden = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
};
const saveHidden = (hidden) => {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
  } catch {
    // The choice still holds for this screen.
  }
};

const DAY_MS = 86400000;
const daysBetween = (from, to) =>
  Math.round(
    (new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / DAY_MS,
  );

/** The calendar's node, for the sheet's body. */
export function calendarScreen({ date, items: every, labels, onAdvance }) {
  // The kinds the player has hidden stay hidden, and the key lists the kinds
  // the calendar has (never a key for a kind with nothing to show).
  const hidden = savedHidden();
  let items = every;
  let byDate = new Map();
  let ahead = [];
  const rebuild = () => {
    items = every.filter((item) => !hidden.has(groupOf(item.kind)));
    byDate = new Map();
    for (const item of items)
      byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
    // Coming up lists the player's own dates first, then everything else by date.
    ahead = items
      .filter((i) => i.date >= date)
      .toSorted(
        (a, b) => Number(b.own) - Number(a.own) || a.date.localeCompare(b.date),
      );
  };
  rebuild();
  // A day on the calendar says its year only when it is not this year's.
  const dayWords = (iso, options) => dateWords(iso, { ...options, year: date });
  const icon = (item) =>
    el("img", {
      src: `/ui/kit13/calendar-${dayIcon(item.kind)}.png`,
      alt: "",
      className: `day-icon kind-${groupOf(item.kind)}`,
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
            {
              className: `calendar-entry kind-${groupOf(item.kind)}${item.own ? " own" : ""}`,
            },
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
  const drawSide = () => {
    const rowOf = (item) => {
      const row = listRow(
        `calendar-entry kind-${groupOf(item.kind)}${item.own ? " own" : ""}`,
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
            ...[...new Set(entries.map((e) => groupOf(e.kind)))]
              .slice(0, 3)
              .map((group) =>
                el("img", {
                  src: `/ui/kit13/calendar-${dayIcon(GROUPS.find((g) => g.key === group).kinds[0])}.png`,
                  alt: "",
                  className: `day-icon kind-${group}`,
                }),
              ),
          ),
        );
      grid.append(cell);
    }
    monthBox.replaceChildren(header, grid);
  };
  const key = el("nav", {
    className: "calendar-key",
    "aria-label": labels.key,
  });
  const drawKey = () =>
    key.replaceChildren(
      ...GROUPS.filter((group) =>
        every.some((item) => group.kinds.includes(item.kind)),
      ).map((group) => {
        const shown = !hidden.has(group.key);
        const toggle = button(
          labels.kinds[group.key],
          () => {
            if (hidden.has(group.key)) hidden.delete(group.key);
            else hidden.add(group.key);
            saveHidden(hidden);
            rebuild();
            drawKey();
            drawMonth();
            drawDay();
            drawSide();
          },
          `key-kind kind-${group.key}${shown ? " on" : ""}`,
        );
        toggle.dataset.kind = group.key;
        toggle.setAttribute("aria-pressed", String(shown));
        toggle.title = shown ? labels.hide : labels.show;
        return toggle;
      }),
    );
  drawKey();
  drawMonth();
  drawDay();
  drawSide();
  root.append(key, monthBox, dayBox, side);
  return root;
}
