---
id: core-memory-withholding-rows
title: "Trim pay withholding rows that grow memory about 5 MiB a month"
area: core
kind: cleanup
priority: 2
size: M
status: done
claimed-by:
pr: #4740
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A three-year played run in Juliaetta (seed memremeasure1) grew 19.7 MiB a month, not 5. The `core2-budgets-v1/withholding` table is the largest single table: about 1,100 rows a month (every paid official and worker), each about 4 KB once copied in, nearly 5 MiB a month, and nothing but tests reads the rows after the journal entry posts. Keep only what an engine reads (the year's pay to date and the journal entry), or only the current and previous year of rows, or store the lines compactly.

**Rules.** An effect is a read: if the rows are the 'why' a person can be asked, keep them for the player and the people they deal with, not for every payer (Keep it simple, bookkeeping). The journal must still balance to the cent.

**Done when.** The same three-year Juliaetta run (`CORE2_BOOKKEEPING=0 node --expose-gc --import tsx scripts/core2-guard/memory.mjs --months 36`) shows the withholding table's share of growth gone or under 1 MiB a month, and the tests that read `withholdingOf` still pass.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/official-pay.ts

**Notes.** Found in core-memory-remeasure. Its slot cache was released after posting; that was a small part. Live-allocation sampling showed the table's copied rows (module put and plainCopy) at about 57 MB over twelve months.

**What.** A played town grew its memory by 19.7 MiB a month over three years, and the largest grower was the pay withholding table (`core2-budgets-v1/withholding`), which held about 59,000 rows in Juliaetta, Idaho (seed memremeasure1) though nothing in play read them but tests. Keep a paycheck's tax record only for the player's household, family, the people they know and anyone in focus, and for everyone when bookkeeping is on, and release the journal copy after posting. The journal entry and the year's pay to date still carry every dollar.

**Rules.** Keep it simple (owner, Oct 11): the why is saved for the player and the people they deal with, and bookkeeping is a debug switch. Replace, never layer: the old keep-everything line is replaced by one check. Speed: no change may make a year slower.

**Done when.** In a 36-month played world (`scripts/core2-guard/memory.mjs --months 36`, bookkeeping off, place key 1642130, seed memremeasure1) memory grows less than before with the same money to the cent: 12.5 MiB a month against 19.7 measured, the withholding table gone from the tables that grew, and the withholding, income-tax, budgets and counted-hooks tests pass with a test that turns bookkeeping on where it checks every official's record.

**Files.** src/core2/modules/budgets.ts, src/core2/official-pay-withholding.test.ts, scripts/core2-guard/memory.mjs

**Notes.** Body repaired from the item's title and its pull request on 2026-10-16.

Sent back 2026-10-16 from PR #4740 (branch claude/memory-withholding): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
