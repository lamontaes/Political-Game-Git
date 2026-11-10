---
id: release-red-law-reach-group-b-handler-count-sales-tax
title: "law-reach-group-b.test.ts fails on main: the handler count is 34 not 35, and a city sales tax test sees no price records in Pecktonville, Maryland"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
lead: laws-effects
after:
---

**What.** Two tests in src/core2/law-reach-group-b.test.ts failed on origin/main's src/core2, checked Oct 20. 'registers a handler for every group B policy and budget line' expected 35 handlers and got 34, so a policy row was added or a handler removed without the other. 'a city sales tax rate reaches every household and seller as a price record' failed with seed fe0ccacfdc69466b7eaf7b6844dcd892c394fb70e12524e00314298c091b21de in Pecktonville, Maryland (place 2460770): expected 253 price records and got 0. The test file has changed since, so first run the file on main and on that seed to find out whether either failure remains. If it is green, propose dropping the item; if it is red, find the policy row or handler added or removed without the other, and the path that writes a city sales tax's price records, and rewrite this item with the cause. Fix the code or the registry, never the test's bound.

**Cause.** Needs cause. Looked at src/core2/law-reach-group-b.test.ts (the handler-count test at line 628 registers a handler for every group B policy and budget line) and src/core2/law-reach/; the Oct 20 failure (34 handlers not 35, and no price records for a city sales tax in Pecktonville, Maryland, seed fe0ccacf...) was not re-run for this rewrite.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Wire to the world: a policy row without a handler is an unregistered placeholder; fix the handler or remove the row in the same change. One rule, all 56 places: the sales-tax check names its place and seed and must hold in any drawn place. A test is never loosened to pass.

**Done when.** A second session runs src/core2/law-reach-group-b.test.ts in full on main in a drawn place and on seed fe0ccacfdc69466b7eaf7b6844dcd892c394fb70e12524e00314298c091b21de (Pecktonville, Maryland) and sees it pass, with the handler count equal to the policy rows, named by policy id, and 253 price records for the city sales tax in that world, each by record id.

**Waits on.** Nothing.

**Files.** src/core2/law-reach-group-b.test.ts, src/core2/law-reach

**Notes.** TODO Released from idle draft #5217 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-udtiwn` (2026-10-20). Cleared from the front matter and kept here.
