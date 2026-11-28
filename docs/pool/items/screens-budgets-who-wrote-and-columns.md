---
id: screens-budgets-who-wrote-and-columns
title: "Budgets names who adopted a budget and stacks the department over the totals"
area: play
kind: bug
priority: 2
size: S
status: done
standard: 2
claimed-by:
pr: #10546
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
merged-at: 2026-11-24T23:54:15.293Z
seen-by: Dead stops tracer
seen-at: 2026-11-25T01:25:39.065Z
---

**What.** The CTO's Nov 24 Budgets item (7142760180 on #10377), from the owner's Nov 23 "there's just so much empty area here": in Quitman, Mississippi the middle column holds two rows and the rest of the panel is empty, and "Who wrote it" is answered by a date ("Adopted October 1, 2024"), not a person or body.
Seen: Politics, Budgets for a town at 1440 by 900. Seen: the same page with the department over the totals and a body named, after. Guards: budgets-who-wrote.browser.mjs

**Cause.** Measured: `npm run bench`, Politics > Budgets on main draws three columns with the middle one holding two rows (Maquoketa, Iowa). The Budgets screen in src/bench/play.mjs draws the chosen department as its own middle column and the government's totals as a third, and puts only the adoption date under "Who wrote it" though the adoption record names the body (`adoptedBy.tallies[0].title`).

**Fix.** Stack the chosen department's section over the totals in one column (two columns in all); under "Who wrote it" show the body's name through the existing "Adopted by" label and the date, and show the section only when the record names a body; add budgets-who-wrote.browser.mjs.

**Time box.** 2 hours

**Rules.** Screen to mock: MENU-LOOK says no dead space and no filler, so a column of two rows is merged and a date alone is not an answer to who. No hand-written player text: only the existing "Who wrote it", "Adopted by" and "Adopted" labels are used.

**Done when.** A second session, in a drawn place and seed it names, opens Budgets for a government whose budget a body voted and sees the department's rows over the totals in one column and the body named under "Who wrote it"; budgets-who-wrote.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,tests/src/bench/budgets-who-wrote.browser.mjs (new)

**Notes.** Seen in the game (2026-11-25, Dead stops tracer): Essex, Massachusetts, seed e2dc126b-f10e-45ac-b004-aa9b6098fc2b, main b84540133d: After dev mode ran to the first adopted budget (July 1, 2025), Politics > Budgets for the Town of Essex showed the chosen department's rows (Elementary and secondary education, 5.6 million dollars, last year, since last year, asked) above the town's totals in the same column, and Who wrote it read Adopted by Essex Select Board, adopted July 1, 2025; the Massachusetts tab read Adopted by House of Representatives; budgets-who-wrote.browser.mjs passed (3 governments, two columns each).
