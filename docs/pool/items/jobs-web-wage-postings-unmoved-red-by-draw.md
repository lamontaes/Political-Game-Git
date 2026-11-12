---
id: jobs-web-wage-postings-unmoved-red-by-draw
title: "jobs-web wage case red on main by draw: the one new posting pays the same in both worlds (Montrose, Arkansas, seed c0cb88e1667c71e5)"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The jobs-web wage case is red on main by draw. src/core2/jobs-web.test.ts ('a higher wage factor moves the pay of new postings') failed on clean main (514ebcf9a1, Oct 29) with WEB_LABOR_SEED=c0cb88e1667c71e5, Montrose, Arkansas: 'web labor wage twin: new postings 1->1, pay against the copied job 1.0126->1.0126', so 'expected 1.0125811688311688 to be greater than 1.0429586038961038'. The town posted one job in each world and the web's raised wage factor did not reach its pay. Other seeds pass. Found by the laws session. Guards: the pay of a new job a player reads after a law moves wages, which the jobs-web test keeps working.

**Cause.** Found in code: the test's shift is erased on the day the postings are priced. Measured: `WEB_LABOR_SEED=c0cb88e1667c71e5 npx vitest run src/core2/jobs-web.test.ts` on main 986f946b, with a temporary log of each new posting (since undone). Five postings opened after the shift in each twin. The one opened 2025-04-01 carries the raise (1,631 cents against 1,483, a factor of 1.10), and the four opened 2025-05-01 are the same in both worlds (1,415, 2,498, 2,999 and 4,957 cents). So the mean ratio barely moves (1.0132 to 1.0333 against a bar of 1.0436). `play` in src/core2/jobs-web.test.ts (line 106) lays the raised effects with `setEffects` after each day's `advanceCore`. But the outcome web reruns the town's month row whenever a law takes effect (`OUTCOME_WEB_MODULE.onEvent` calling `run`, src/core2/modules/outcome-web.ts about line 720), recomputing each link's effect and overwriting what was laid. Laws take effect on the 1st, the day the jobs engine's monthly review prices new openings through `payFor` and `payLevel` (src/core2/modules/jobs.ts lines 1679 and 2582). With a probe outside the repository, the trial's town (Dora, Alabama, `drawPlace("c0cb88e1667c71e5", "web-labor-wages")`) had 5 laws take effect on 2025-05-01 and none on 2025-04-01. The engine is right: a real law in force would keep its effect through the rerun. Also, the trial's log line prints the file's `place.name` (Montrose, Arkansas) though the world it plays is `found`, which is why the item names Montrose.

**Fix.** In src/core2/jobs-web.test.ts only. (1) Keep the shift in force through same-day reruns: register a small module after the outcome web (`registerModule`, as other tests do) that re-applies `setEffects` in its `onEvent` for `law-took-effect` and when the web's calendar run fires, so the jobs review that day reads the shifted row. Or count only postings priced on a day whose row carried the shift, read from the row at posting time. No assertion is loosened. (2) Print `found.name` and `found.key` in the trial's log line instead of the file's `place`. Run the test on c0cb88e1667c71e5 and e52655e5c79530b9 and two fresh seeds.

**Time box.** 1.5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a new posting's pay reads the web's wage factor on the day it is priced, by record id. One rule, all 56 places: the test keeps drawing its place, names the place and seed, and passes over by name a draw too thin to show the factor rather than asserting on it.

**Done when.** A second session runs the test src/core2/jobs-web.test.ts with WEB_LABOR_SEED=c0cb88e1667c71e5 (Dora, Alabama by the corrected log) and e52655e5c79530b9 and two fresh drawn seeds, naming each place and seed, and 'a higher wage factor moves the pay of new postings' passes in each, with every posting opened after the shift paid more in the shifted twin.

**Waits on.** Nothing.

**Files.** src/core2/jobs-web.test.ts, src/core2/jobs-web.ts, src/core2/modules/jobs.ts

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `WEB_LABOR_SEED=c0cb88e1667c71e5 npx vitest run src/core2/jobs-web.test.ts` (Montrose, Arkansas): still red, 'a higher wage factor moves the pay of new postings': "expected 1.0333345645482257 to be greater than 1.0435520520640864". Fresh draw `WEB_LABOR_SEED=e52655e5c79530b9` (Westwego, Louisiana): red the same way: "expected 9.368058889422308 to be greater than 9.54476556249". Red on two of two draws.

Nov 11 (cause finder for Fable B): reproduced on main and printed each posting in both twins. The postings opened on the first of the month were priced while the web's same-day rerun for that day's laws had erased the test's shift. The fix keeps the shift in force through those reruns in the test, and the log names the town it really played.
