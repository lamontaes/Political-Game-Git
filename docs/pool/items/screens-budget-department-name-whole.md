---
id: screens-budget-department-name-whole
title: "A budget department's row keeps its whole name and its head"
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

**What.** Carryover N16-66 (the CTO catch from the Nov 16 sitting): a cut-off budget label, and heads on only some rows. On Politics, Budgets a long department name such as Housing and community development lost its last word and its head ran over it.
Seen: Politics, Budgets, the town level, at 1440 by 900. Seen: Politics, Budgets, the town level, Housing and community development whole with its head, after. Guards: budget-rows-whole.browser.mjs

**Cause.** Measured: `node src/bench/budget-rows-whole.browser.mjs` against `npm run bench` on b8312379 fails "the department name is cut off"; on drawn Gloster, Mississippi, Boise City, Idaho and Leipsic, Delaware the row for Housing and community development has its name clipped at a fixed 50 px. The .bsdept rule in src/bench/play.css fixes the row at height 50px and clamps the name to two lines, so a three-line name or a name with a head under it is cut. Heads on only some rows is the record: departments without an appointed head have none to show.

**Fix.** Make the row min-height 50px and drop the two-line clamp so the row grows to its name and its head; add budget-rows-whole.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: the approved Budgets page shows each department with its head in words. No hand-written player text: no new label is added; only the row sizing changes.

**Done when.** A second session, in a drawn place and seed it names, opens Politics, Budgets at the town level and sees every department name whole with its head under it where the record has one; budget-rows-whole.browser.mjs passes.

**Waits on.** Nothing; builds on the Budgets history fix in #10361.

**Files.** src/bench/play.css,src/bench/budget-rows-whole.browser.mjs (new)
