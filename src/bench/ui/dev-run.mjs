/* global fetch */
// Dev mode's run-until control, on the calendar: run the world for a number of days or until an
// event, with a cap. It posts to the dev route, which runs the game's own days one by one. The
// result shows why it stopped, the dates and the record ids that stopped it; words are control
// names and record data only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, numberBox, statusLine } from "./fields.mjs";
import { devCheckbox } from "./dev-check.mjs";
import { lastIntroducedSeries } from "./dev-bills.mjs";

/**
 * The run-until panel. `labels` is controls.devRun; `onDone()` refreshes the game's screens
 * once the world has moved.
 */
export function devRunPanel({ labels, onDone }) {
  const days = numberBox({ value: 30, min: 1, label: labels.days });
  const cap = numberBox({ value: 366, min: 1, label: labels.cap });
  const event = select({
    label: labels.event,
    value: "",
    options: [
      { value: "", label: labels.noEvent },
      ...Object.entries(labels.events).map(([value, label]) => ({
        value,
        label,
      })),
    ],
  });
  // Hold the law just passed: while the world runs, the members vote down any bill that changes it.
  const hold = devCheckbox({ label: labels.holdLaw });
  hold.box.dataset.testid = "dev-hold-law";
  const result = statusLine();
  const run = makeButton({ className: "action" }, labels.run);
  run.dataset.testid = "dev-run";
  run.addEventListener("click", async () => {
    run.disabled = true;
    result.textContent = "";
    try {
      const response = await fetch("/api/dev/run-until", {
        method: "POST",
        body: JSON.stringify({
          days: event.value ? undefined : Number(days.value),
          event: event.value || undefined,
          cap: Number(cap.value),
          ...(hold.box.checked && lastIntroducedSeries()
            ? { defeat: [lastIntroducedSeries()] }
            : {}),
        }),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      result.textContent = [
        `${labels.reasons[value.reason]}`,
        `${value.from} → ${value.to}`,
        `${value.days} ${labels.days}`,
        ...value.records,
      ].join(" · ");
      await onDone();
    } catch (error) {
      result.textContent = error.message;
    } finally {
      run.disabled = false;
    }
  });
  return el(
    "section",
    { className: "dev-only dev-run" },
    el("h3", { textContent: labels.title }),
    el("div", { className: "dev-run-row" }, days, event, cap, run),
    hold.line,
    result,
  );
}
