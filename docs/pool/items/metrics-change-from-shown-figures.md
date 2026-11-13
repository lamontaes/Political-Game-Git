---
id: metrics-change-from-shown-figures
title: "A Metrics row's change from last year is the difference of the two figures the row shows"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: account lead T38
pr: #9068
blocked-on:
after:
lead: metrics
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
source: Words lead, Nov 13, reading the Metrics pictures on the train
claimed-at: 2026-11-13
checked: fable 2026-11-10
---

**What.** A Metrics row read "Typical home value $209,000 / Last year $207,000, up $2,200": the two figures are each rounded to three figures for display, but the change was taken from the unrounded values, so the row contradicted itself. Seen: the Metrics board's "Last year ... up or down ..." line on every money, count and percent row (home value, rent, pay, budget lines).

**Cause.** Found in code: src/bench/play.mjs `sheets.metrics` computed `moved = row.now - row.before` from raw values and then rounded the size alone, while `moneyWords(..., { rounded: true })` in src/english/plain-words.mjs rounds each figure to three figures (or one decimal of a million). A direction could also read "up" beside two identical figures.

**Fix.** One helper, src/bench/ui/metrics-change.mjs, makes the figure (`metricsFigure`) and the change (`metricsChange`) for every row, taking the change from the shown figures of each unit (money and dollars to the shown figure, counts to whole numbers, percents to a tenth). `sheets.metrics` calls it for every row. No wording changes.

**Time box.** 1 hour.

**Rules.** Replace, never layer: the inline arithmetic in `sheets.metrics` is deleted. Every figure stays traceable in dev Trace, since the registry's raw values are untouched. No speed cost: the helper runs on a row's two numbers at screen draw.

**Done when.** A second session opens Metrics in a drawn place a year in and finds, for every row with a last year, that the size shown equals the difference of the two figures shown, and "no change" only when the two figures read the same.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/ui/metrics-change.mjs, src/bench/metrics-change.test.ts

**Notes.** Filed Nov 13, 2026 by Account lead T38.
