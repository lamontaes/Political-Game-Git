---
id: words-paper-prints-empty-budget
title: "The paper prints a budget with no money in it (Orocovis, Puerto Rico)"
area: words
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: haiku
effort: low
root: rc9-place-facts-one-default
lead: governing
checked: fable 2026-11-10
---

**What.** In Orocovis, Puerto Rico (7257290; ARCHIVE_WORDS_SEED=1b28ca4702cab43d, draw 0 of archive-budget-words) the municipio's adopted budget row budget:county:72107:2024 has revenue 0 and spending 0, and the archive prints it as news: 'Orocovis Municipio adopts its budget. Orocovis Municipio adopted its budget for 2024.' with no sum. archive-words.test.ts ('words an adopted budget by its largest spending line') fails on main at that seed. Either the budgets engine writes a municipio budget with no lines, or the archive keeps a budget with nothing in it.

**Cause.** Measured: does not reproduce on main d64255aa (Nov 11). `ARCHIVE_WORDS_SEED=1b28ca4702cab43d npx vitest run src/bench/archive-words.test.ts -t "adopted budget"` passes. Its draw 0 is still Orocovis, Puerto Rico (7257290), and that budget row, budget:county:72107:2024, now holds revenueMinor 41571811 and spendingMinor 44212893, with largest line otherPrograms at 14721889. The archive words it: "Orocovis Municipio adopts its budget" / "The largest line in the new budget is $147,219 for other programs. Planned spending is $442,129, with $415,718 expected in revenue." The row is no longer empty, so the archive no longer prints a budget with no sum.

**Fix.** Nothing to build. The CTO drops the item as done by main. Two things seen on the way are not this item's defect. (1) The federal budget story prints "$6813.9 billion", which words-paper-law-and-budget-briefs-read-right (in PR) already covers (its Done when has budget sums printing as "$7.1 trillion"). The cause is `dollars` in src/bench/printed-words.ts (lines 105 to 120), which has no trillion step. (2) $442,129 of planned spending is far below what a municipio of about 20,000 people spends. The real Orocovis budget is in the millions, but I did not fetch it, so the size is a question for the budgets lead, not a filed defect.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** One rule, all 56 places: a territory's municipio budget is read like any county's, from data. Estimate, never UNKNOWN: a budget the data lacks starts from a sourced average with a spread, never $0. No hand-written player text: the paper's words come from the banks. An effect is a read: a budget nobody funds is not news.

**Done when.** A second session, not the builder, runs archive-words.test.ts at ARCHIVE_WORDS_SEED=1b28ca4702cab43d (Orocovis, Puerto Rico) and on three fresh draws (each named with place and seed) and sees it pass; Orocovis's archived budget names a dollar sum read from its own row, or no budget story is archived for a row with no money and the cause is named by file and line.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/past-news.ts, src/bench/archive-words.ts

**Notes.** Filed by Lane 3, Nov 3, while finishing #7127 (it fails the same on main, so not that PR's fault). Lane 2 owns the budget row; Lane 3 owns the words. The first step is to find which one is wrong.

Lane 3 (Nov 4): neither side is in Lane 3's files. `src/core2/past-news.ts:125-151` archives every row of the budgets table as `budget-adopted`, with sums that can be "0", and `src/bench/archive-words.ts` words it. The words side can't tell an empty budget from a funded one without inventing a sum. The fix is either in the budgets engine (a municipio budget starts from a sourced estimate, never $0; Lane 2) or in `past-news.ts`, which should keep no `budget-adopted` story for a row with no money (whoever owns `past-news.ts`). Put back to open for that lane.

**Notes (Fable's check, Nov 10).** How to find the cause: in the Orocovis, Puerto Rico replay, read how the budgets engine opens the budget row budget:county:72107:2024 and why it has no lines (a municipio with no Census finance row, or a row the opening skips). The fix is then made there, as an estimate from a sourced average marked as an estimate, never $0; a guard in src/core2/past-news.ts (line 126) against archiving an empty budget may follow it, not replace it.

Nov 11 (cause finder for Fable B): not reproduced. The test passes at the named seed on main d64255aa, and Orocovis's budget row now holds money. I propose dropping the item as done by main. The dollar format past a trillion belongs to words-paper-law-and-budget-briefs-read-right.

Dropped Nov 13, 2026 (Account lead T33, CTO's Nov 12 drop rule): its own Fix section says "Nothing to build. The CTO drops the item as done by main." and its Cause says the fault does not reproduce on main. The reproduce-again advice in that Fix stays the way back: file a new item from the place and seed if it returns.
Seen on the way and not filed here: the federal budget story's "$6813.9 billion" is covered by words-paper-law-and-budget-briefs-read-right; whether Orocovis's $442,129 of planned spending is too small is an open question for the budgets lead.
