/* global document */
// The calendar: the menu type of the month grid with each thing on its day (an icon and
// its line) and the list beside it, coming up first or the chosen day's (principles 7
// and 8). The screen hands it the day that is today, the dated items in words, the
// labels from the controls file, and what skipping forward to a day does.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { listRow } from "./list-row.mjs";
import { menuPages } from "./pager.mjs";
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
  const side = el("section", { className: "calendar-side" });
  const button = (label, fn, className) => {
    const b = makeButton({
      textContent: label,
      ...(className ? { className } : {}),
    });
    b.addEventListener("click", fn);
    return b;
  };
  // Skip-forward icon, no label text: the control's name is its aria-label.
  const skipForward = (name, fn) => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    for (const d of ["M5 5l9 7-9 7z", "M14 5l9 7-9 7z"]) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      svg.append(path);
    }
    const b = makeButton({ className: "skip-forward" });
    b.setAttribute("aria-label", name);
    b.title = name;
    b.append(svg);
    b.addEventListener("click", fn);
    return b;
  };
  const goTo = (iso) => {
    month = new Date(`${iso.slice(0, 7)}-01T12:00:00`);
    select(iso);
  };
  // One line per thing: its day, its icon and who and what in words. The
  // player's own races carry the gold mark.
  const entryRow = (item, withDate) => {
    const row = listRow(
      `calendar-entry${item.own ? " own" : ""}`,
      { as: "button", type: "button" },
      ...(withDate
        ? [
            el("span", {
              className: "when",
              textContent: dayWords(item.date, { month: "short" }),
            }),
          ]
        : []),
      icon(item),
      el("span", { className: "what", textContent: item.line }),
    );
    row.addEventListener("click", () => goTo(item.date));
    return row;
  };
  // Coming up lists the player's own dates first, then everything else by
  // date; a chosen day lists that day. The list fills the side and pages.
  const PAGE = 10;
  const ahead = items
    .filter((i) => i.date >= date)
    .toSorted(
      (a, b) => Number(b.own) - Number(a.own) || a.date.localeCompare(b.date),
    );
  const drawSide = () => {
    // A chosen day heads the side: its own lines, then what follows it.
    const day = selected !== date ? (byDate.get(selected) ?? []) : null;
    const rows = day
      ? [...day, ...items.filter((i) => i.date > selected && i.date >= date)]
      : ahead;
    const head = el(
      "div",
      { className: "calendar-side-head" },
      el("h3", {
        textContent: day
          ? dayWords(selected, { weekday: true })
          : labels.upcoming,
      }),
      ...(day && selected > date
        ? [skipForward(labels.advance, () => onAdvance(selected))]
        : []),
    );
    const list = el(
      "div",
      { className: "calendar-list" },
      menuPages(
        rows.map((item) => entryRow(item, !day || item.date !== selected)),
        PAGE,
      ),
    );
    side.replaceChildren(
      head,
      list,
      ...(day
        ? [
            el(
              "nav",
              { className: "calendar-paging" },
              button(labels.upcoming, () => select(date), "action small"),
            ),
          ]
        : []),
    );
  };
  const select = (iso) => {
    selected = iso;
    drawMonth();
    drawSide();
  };
  const drawMonth = () => {
    const move = (delta) => {
      month = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
      drawMonth();
    };
    const header = el(
      "nav",
      { className: "calendar-heading" },
      button(labels.previousMonth, () => move(-1), "month-step"),
      el("h3", {
        textContent: monthWords(
          `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
        ),
      }),
      button(labels.nextMonth, () => move(1), "month-step"),
      button(labels.today, () => goTo(date), "month-step"),
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
      const entries = byDate.get(iso) ?? [];
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
      // Each thing on the day, on the day: its icon and its line, as many as fit.
      for (const entry of entries
        .toSorted((a, b) => Number(b.own) - Number(a.own))
        .slice(0, 2))
        cell.append(
          el(
            "span",
            { className: `entry${entry.own ? " own" : ""}` },
            icon(entry),
            el("span", { className: "what", textContent: entry.line }),
          ),
        );
      if (entries.length > 2)
        cell.append(
          el("span", {
            className: "more",
            textContent: `+${entries.length - 2}`,
          }),
        );
      grid.append(cell);
    }
    monthBox.replaceChildren(header, grid);
  };
  drawMonth();
  drawSide();
  root.append(monthBox, side);
  return root;
}
