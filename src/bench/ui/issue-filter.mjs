// The Issues list's filters: which laws show, by level, in force and subject. A pure read of
// the law rows `government.ts` hands the screen (`law[].levels[].row`, `law[].pending`); it
// computes no fact of its own, so the list and a test count the same laws.
import { el } from "./dom.mjs";
import { tabBar, chooseTab } from "./tab.mjs";
import { rosterScreen } from "./roster-screen.mjs";

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
 * The Issues screen's frame (the approved play mock, pl-issues): a Level bar and an In force
 * bar of tabs over the subjects, each with how many laws it holds under those bars, beside
 * the list `draw` fills with the chosen subject's laws. `choices`: { level, force, subject }
 * each [[key, label]]; `state` is the chosen key per filter, kept by the screen; `countOf(key)`
 * is how many laws the bars leave in a subject; `draw(list)` fills the list node it is handed,
 * now and on every change; `words` names the filters ({ level, force, subject, all }).
 */
export function issueFilterScreen({ words, choices, state, draw, countOf }) {
  const body = el("div", { className: "issues-body" });
  // The subjects with a law under the bars beside the chosen one's laws: the one list-beside-
  // detail part (rosterScreen), the subject's page the laws `draw` fills.
  const onChange = () => {
    const shown = choices.subject.filter(([key]) => countOf(key) > 0);
    if (!shown.some(([key]) => key === state.subject))
      state.subject = shown[0]?.[0] ?? ALL;
    const laws = () => {
      const list = el("div", { className: "issues-list" });
      draw(list);
      return list;
    };
    if (!shown.length) {
      body.replaceChildren(laws());
      return;
    }
    body.replaceChildren(
      ...rosterScreen({
        title: words.subject,
        className: "issues-subjects",
        chosenKey: state.subject,
        groups: [
          {
            entries: shown.map(([key, label]) => ({
              key,
              label,
              aside: String(countOf(key)),
              data: { subject: key },
            })),
          },
        ],
        render: (entry) => {
          state.subject = entry.key;
          return [laws()];
        },
      }),
    );
  };
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
  onChange();
  return el(
    "div",
    { className: "issues-screen" },
    el("div", { className: "issues-bars" }, ...bars),
    body,
  );
}
