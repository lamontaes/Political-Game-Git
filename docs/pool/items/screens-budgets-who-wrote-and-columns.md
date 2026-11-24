---
id: screens-budgets-who-wrote-and-columns
title: "Budgets names who adopted a budget and stacks the department over the totals"
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

**What.** The CTO's Nov 24 Budgets item (7142760180 on #10377), from the owner's Nov 23 "there's just so much empty area here": in Quitman, Mississippi the middle column holds two rows and the rest of the panel is empty, and "Who wrote it" is answered by a date ("Adopted October 1, 2024"), not a person or body.
Seen: Politics, Budgets for a town at 1440 by 900. Seen: the same page with the department over the totals and a body named, after. Guards: budgets-who-wrote.browser.mjs

**Cause.** Measured: `node src/bench/budgets-who-wrote.browser.mjs` against `npm run bench` on main fails "3 columns on the Budgets board" in every drawn town. The Budgets screen in src/bench/play.mjs draws the chosen department as its own middle column and the government's totals as a third, and puts only the adoption date under "Who wrote it" though the adoption record names the body (`adoptedBy.tallies[0].title`).

**Fix.** Stack the chosen department's section over the totals in one column (two columns in all); under "Who wrote it" show the body's name through the existing "Adopted by" label and the date, and show the section only when the record names a body; add budgets-who-wrote.browser.mjs.

**Time box.** 90 minutes

**Rules.** Screen to mock: MENU-LOOK says no dead space and no filler, so a column of two rows is merged and a date alone is not an answer to who. No hand-written player text: only the existing "Who wrote it", "Adopted by" and "Adopted" labels are used.

**Done when.** A second session, in a drawn place and seed it names, opens Budgets for a government whose budget a body voted and sees the department's rows over the totals in one column and the body named under "Who wrote it"; budgets-who-wrote.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/budgets-who-wrote.browser.mjs (new)
