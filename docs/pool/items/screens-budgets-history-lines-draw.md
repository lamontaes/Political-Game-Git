---
id: screens-budgets-history-lines-draw
title: "Budgets' history lines draw once a place has two years of figures, instead of throwing"
area: play
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by:
pr: #10361
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
merged-at: 2026-11-24T06:45:31.149Z
---

**What.** Box and scroll found a page error on Politics, Budgets, Cannot convert undefined or null to object (carryover N8-P28, Budgets). Once a place has two years of figures the history lines throw and the page draws no line.
Seen: Politics, Budgets, a department opened after a game year, at 1440 by 900. Seen: Budgets, a department with its history lines, after. Guards: budgets-history.browser.mjs

**Cause.** Measured: `node src/bench/budgets-history.browser.mjs` against `npm run bench` on main fails "TypeError: Cannot convert undefined or null to object"; after 40 played weeks on drawn Johnsonville, South Carolina no history line draws, and on the fix Kennewick, Washington draws three. trendLine in src/bench/ui/trend-line.mjs destructures an option named valueOf; an options object with none of its own gives the inherited Object.prototype.valueOf, which history.map calls with no this.

**Fix.** Rename the option to amountOf in trend-line.mjs and its one caller, metrics-screen.mjs; add budgets-history.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: the approved Budgets page draws its history as a plain line. No hand-written player text: no new label is added; only an option name changes.

**Done when.** A second session, in a drawn place and seed it names, plays about a year, opens Politics, Budgets and a department, and sees the history lines drawn with no page error; budgets-history.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/ui/trend-line.mjs,src/bench/ui/metrics-screen.mjs,src/bench/budgets-history.browser.mjs (new)
