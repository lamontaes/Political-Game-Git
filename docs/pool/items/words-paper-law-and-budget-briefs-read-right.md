---
id: words-paper-law-and-budget-briefs-read-right
title: "The paper's law and budget items read as news, with rounded sums and dates that fit the day"
area: words
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:40 UTC (second batch)
lead: words
milestone: play-first
---

**What.** Owner, Nov 1 playtest of v0.73.0, scrolling to the bottom of the first paper: "you can see that there's a bunch of nonsensical stuff there." The bottom rows are bare lines such as "State unemployment tax rate took effect on January 1, 2025." and "Corporate income tax rate became law on October 5, 2024.", with no place, no change and no one it reaches. "Congress passes the federal budget" on January 20, 2025 says "The federal budget for 2024 is law" and "spend $7145 billion, against $5366.1 billion" (unrounded billions for trillions). The Delegate race printed 14,415 votes beside legislative races of 52 to 55.

**Rules.** No hand-written player text: each item comes from the bank with the law's level, place and change, and sums of a million or more are rounded in words (player-screen-text). Ask why: an item says what changed and for whom, from the law's record. Realistic not real: only news fresh on the paper's date prints.

**Done when.** In three drawn places (named with seeds), the first paper's law items each name the level, the change and who it reaches; budget sums print as "$7.1 trillion"; no story reports as news a budget adopted months before the paper's date; the PR quotes the bottom rows before and after.

**Time box.** 3 hours.

**You will see.** The bottom of the first paper reads as short news items instead of a list of tax names and dates.

**Screenshot.** The bottom of the first paper before and after, from a drawn place.

**Files.** data/english/parts/news.json, src/bench/printed-words.ts, src/core2/modules/press.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, second batch (Nov 1, 22:40 UTC, five screenshots, a game in the U.S. Virgin Islands). Read: OWNER-DECISIONS (Oct 29 menus redesigned the way Government was; Oct 29 Political Process baseline; one history), the pool for twins.
