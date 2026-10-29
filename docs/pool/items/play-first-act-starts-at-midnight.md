---
id: play-first-act-starts-at-midnight
title: "A new life's first act starts at midnight: filing from the opening evening ends at 3 AM"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** In a new life that has not pressed Day yet, the card shows the opening evening (8:30 PM), but the player's clock already stands at the next midnight, so the first act's hours run from 12:00 AM. Filing at the clerk's counter (three hours, filingVisitHours) moves the card from 8:30 PM to 3:00 AM the next day; a first canvass does the same. Seen in Millry, Alabama (seed probe-1) and Berryville, Virginia, Oct 29, on the petition branch's filing.browser.mjs. Cause: BenchPlayer.spend in src/bench/player.ts starts from the day after the world's date at minute 0 when no packet is held, while the title answer shows the opening's minute. integration-day-lands-on-morning-and-places-keep-hours (#6397) fixed Day and Week, not an act taken before them.

**Rules.** Owner, Oct 27: nothing at midnight; the day is lived to its start (playerDayStartMinute, a registered TUNABLE). One rule, all 56 places. Speed: no year more than 20 percent slower.

**Done when.** In a drawn place, a new life files at the counter before pressing Day, and src/bench/filing.browser.mjs shows the card's clock moving from the shown moment by the filing's hours, landing in the day and never after midnight; a test on the player's clock fails on main, with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** In a new life, filing at the counter before pressing Day moves the clock three hours into the day, never to 3 AM.

**Screenshot.** The card's clock before and after the filing, from a drawn place, in the PR body.

**Files.** src/bench/player.ts, src/bench/handler.ts, src/bench/filing.browser.mjs

**Notes.** TODO
