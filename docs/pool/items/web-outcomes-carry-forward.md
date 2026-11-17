---
id: web-outcomes-carry-forward
title: "The outcome web rebuilds every kept outcome from the 2024 level each month: each outcome carries forward from last month, and the town's own presidential turnout moves the web's turnout"
area: core
kind: bug
priority: 1
size: M
status: claimed
standard: 2
claimed-by: World B (session_01S4WSHrsirzMADEiASwJ6rk)
pr:
after:
blocked-on:
lead: money
model: opus
effort: high
root: none
source: CTO calibration audit on the crew's thread #9747, Nov 17, 2026, 01:06Z (item 2), and family 7 of "lift the pins" (03:11Z); plan posted by World B at 05:20Z (comment 6939371699)
---

**What.** Crime, schooling, coverage, turnout and the web's other kept outcomes are rebuilt every month from the published 2024 level, so nothing the world does to them outside a researched link ever stays. When a cause goes back to where it started, the outcome snaps back to the 2024 figure.
Seen: after a presidential election in the town, the web's turnout for the town is still the 2024 figure times its links.

**Cause.** Found in code: `recordMonth` in src/core2/modules/outcome-web.ts (about line 609 on main b6ac596a) writes each kept outcome as `baseOf(outcome, state, seed)` times its links' factors, every month. `baseOf` (src/core2/outcome-web-model.ts 256) is the published 2024 level with this world's draw. Last month's value is never read. `causeAt` measures a chained outcome against `baseOf` too, not against where the place started.

**Fix.** Each kept outcome is a kept level: in the first month its place's opening level (read once, kept on the baselines row), and after that last month's level moved by the month's change in its links' push (`pushes` on the month row: the product of factors, or the units added for a level outcome). `causeAt` measures a chained outcome against the place's own opening level. The town's own presidential count (the voting module's result row: named and counted turnout over eligible) sets `voting.turnout-pct` the first month after the election, citing the result row, and the links move it from there. `outcomeWebFactor` returns the links' push, so a level the town's records set is not read back as the web's factor. The opening level is the published level with this world's draw, read once, registered as `SG-WEB-opening-levels-published`.

**Time box.** 4 hours for one top-model session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: every kept outcome carries the same way. No dice: a level moves only by its links and the town's own records. Everything comes from the simulation: the published level is read once, as the opening.

**Done when.** A second session starts the bench in a drawn place that votes for President, plays past the November 2028 election, and sees in dev mode's web month rows that the town's turnout stands on its own count (the row's source is the result row) and that the next month carries on from it. `npx vitest run src/core2/outcome-web-carries-played.test.ts` passes there (set WEB_CARRIES_SEED to replay) and fails on main's `recordMonth`.

**Waits on.** Nothing.

**Files.** src/core2/modules/outcome-web.ts, src/core2/voting-module-id.ts (new), src/core2/outcome-web-carries-played.test.ts (new), src/core2/data/stopgaps/web.json

**Notes.** Left for the family's next pull request: pin 3 (budget causes measured above the Census base: `gov-measures.ts` and `school-budget-line.ts`), pin 4 (the deficit's denominator from 2024 output, `gov-measures.ts`), pin 5 (the opening levels and the poor-road base, `place-prices.ts` 90), and more movers from engines' own records (coverage from the coverage records, crime from the crime months).
