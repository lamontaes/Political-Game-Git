---
id: gov-passed-budget-changes-spending-red
title: "Golden path M0-13 red on main: an enacted budget's lines do not reach adopted spending"
area: gov
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** tests/golden-path/played-world.node-test.ts, 'a passed budget changes spending', fails on fresh main (17 pass, 1 fail; seed 85eb06d3b24a66b6afe797dbdf3869df8cc0aa75): 12 of 14 budget bills enacted with line changes left the adopted spending as it was the year before (2025-1, 2025-6, 2025-7). Not caused by the guards PRs: the same failure is on origin/main without them. Recent budget-line commits are ccaf1c492c (local bodies take up amendments to their budget lines) and b330169d74.

**Rules.** chain-is-acceptance, wire-to-the-world Wire to the world: the change is proven in a generated world through the engines that already read it, not in a test's own small world.

**Done when.** M0-13 (node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts) passes: an enacted budget's changed lines show in the next adopted spending, named by budget record id.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/world-legislating.ts, tests/golden-path/played-world.node-test.ts

**Notes.** Duplicate of gov-enacted-budget-lines-miss-adopted-spending: same check (M0-13), same cause (mid-year amendments counted as annual budgets). Evidence moved there.
