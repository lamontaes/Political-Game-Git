---
id: screens-hud-date-time
title: "The bottom of the screen shows the date and time, not a second picture of the player"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6478
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The owner ruled at 5 PM on Oct 27 that there doesn't need to be any indicator other than the time and date on the bottom. At 9 PM he asked for no second picture of the player. The bottom-left card still held the player's portrait, name and town.

**Rules.** Replace, never layer: the portrait and its handlers are deleted; one way to each screen (screen-to-mock): Who you are moves to the rail, the one menu, since the portrait no longer opens it.

**Done when.** In a drawn place (name the place and seed), src/bench/card.browser.mjs passes on a restarted bench and asserts the card has no picture and no visible name, shows the date and time, and the rail has Who you are; before and after screenshots are in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/play.css, src/bench/ui/rail.mjs, src/bench/card.browser.mjs

**Notes.** OWNER-DECISIONS Oct 27 5 PM; CTO relay 01:05 UTC Oct 28. lead: play-first.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, replaced. docs/coordination/OWNER-DECISIONS.md, section "Nov 7 to 8", records the CTO's call (the owner may overrule): "the player card keeps its portrait, as in the mocks he approved Nov 7 and conditionally approved Nov 8 (over the Oct 27 only the date and time)"; the Nov 8 "One date" ruling covers the clock. Note that main already holds this item's change: src/bench/card.browser.mjs (line 148) asserts the card shows the date and time and no picture. If the CTO's call stands, a new item must put the portrait back; this item's work should not be built again.
