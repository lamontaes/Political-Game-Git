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
import { tableRows } from "./dev-view.mjs";
import { moneyWords } from "../../english/plain-words.mjs";

const roundedMoney = (minor) => moneyWords(minor, { rounded: true });

/**
 * The country-in-20-years section: one button, then the time it took, whether every count
 * stayed possible, and one table of the nation and the player's state at chosen years. Every
 * figure is formatted the way the Metrics tab formats it; every word is a control name.
 */
function outlookSection(labels) {
  const out = labels.outlook;
  const percent = (value) => `${value.toFixed(1)} ${out.percent}`;
  const count = (value) => Math.round(value).toLocaleString("en-US");
  const dollars = (value) => roundedMoney(Math.round(value * 100));
  const button = makeButton({ className: "action" }, out.button);
  button.dataset.testid = "dev-outlook";
  const took = statusLine();
  const verdict = statusLine();
  const shown = el("div", { className: "dev-outlook-table" });
  button.addEventListener("click", async () => {
    button.disabled = true;
    took.textContent = "";
    verdict.textContent = "";
    shown.replaceChildren();
    try {
      const response = await fetch("/api/dev/outlook", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      if (!value.opened) {
        took.textContent = out.notYet;
        return;
      }
      took.textContent = out.took.replace("{n}", value.seconds.toFixed(1));
      verdict.textContent = value.couldBe
        ? out.possible
        : out.impossible.replace("{n}", String(value.monthsWithProblems));
      const columns = [
        { name: out.yearColumn, value: (row) => row.when },
        {
          name: out.unemployment,
          value: (row) => percent(row.nation.unemploymentPct),
        },
        {
          name: out.inflation,
          value: (row) => percent(row.nation.inflationPct),
        },
        {
          name: out.policyRate,
          value: (row) => percent(row.nation.policyRatePct),
        },
        { name: out.pay, value: (row) => dollars(row.nation.hourlyPay) },
        ...(value.mine.length
          ? [
              {
                name: out.stateUnemployment,
                value: (row) => percent(row.mine.unemploymentPct),
              },
              { name: out.statePeople, value: (row) => count(row.mine.people) },
              { name: out.stateJobs, value: (row) => count(row.mine.jobs) },
              {
                name: out.stateBudget,
                value: (row) =>
                  roundedMoney(Math.round(row.mine.budgetYear * 100)),
              },
            ]
          : []),
      ];
      const rows = value.shown.map((year, at) => ({
        when: year === 0 ? out.today : out.year.replace("{n}", String(year)),
        nation: value.nation[at],
        mine: value.mine[at],
      }));
      const table = el("table", {}, ...tableRows(columns, rows));
      table.dataset.testid = "dev-outlook-table";
      shown.replaceChildren(table);
    } catch (error) {
      took.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  const section = el(
    "div",
    { className: "dev-outlook" },
    el("h4", { className: "label", textContent: out.title }),
    el("p", { className: "label", textContent: out.explanation }),
    el("div", { className: "acts" }, button),
    took,
    verdict,
    shown,
  );
  return section;
}

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
  // Where an event counts: the player's own town, county, state and nation (the default), or anywhere.
  let anywhere = false;
  const whereButton = toggle(labels.anywhere, false, (b) => {
    anywhere = !anywhere;
    b.setAttribute("aria-pressed", String(anywhere));
  });
  whereButton.dataset.testid = "dev-run-anywhere";
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
          ...(anywhere ? { where: "anywhere" } : {}),
          ...(hold && lastIntroducedSeries()
            ? { defeat: [lastIntroducedSeries()] }
            : {}),
        }),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      result.textContent = [
        `${labels.reasons[value.reason]}`,
        ...(until ? [labels.where[value.where]] : []),
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
  // Jump to an hour of the day: a row of named hours, the chosen one lit (no arrows), then the
  // button. The player's clock moves there and the world runs to it.
  let hourAt = labels.hours.find((h) => h.chosen)?.hour ?? labels.hours[0].hour;
  const hourButtons = labels.hours.map((h) => {
    const b = makeButton({ className: "action small", textContent: h.label });
    b.setAttribute("aria-pressed", String(h.hour === hourAt));
    b.dataset.hour = String(h.hour);
    b.addEventListener("click", () => {
      hourAt = h.hour;
      for (const other of hourButtons)
        other.setAttribute("aria-pressed", String(other === b));
    });
    return b;
  });
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
    el("div", { className: "acts" }, whereButton, holdButton, run),
    el("h4", { className: "label", textContent: labels.hour }),
    el("div", { className: "acts" }, ...hourButtons),
    el("div", { className: "acts" }, jump),
    result,
    outlookSection(labels),
  );
}
