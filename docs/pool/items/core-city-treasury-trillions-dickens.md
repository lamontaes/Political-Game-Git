---
id: core-city-treasury-trillions-dickens
title: "M0-08: a 180-person city's employer flows reach $7 trillion in a year and the books do not balance (Dickens, Iowa)"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr: #5891
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The M0-08 money year (scripts/core2-year/closures.mjs) on main b09ba675cd in Dickens, Iowa (place key 1921360, runner seed 54e03066883f228dfe2b9acb51259d9f50dd7d3f92fa9a6d906d613dc601faa8) reports 'every dollar balances: false'. The City of Dickens as an employer paid $7,018,385,225,687 into the town and $7,013,270,603,554 out in one year, and the government-treasury owner kind closed the year at $5.17 billion from $0. A city of about 180 people spends a few hundred thousand dollars a year, so something multiplies or loops a city payment. Find which writer posts it and fix it at the root.

**Rules.** Wire to the world: every dollar moves between real accounts on the one balanced writer, so a city's payments must match its budget and the journal must balance in the played year. One rule, all 56 places: the fix holds for any drawn place.

**Done when.** CORE2_BOOKKEEPING=0 node --import tsx scripts/core2-year/closures.mjs, run with the runner's env for Dickens, Iowa (seed above) and two more places drawn from all 56, reports 'every dollar balances: true' and each city employer's yearly flows within its adopted budget, named by record id in the PR body. **On screen.** Nothing yet: filed play-city-books-on-screen, which puts it on Politics → Budgets.

**Files.** scripts/core2-year/closures.mjs, src/core2/modules/budgets.ts, src/core2/accounts.ts

**Notes.** Found by the M0-M2 lead's baseline run, Oct 24 (docs/coordination/LEADS-2026-10-24.md). Blocks roadmap M0-08.

Sent back 2026-10-24 from PR #5891 (branch claude/quirky-ride-vrwwz4-city-treasury): First Done-when row explicitly not met: committed closures command remains false in required three places, while passing corrected-checker copy is unpublished; publish root checker fix or bound completion item and retain balance acceptance open; finish on that branch, merge main into it first.

The outside-market lookup fix is bounded by core-treasury-settles-with-outside-market for PR #5891. This item stays open for its first Done-when line (closures.mjs reporting every dollar balances: true), which waits on roadmap-m0-08-closures-check-opening-timing.

Oct 28, 23:05 UTC (wire-office, checked on main at da7f3832 and later): the city employer's flows are fixed. The same command in Dickens now reports the City of Dickens paying $194,295 into the town and $196,678 out in the year. 'every dollar balances' is still false, but through other lines: the plug 'accounts.transfer outside-revenue' owes $4,386,137,528,493 in 48 entries, matched 'treasury-tax' carries $802,009,604,172 in 116 entries, and the government-treasury owner kind closes at $6,717,756,451 from $1,615. That points at the federal treasury's outside revenue and tax postings, not the city, and is what roadmap-m0-08-closures-check-opening-timing and core-treasury-settles-with-outside-market cover.
