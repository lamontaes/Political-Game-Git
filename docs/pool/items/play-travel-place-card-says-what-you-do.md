---
id: play-travel-place-card-says-what-you-do
title: "Travel's place card names the office as its records do and says in words what you can do there"
area: play
kind: bug
priority: 1
size: S
status: in-pr
claimed-by:
pr: #7087
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 23:05 UTC (third batch, a Massachusetts life)
lead: play-first
milestone: play-first
---

**What.** Owner, Nov 1 playtest of v0.73.0, on Travel's card for the clerk: "Okay. This doesn't make any sense. It says what you do here. And then it's just a list of people's names." The card is titled "City or town clerk" with "Filing office" under it, and What you do here lists six seat buttons by their holders' names. The card should carry the office's own name from the place's records (for example the town's City Clerk's Office) and say in a sentence or two what a resident does there (file for office, register to vote, ask for records), with no seat list.

**Rules.** No hand-written player text: the name and the sentences come from the place's records through the English engine. This is a game, not a spreadsheet: a place card reads like a place, never a list of records. The lane owns src/bench (play-first LAW).

**Done when.** In two drawn places (named with seeds), the clerk's Travel card shows the office's own name and a worded description of what you do there, with no seat or holder list; screenshots before and after.

**Time box.** 2 hours.

**You will see.** Travel's clerk card is named for your town's clerk's office and tells you what you can do there.

**Screenshot.** The clerk's Travel card before and after.

**Files.** src/bench/play.mjs, src/bench/travel.browser.mjs

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, third batch (Nov 1, 23:05 UTC, five screenshots, a Massachusetts life). Read: OWNER-DECISIONS (town council seats elected as each place's records say, at-large, by district or mixed; six offices and playerMayFile, Oct 29; every campaign act is a scene), the pool for twins.
