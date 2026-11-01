---
id: play-news-story-click-opens
title: "Every headline on the paper that looks clickable opens its story, and briefs do not look clickable"
area: play
kind: bug
priority: 1
size: S
status: claimed
claimed-by: play-first/play-news-story-click-opens
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:25 UTC
lead: play-first
milestone: play-first
claimed-at: 2026-11-01T23:10:56.281Z
---

**What.** Owner, Nov 1 playtest of v0.73.0, on the side column of race results: "I click on it, nothing happens." The side column's items are briefs, which by the Oct 29 briefs ruling are a headline and one line and are not clickable. But they are styled like the clickable lead story, so a click that does nothing reads as broken. Either a side item opens its story in place like the lead, or it is styled as a brief with no hover or pointer.

**Rules.** Screen to mock: one shared look for a clickable story and one for a brief, from the approved paper mock. This is a game, not a spreadsheet: nothing on screen invites a click that does nothing. The lane owns src/bench (play-first LAW).

**Done when.** A browser check on a drawn place's front page clicks every headline: each either opens its story in place or carries no pointer or hover; screenshots show both kinds.

**Time box.** 2 hours.

**You will see.** Every headline that looks clickable opens its story; short items don't pretend to be links.

**Screenshot.** The front page with one story open and one brief hovered.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/news.browser.mjs

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest (Nov 1, 22:25 UTC, five screenshots, New Game). Read: OWNER-DECISIONS (Oct 29 02:35 opening montage and address; Oct 29 address "no real statistic in play"; Oct 26 one scene system), the pool for twins.
