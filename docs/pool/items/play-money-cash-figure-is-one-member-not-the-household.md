---
id: play-money-cash-figure-is-one-member-not-the-household
title: 'Money shows "Cash available $0" over month rows of about $4,300: the big figure is the player''s own cash, the rows the household''s'
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/p1-money-cash-household
pr: #9006
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: Playtester P1, Nov 13
claimed-at: 2026-11-13
merged-at: 2026-11-13T06:51:12.224Z
---

**What.** Floydale, South Carolina (bench seed 7ef8e30e-dddf-4aae-a2c2-b4a1655188c7, main 5e68cde1), after a year of play. Money and property shows "Cash available · Floydale Community Bank" with "$0" in large type, and under it Aug $4,370, Sep $4,620, Oct $3,960, Nov $4,690, Dec $4,300, Jan $4,260. Hickory Hill, Kentucky (bench seed b258ee86-71f0-47cc-9311-fb3f905f521f) showed $0 over rows of $11,100 to $13,300. The player lives with working parents and owns nothing. Seen: the large cash figure on Money and property, which now matches the rows under it.

**Cause.** Found in code: src/bench/play.mjs, the `money` sheet. The figure is `roundedMoney(me.card.liquidMinor)`, the player's own cash. The rows are `bank.cash.months` from src/bench/bank.ts `bankView`, the household's members' cash at each monthly review. The same view also serves the household's cash now as `cash.nowMinor`, and the sheet never read it.

**Fix.** Show `bank.cash.nowMinor` as the figure, falling back to the player's own cash only when no bank view is served. Extend src/bench/money.browser.mjs to check that the figure is the household's cash now.

**Time box.** 1 hour for one Sonnet session.

**Rules.** One rule, all 56 places: the sheet reads the same household record in every place, with no place named. player-screen-text: two figures on one screen never contradict each other.

**Done when.** A second session, on main, plays a new life in a drawn place for a few weeks, opens Money and property, and takes a screenshot: the large cash figure is the household's cash now, on the same footing as the month rows under it, and src/bench/money.browser.mjs passes on the bench.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/money.browser.mjs, src/bench/bank.ts
