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
 * `words`: { title, issue, today, newAmount, draft, none }; `onDraft(item, typed)`
 * drafts the bill. Returns the screen's node.
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
    draft.addEventListener("click", () => onDraft(item, typed.value));
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
        // A dollar sign leads the amount; any other unit follows it.
        el(
          "div",
          { className: "draft-entry" },
          ...(item.unit === "$"
            ? [unitOf(item), typed]
            : [typed, unitOf(item)]),
        ),
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
