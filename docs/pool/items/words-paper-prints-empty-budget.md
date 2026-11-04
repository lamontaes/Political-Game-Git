---
id: words-paper-prints-empty-budget
title: "The paper prints a budget with no money in it (Orocovis, Puerto Rico)"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Orocovis, Puerto Rico (7257290; ARCHIVE_WORDS_SEED=1b28ca4702cab43d, draw 0 of archive-budget-words) the municipio's adopted budget row budget:county:72107:2024 has revenue 0 and spending 0, and the archive prints it as news: 'Orocovis Municipio adopts its budget. Orocovis Municipio adopted its budget for 2024.' with no sum. archive-words.test.ts ('words an adopted budget by its largest spending line') fails on main at that seed. Either the budgets engine writes a municipio budget with no lines, or the archive keeps a budget with nothing in it.

**Rules.** One rule, all 56 places: a territory's municipio budget is read like any county's, from data. Estimate, never UNKNOWN: a budget the data lacks starts from a sourced average with a spread, never $0. No hand-written player text: the paper's words come from the banks. An effect is a read: a budget nobody funds is not news.

**Done when.** At ARCHIVE_WORDS_SEED=1b28ca4702cab43d, Orocovis, Puerto Rico's archived budget names a dollar sum read from its own row (or no budget story is archived for a row with no money, and the cause is named by file and line), and archive-words.test.ts passes there and on three fresh draws, each named with place and seed.

**Files.** src/core2/modules/budgets.ts, src/core2/past-news.ts, src/bench/archive-words.ts

**Notes.** Filed by Lane 3, Nov 3, while finishing #7127 (it fails the same on main, so not that PR's fault). Lane 2 owns the budget row; Lane 3 owns the words. The first step is to find which one is wrong.

Lane 3 (Nov 4): neither side is in Lane 3's files. `src/core2/past-news.ts:125-151` archives every row of the budgets table as `budget-adopted`, with sums that can be "0", and `src/bench/archive-words.ts` words it. The words side can't tell an empty budget from a funded one without inventing a sum. The fix is either in the budgets engine (a municipio budget starts from a sourced estimate, never $0; Lane 2) or in `past-news.ts`, which should keep no `budget-adopted` story for a row with no money (whoever owns `past-news.ts`). Put back to open for that lane.
