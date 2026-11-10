// The Issues list's filters: which laws show, by level, in force and subject. A pure read of
// the law rows `government.ts` hands the screen (`law[].levels[].row`, `law[].pending`); it
// computes no fact of its own, so the list and a test count the same laws.
import { el } from "./dom.mjs";
import { tabBar, chooseTab } from "./tab.mjs";
import { select } from "./fields.mjs";

/** Every filter's "no filter" key. */
export const ALL = "all";

/** The levels that have a law in force on this series (a recorded row not set aside). */
export function levelsInForce(law) {
  return law.levels.filter((l) => l.row && !l.setAside).map((l) => l.level);
}

/** The levels that have a law on this series, in force or coming. */
export function levelsOf(law) {
  const coming = (law.pending ?? []).map((p) => p.level);
  return [...new Set([...levelsInForce(law), ...coming])];
}

/** Whether any level has this law in force today (otherwise it is only coming). */
export function isInForce(law) {
  return levelsInForce(law).length > 0;
}

/**
 * The laws the chosen filters name. `filter`: { level, force, subject }, each `ALL` or a key;
 * `force` is `ALL`, "in" (in force) or "not" (not in force yet). `subjectOf(series)` is the
 * screen's own subject of a law.
 */
export function filterLaws(laws, filter, subjectOf) {
  return laws.filter(
    (law) =>
      (filter.level === ALL || levelsOf(law).includes(filter.level)) &&
      (filter.force === ALL || isInForce(law) === (filter.force === "in")) &&
      (filter.subject === ALL || subjectOf(law.series) === filter.subject),
  );
}

/** The levels present across the laws, for the level filter's choices. */
export function levelChoices(laws) {
  return [...new Set(laws.flatMap(levelsOf))];
}

/**
 * The Issues screen's frame: a Level bar and an In force bar of tabs and a Subject select
 * (the shared controls) over the list `draw` fills. `choices`: { level, force,
 * subject } each [[key, label]]; `state` is the chosen key per filter, kept by the screen;
 * `draw(list)` fills the list node it is handed, now and on every change; `words` names the filters ({ level, force, subject, all }).
 */
export function issueFilterScreen({ words, choices, state, draw }) {
  const list = el("div", { className: "issues-list" });
  const onChange = () => draw(list);
  const row = (name, control) =>
    el(
      "div",
      { className: "issue-filter-row" },
      el("span", { textContent: words[name] }),
      control,
    );
  const bars = ["level", "force"].map((name) => {
    const bar = tabBar({
      attr: name,
      className: "issue-filter",
      active: state[name],
      tabs: [[ALL, words.all], ...choices[name]].map(([key, label]) => ({
        key,
        label,
        onSelect: () => {
          state[name] = key;
          chooseTab(bar, name, key);
          onChange();
        },
      })),
    });
    return row(name, bar);
  });
  const subject = select({
    className: "issue-filter",
    label: words.subject,
    value: state.subject,
    options: [[ALL, words.all], ...choices.subject].map(([value, label]) => ({
      value,
      label,
      data: { subject: value },
    })),
    onChange: (value) => {
      state.subject = value;
      onChange();
    },
  });
  onChange();
  return el(
    "div",
    { className: "issues-screen" },
    ...bars,
    row("subject", subject),
    list,
  );
}
