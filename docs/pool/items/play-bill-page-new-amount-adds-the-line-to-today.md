---
id: play-bill-page-new-amount-adds-the-line-to-today
title: "A budget bill's page says the bill makes a line $557,000 when its section sets it at about $292,000 on a $265,000 base"
area: play
kind: bug
priority: 2
size: S
status: merged
claimed-by:
pr: #8866
after:
blocked-on:
source: P1, Nov 11, 2026, seen while building play-bill-numbers-and-dates-said-in-words (#8856); filed at Fable B's word
lead: screens
standard: 2
model: sonnet
effort: medium
root: none
merged-at: 2026-11-11T23:08:22.586Z
---

**What.** In Sunset, Louisiana (bench seed `bill-words-1`), the player stepped in as a council member (Advanced) and drafted a budget bill on the highways line from Your office. The bill's page shows three figures that do not agree: "In force today $265,000", "The bill makes it $557,000", and in its section "Highways: about $292,000 for the year". The $292,000 is about 1.1 times the $265,000; the $557,000 is the two added together. Shots: docs/seen/play-bill-numbers-and-dates-said-in-words/bill-page-after-sunset-la.png. Seen: the bill's page, opened from Bills or Your office, in the two cells at its top and its section.

**Cause.** Found in code: the writing screen (play.mjs `onDraft`, the draft card) asks for a budget line's new amount beside today's, as it does for a rate, and `seatAct` (src/bench/legislature.ts) passed what was typed on as the section's `value`. The engine reads a budget-line section's `value` as the change to the line: `billForm` sets `after = before + value` (src/core2/modules/legislature.ts, about line 1947), and every other drafter of a budget bill writes a change (the budget bill's `value: delta` with `of` the carried amount; world-legislating's `deltaMinor`; a department request's `value: 0`). So the bill set the line to today plus the typed amount, and the page's "The bill makes it" ($557,000 in Sunset, Louisiana; $136,000 in Hulett, Wyoming, bench seed `line-1`) was what the law would really pay. The section sentence (`budgetSectionSaid` with `provision.value`) said the typed amount "for the year", which is why the three figures disagreed. The page's own sum (`est.ofMinor + est.lineAmountMinor`, play.mjs) was right for a change, but it was the page doing the sum. The engine is right; the bench's draft was wrong.

**Fix.** `seatAct` records a typed budget-line amount as the change on today's amount (`value: typed - today`, `of: today`), as every other drafter does, so the law sets the line to what was typed. The paper's estimate hands the page `lineNewMinor`, the amount the bill sets (the engine's own after), and the page shows it without adding. The section sentence says that amount. A test over three drawn bills checks that the law, the paper and the bill page all say the typed amount.

**Time box.** 1 hour to find the cause.

**Rules.** One rule, all 56 places: the check draws its place and names it with its seed. Figures that contradict each other on one screen are a defect (player-screen-text): the page shows the one amount the law would set.

**Done when.** A second session, on main, in a drawn place, steps in as a local body member (Advanced), drafts a bill on a budget line from Your office, opens the bill's page and sees the amount "the bill makes it" equal to the amount its section names for the year, and, if the bill passes, the line's amount in force afterward equal to that same figure, naming the place and seed.

**Waits on.** The cause.

**Files.** src/bench/play.mjs (the bill page's two cells); the estimate that hands `ofMinor` and `lineAmountMinor` (not yet found).
