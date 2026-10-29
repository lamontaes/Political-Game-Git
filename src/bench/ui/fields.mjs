// The form controls a screen offers: a search box, a select, a checkbox setting.
// Their words come from the screen's labels; a screen never builds an input itself.
import { el } from "./dom.mjs";

/** A search box; `onInput` runs with the text each time it changes. */
export function searchBox({ value = "", placeholder, onInput }) {
  const box = el("input", { type: "search", value, placeholder });
  if (onInput) box.addEventListener("input", () => onInput(box.value));
  return box;
}

/**
 * A select of `options` ({ value, label, data? }), `value` chosen; `onChange` gets the
 * new value. An option with `group` and `options` instead is a group of choices under
 * its name. An option's `data` is kept on it (a choice typed in dollars).
 */
export function select({
  options,
  value,
  label,
  name,
  className = "",
  onChange,
}) {
  const option = (o) => {
    const node = el("option", {
      value: String(o.value),
      textContent: o.label,
      selected: o.value === value || o.selected === true,
    });
    Object.assign(node.dataset, o.data ?? {});
    return node;
  };
  const box = el(
    "select",
    { className, ariaLabel: label ?? "", ...(name ? { name } : {}) },
    ...options.map((o) =>
      o.group
        ? el("optgroup", { label: o.group }, ...o.options.map(option))
        : option(o),
    ),
  );
  if (onChange) box.addEventListener("change", () => onChange(box.value, box));
  return box;
}

/** A box for a number, `value` to start; `label` is its spoken name. */
export function numberBox({
  value = 0,
  min,
  step,
  label,
  className = "number-box",
}) {
  return el("input", {
    type: "number",
    value: String(value),
    className,
    ...(min !== undefined ? { min: String(min) } : {}),
    ...(step !== undefined ? { step: String(step) } : {}),
    ...(label ? { ariaLabel: label } : {}),
  });
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

/** The choices of a select the page already holds ({ value, label, selected? }). */
export function optionsOf(items) {
  return items.map((o) =>
    el("option", {
      value: String(o.value),
      textContent: o.label,
      selected: Boolean(o.selected),
    }),
  );
}

/** A line that says what a setting did, read out when it changes; empty until then. */
export function statusLine() {
  return el("p", { role: "status", className: "option-status" });
}
