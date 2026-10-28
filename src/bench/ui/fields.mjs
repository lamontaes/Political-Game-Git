// The form controls a screen offers: a search box, a select, a checkbox setting.
// Their words come from the screen's labels; a screen never builds an input itself.
import { el } from "./dom.mjs";

/** A search box; `onInput` runs with the text each time it changes. */
export function searchBox({ value = "", placeholder, onInput }) {
  const box = el("input", { type: "search", value, placeholder });
  if (onInput) box.addEventListener("input", () => onInput(box.value));
  return box;
}

/** A select of `options` ({ value, label }), `value` chosen; `onChange` gets the new value. */
export function select({ options, value, label, className = "", onChange }) {
  const box = el(
    "select",
    { className, ariaLabel: label ?? "" },
    ...options.map((o) =>
      el("option", {
        value: o.value,
        textContent: o.label,
        selected: o.value === value,
      }),
    ),
  );
  if (onChange) box.addEventListener("change", () => onChange(box.value));
  return box;
}

/** A labeled checkbox line; the checkbox is returned too, for screens that set it. */
export function checkboxSetting({ label, checked, testid }) {
  const box = el("input", { type: "checkbox", checked: Boolean(checked) });
  if (testid) box.dataset.testid = testid;
  const line = el(
    "label",
    { className: "option-setting" },
    el("span", { textContent: label }),
    box,
  );
  return { line, box };
}
