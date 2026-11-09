/* global fetch */
// Dev mode's run panel, on the calendar (mock fr-dev-run): run the world for a number of
// days (arrows either side of the number) or until an event (one of a row of buttons, lit
// when chosen), then Run. It posts to the dev route, which runs the game's own days one by
// one. The result line shows why it stopped, the dates and the record ids that stopped it;
// words are control names and record data only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { lookRow } from "./look-row.mjs";
import { statusLine } from "./fields.mjs";
import { lastIntroducedSeries } from "./dev-bills.mjs";

/**
 * The run panel. `labels` is controls.devRun; `onDone()` refreshes the game's screens once
 * the world has moved.
 */
export function devRunPanel({ labels, onDone }) {
  let at = labels.steps.indexOf(labels.firstStep);
  let until = "";
  let hold = false;
  const result = statusLine();
  const wordsFor = (n) =>
    (n === 1 ? labels.day : labels.daysValue).replace("{n}", String(n));
  const stepper = el("div");
  const drawStepper = () => {
    const row = lookRow(
      { id: "days", label: labels.for, value: wordsFor(labels.steps[at]) },
      {
        onMove: (_id, by) => {
          at = Math.min(Math.max(at + by, 0), labels.steps.length - 1);
          drawStepper();
        },
        arrowLabel: (by) => (by < 0 ? labels.fewer : labels.more),
      },
    );
    row.dataset.testid = "dev-days";
    stepper.replaceChildren(row);
  };
  drawStepper();
  // A button that is lit while it is chosen; choosing a lit one again puts it out.
  const toggle = (text, on, onClick) => {
    const b = makeButton({ className: "action small", textContent: text });
    b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", () => onClick(b));
    return b;
  };
  const eventButtons = Object.entries(labels.events).map(([key, text]) => {
    const b = toggle(text, false, () => {
      until = until === key ? "" : key;
      for (const other of eventButtons)
        other.setAttribute(
          "aria-pressed",
          String(other.dataset.event === until),
        );
    });
    b.dataset.event = key;
    b.dataset.testid = `dev-until-${key}`;
    return b;
  });
  // Hold the law just passed: while the world runs, the members vote down any bill that changes it.
  const holdButton = toggle(labels.holdLaw, false, (b) => {
    hold = !hold;
    b.setAttribute("aria-pressed", String(hold));
  });
  holdButton.dataset.testid = "dev-hold-law";
  const run = makeButton({ className: "action" }, labels.run);
  run.dataset.testid = "dev-run";
  run.addEventListener("click", async () => {
    run.disabled = true;
    result.textContent = "";
    try {
      const response = await fetch("/api/dev/run-until", {
        method: "POST",
        body: JSON.stringify({
          days: until ? undefined : labels.steps[at],
          event: until || undefined,
          cap: labels.cap,
          ...(hold && lastIntroducedSeries()
            ? { defeat: [lastIntroducedSeries()] }
            : {}),
        }),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      result.textContent = [
        `${labels.reasons[value.reason]}`,
        `${value.from} → ${value.to}`,
        `${value.days} ${labels.daysName}`,
        ...value.records,
      ].join(" · ");
      await onDone();
    } catch (error) {
      result.textContent = error.message;
    } finally {
      run.disabled = false;
    }
  });
  // Jump to an hour of the day (arrows either side of the hour): the player's clock moves there
  // and the world runs to it.
  let hourAt = 12;
  const hourBox = el("div");
  const drawHour = () => {
    const row = lookRow(
      { id: "hour", label: labels.hour, value: String(hourAt) },
      {
        onMove: (_id, by) => {
          hourAt = Math.min(Math.max(hourAt + by, 0), 23);
          drawHour();
        },
        arrowLabel: (by) => (by < 0 ? labels.fewer : labels.more),
      },
    );
    row.dataset.testid = "dev-hour";
    hourBox.replaceChildren(row);
  };
  drawHour();
  const jump = makeButton({ className: "action" }, labels.jump);
  jump.dataset.testid = "dev-jump-hour";
  jump.addEventListener("click", async () => {
    jump.disabled = true;
    result.textContent = "";
    try {
      const response = await fetch("/api/dev/hour", {
        method: "POST",
        body: JSON.stringify({ hour: hourAt }),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      result.textContent = value.held
        ? labels.held
        : `${value.at.date} · ${Math.floor(value.at.minuteOfDay / 60)}:${String(value.at.minuteOfDay % 60).padStart(2, "0")}`;
      await onDone();
    } catch (error) {
      result.textContent = error.message;
    } finally {
      jump.disabled = false;
    }
  });
  return el(
    "section",
    { className: "dev-only dev-run" },
    el("h3", { textContent: labels.title }),
    stepper,
    el("h4", { className: "label", textContent: labels.orUntil }),
    el("div", { className: "acts" }, ...eventButtons),
    el("div", { className: "acts" }, holdButton, run),
    hourBox,
    el("div", { className: "acts" }, jump),
    result,
  );
}
