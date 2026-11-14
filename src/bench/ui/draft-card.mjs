// Writing a bill (owner, Oct 14: "bills follow the real form, and the player
// edits only the terms"). A list of everything the body may write a bill
// about, grouped by law area, each row with what is in force today; beside
// it, the chosen subject's page: what is in force, the one term the player
// sets, and Draft. Built from the pick list and the strip sections every
// list-beside-its-page screen uses; the screen hands it the body's issue
// groups already in words, and nothing here computes.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { numberBox } from "./fields.mjs";
import { rosterScreen } from "./roster-screen.mjs";
import { rosterTitle, stripSection } from "./strips.mjs";

/**
 * `groups`: [{ name, items: [{ value, label, today, unit, cents, note, blocked }] }];
 * `words`: { title, issue, today, newAmount, draft, none, risePerYear, risePercent,
 * riseYears, riseFirstDate, riseBack, riseNeedsAmount }; `onDraft(item, typed, steps, rise)` drafts the bill (`rise` is
 * the percent a year, its years and its first day, in place of a value or steps). Returns the screen's node.
 */
export function draftCard({ groups, words, onDraft }) {
  const unitOf = (item) =>
    el("span", { className: "draft-unit", textContent: item.unit ?? "" });
  const page = (item) => {
    const typed = numberBox({ value: 0, label: words.newAmount });
    const draft = makeButton({
      className: "action primary",
      textContent: words.draft,
    });
    draft.disabled = Boolean(item.blocked);
    // A phase-in: the amount typed is its first step and each added step has its own
    // amount; every step names the day it takes effect. The engine refuses a bad date
    // and the screen shows its reason. Only a law amount can be phased in.
    const steps = el("div", { className: "draft-steps" });
    const rows = [];
    const when = el("span", {
      className: "draft-when",
      textContent: words.firstStep ?? "",
    });
    const firstRow = el(
      "div",
      { className: "draft-step" },
      el(
        "span",
        { className: "draft-entry" },
        ...(item.unit === "$" ? [unitOf(item), typed] : [typed, unitOf(item)]),
      ),
      when,
    );
    let firstDate = null;
    const dateField = (name) =>
      el("input", {
        type: "date",
        className: "draft-step-date",
        ariaLabel: name,
      });
    const addStep = makeButton({
      className: "action small draft-add-step",
      textContent: words.addStep ?? "",
    });
    addStep.addEventListener("click", () => {
      // The first amount gets its own day the moment there is more than one.
      if (!firstDate) {
        firstDate = dateField(words.stepDate ?? "");
        when.textContent = words.stepDate ?? "";
        firstRow.append(firstDate);
      }
      const amount = numberBox({ value: 0, label: words.newAmount });
      const date = dateField(words.stepDate ?? "");
      rows.push({ amount, date });
      // Every row reads the same way: the amount with its unit, then when it takes effect.
      steps.append(
        el(
          "div",
          { className: "draft-step" },
          el(
            "span",
            { className: "draft-entry" },
            ...(item.unit === "$"
              ? [unitOf(item), amount]
              : [amount, unitOf(item)]),
          ),
          el("span", {
            className: "draft-when",
            textContent: words.stepDate ?? "",
          }),
          date,
        ),
      );
    });
    // A phase-in by a percent a year (the owner's ruling, Sept 12: dated steps or a percent a
    // year): the percent, the years it runs and the day of the first increase. The amount in force
    // is what it rises from, so the typed amount and the added steps give way to it.
    const percent = numberBox({
      value: 0,
      step: "any",
      label: words.risePercent,
    });
    const years = numberBox({ value: 2, min: 2, label: words.riseYears });
    const riseDate = dateField(words.riseFirstDate ?? "");
    const riseRow = (...children) =>
      el("div", { className: "draft-rise-row" }, ...children);
    const rise = el(
      "div",
      { className: "draft-rise" },
      riseRow(
        el("span", { className: "draft-entry" }, percent),
        el("span", {
          className: "draft-when",
          textContent: words.risePercent ?? "",
        }),
      ),
      riseRow(
        el("span", { className: "draft-entry" }, years),
        el("span", {
          className: "draft-when",
          textContent: words.riseYears ?? "",
        }),
      ),
      riseRow(
        riseDate,
        el("span", {
          className: "draft-when",
          textContent: words.riseFirstDate ?? "",
        }),
      ),
    );
    rise.hidden = true;
    const riseToggle = makeButton({
      className: "action small draft-rise-toggle",
      textContent: words.risePerYear ?? "",
    });
    // With nothing in force there is nothing to raise by a percent: the button stays dark and
    // a line beside it says why. Open, the button says that pressing it goes back to one amount.
    riseToggle.disabled = !item.raisable;
    const riseWhy = el("p", {
      className: "draft-note",
      textContent: words.riseNeedsAmount ?? "",
    });
    riseWhy.hidden = Boolean(item.raisable);
    riseToggle.addEventListener("click", () => {
      rise.hidden = !rise.hidden;
      riseToggle.textContent = rise.hidden
        ? (words.risePerYear ?? "")
        : (words.riseBack ?? "");
      firstRow.hidden = steps.hidden = addStep.hidden = !rise.hidden;
    });
    draft.addEventListener("click", () =>
      rise.hidden
        ? onDraft(
            item,
            typed.value,
            firstDate
              ? [
                  { amount: typed.value, date: firstDate.value },
                  ...rows.map((row) => ({
                    amount: row.amount.value,
                    date: row.date.value,
                  })),
                ]
              : [],
          )
        : onDraft(item, typed.value, [], {
            percent: percent.value,
            years: years.value,
            firstDate: riseDate.value,
          }),
    );
    return [
      rosterTitle(item.label),
      stripSection(
        1,
        words.today,
        el("strong", {
          className: "draft-today",
          textContent: item.today ?? words.none,
        }),
      ),
      stripSection(
        2,
        words.newAmount,
        firstRow,
        steps,
        ...(item.value.startsWith("series:")
          ? [addStep, riseToggle, riseWhy, rise]
          : []),
        ...(item.note
          ? [el("p", { className: "draft-note", textContent: item.note })]
          : []),
        el("div", { className: "acts" }, draft),
      ),
    ];
  };
  return el(
    "div",
    { className: "draft-card" },
    ...rosterScreen({
      title: words.issue,
      className: "draft-screen",
      groups: groups.map((group) => ({
        title: group.name,
        entries: group.items.map((item) => ({
          key: item.value,
          label: item.label,
          aside: item.today ?? "",
          // A subject this body may not write a bill about is listed dimmed.
          data: {
            value: item.value,
            ...(item.blocked ? { blocked: "true" } : {}),
          },
          item,
        })),
      })),
      render: (entry) => page(entry.item),
    }),
  );
}
