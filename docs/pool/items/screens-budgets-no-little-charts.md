---
id: screens-budgets-no-little-charts
title: "Budgets shows this year beside last as figures and draws no little charts"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** The CTO, Nov 24 06:46Z, caught that every department on Politics, Budgets draws a trend line. The owner ruled on Nov 5 data, never charts, and Metrics line was approved only on click (Nov 12). Budgets already carries Last year and Since last year as figures.
Seen: Politics, Budgets, a department and the government totals, at 1440 by 900. Seen: Budgets, a department with Last year as figures and no line, after. Guards: budgets-history.browser.mjs

**Cause.** Measured: `node src/bench/budgets-history.browser.mjs` (the added assertion, with budgets drawing history) fails on main; after 40 played weeks on drawn Kennewick, Washington the department page and both totals each draw a line (3 svg.trend-line). The Budgets sheet in src/bench/play.mjs passes each record history to trendLine through a local history helper at the department page and the revenue and spending totals.

**Fix.** Delete the history helper, its three calls and the trendLine import from play.mjs; Last year and Since last year rows stay as the figures. Metrics keeps its line through metrics-screen.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: the Nov 5 rule says data, never little charts, so Budgets shows figures only. No hand-written player text: no new label is added; a chart is deleted.

**Done when.** A second session, in a drawn place and seed it names, plays about a year, opens Politics, Budgets and a department and sees Last year and Since last year as figures with no line drawn; budgets-history.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/budgets-history.browser.mjs
