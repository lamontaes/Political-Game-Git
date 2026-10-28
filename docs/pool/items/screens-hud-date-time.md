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
