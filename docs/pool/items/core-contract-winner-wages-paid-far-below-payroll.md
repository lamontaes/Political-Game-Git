---
id: core-contract-winner-wages-paid-far-below-payroll
title: "A contract winner's book pays about 5 percent of its annual payroll (traced by PR 6217)"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/contract-wages
pr: #6358
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T16:16:39.192Z
---

**What.** In the item's pinned world (place key 5458756, world seed 316714e6…8c36b) the firm that wins contract:US-WV:schools:2025-02-01 (organization_99dd43244afa92df) has an annual payroll of 4,566,836 minor but its book paid only 237,568 minor of wages over the year, while its sales were 32,059,356. PR 6217 changed the contracts test to read wages over the whole run, so the test no longer shows the gap. Find why wages paid are so far below the payroll and whether it holds in other places.

**Rules.** One rule, all 56 places: trace it in a drawn place and name the place and seed. Wire to the world: wages paid must follow the payroll through the firm's book to its workers.

**Done when.** In a played world (buildBenchWorld) in a drawn place with its seed named, a contract winner's wages paid over a year are within a stated share of its payroll, or the cause of the gap is named by record id and fixed; the check fails on the pinned world before the fix.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/contracts.test.ts

**Notes.** TODO
