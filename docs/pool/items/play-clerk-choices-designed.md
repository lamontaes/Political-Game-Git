---
id: play-clerk-choices-designed
title: "The clerk's choices are a few clear lines, with no tooltip covering them"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #7081
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 23:05 UTC (third batch, a Massachusetts life)
lead: play-first
milestone: play-first
claimed-at: 2026-11-01T22:40:58.003Z
---

**What.** Owner, Nov 1 playtest of v0.73.0, at the clerk's counter: "Okay, so it says, what can I do for you? So again, it shows a bunch of council members. And that little tooltip pops up and then held by this is a terribly designed menu." The talk box lists six "I want to run for Council member." lines, each with a gray line of seat, date and holder, and a hover card covers the lines below it. With campaign-player-files-for-one-council-race the counter offers one race; the choices read as plain lines a person would say, the race's date and seat sit in the line itself, and no hover card covers the list.

**Rules.** Screen to mock: the talk box's choices follow the shared choice part, never a one-off. No hand-written player text: each choice comes from the bank. This is a game, not a spreadsheet: the counter offers what a resident would ask, not a table of seats.

**Done when.** In a drawn place (named with seed), the clerk's first question shows at most four choices, none covered by a hover card, each naming its race in words; screenshots before and after at 1440x900.

**Time box.** 2 hours.

**You will see.** At the clerk's counter you see a few clear choices instead of a stack of identical lines.

**Screenshot.** The clerk's choices before and after.

**Files.** src/bench/play.mjs, src/bench/play.css

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, third batch (Nov 1, 23:05 UTC, five screenshots, a Massachusetts life). Read: OWNER-DECISIONS (town council seats elected as each place's records say, at-large, by district or mixed; six offices and playerMayFile, Oct 29; every campaign act is a scene), the pool for twins.
