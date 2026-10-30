// The draft line of a body's office screen: pick what the bill is about, see what is in
// force today beside the new amount you type, and draft it. The screen hands it the body's
// issue groups (each item with the amount in force today, already in words), the words and
// what drafting does; nothing here computes.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, numberBox } from "./fields.mjs";

/**
 * `groups`: [{ name, items: [{ value, label, today, unit, cents, note }] }]; `words`:
 * { title, issue, today, newAmount, draft, none }; `onDraft(item, typed)` drafts the bill.
 */
export function draftCard({ groups, words, onDraft }) {
  const items = new Map(
    groups.flatMap((group) => group.items.map((item) => [item.value, item])),
  );
  const pick = select({
    label: words.issue,
    options: groups.map((group) => ({
      group: group.name,
      options: group.items.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    })),
  });
  const typed = numberBox({ value: 0, label: words.newAmount });
  const unit = el("span", { className: "draft-unit" });
  const today = el("strong", { className: "draft-today" });
  const note = el("p", { className: "draft-note" });
  const draft = makeButton({
    className: "action",
    textContent: words.draft,
  });
  const show = () => {
    const item = items.get(pick.value);
    today.textContent = item?.today ?? words.none;
    unit.textContent = item?.unit ?? "";
    note.textContent = item?.note ?? "";
    draft.disabled = Boolean(item?.blocked);
  };
  pick.addEventListener("change", show);
  draft.addEventListener("click", () =>
    onDraft(items.get(pick.value), typed.value),
  );
  show();
  return el(
    "div",
    { className: "draft-card" },
    el("h4", { className: "draft-title", textContent: words.title }),
    pick,
    el(
      "div",
      { className: "draft-amounts" },
      el(
        "span",
        { className: "draft-cell" },
        el("small", { textContent: words.today }),
        today,
      ),
      el(
        "span",
        { className: "draft-cell" },
        el("small", { textContent: words.newAmount }),
        el("span", { className: "draft-entry" }, typed, unit),
      ),
      draft,
    ),
    note,
  );
}
