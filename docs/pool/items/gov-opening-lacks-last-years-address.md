---
id: gov-opening-lacks-last-years-address
title: "A world in motion has no record of last year's yearly address"
area: core
lead: laws
kind: bug
priority: 3
size: M
status: merged
standard: 2
claimed-by: account-lead-builder
pr: 9472
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 14 (world address PR, coordinator's request)"
checked:
---

**What.** On the first day the world has no past address by any mayor, county executive, governor or President, so nothing in it can say how long since each last spoke, and the first season's addresses read as the first ever. Seen: a mayor's Journal on day one shows last year's address as past.

**Cause.** Found in code: the speech module's `addresses` table (src/core2/modules/speech.ts, `addressesGivenBy`) and the office-day acts table start empty at the opening; no past module (housing-past.ts and macro-world-past.test.ts are the pattern) writes an address.

**Fix.** Add the past address to the opening the way the other past records are written (a speech row and an act row dated last year for each executive by the custom, from the same decision as the world's), with no new engine.

**Built (Nov 15).** `openingActs` in src/core2/modules/office-day.ts, called at the end of `openOfficeDay`, writes for every serving holder who has office duties one office-hours row and one town-hall row dated inside that kind's interval before the start (spread by position, no draw), and for each mayor and county executive a state-of-the-city row dated last year in the address season. Governors and the President are not written: their addresses run through the state and federal calendars. No speech-table row is written, because no engine reads one. Pinned test src/bench/opening-acts.test.ts (Edmore ND, Odessa WA). Four weeks of play show the same act counts with and without; what changes is the day-one duty need (0.94 and 0.97 instead of due).

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; one engine per mechanic (the offices engine's acts, no second scheduler); cadence-and-summaries (a yearly event, never a daily scan); an effect is a read, not a record.

**Done when.** A world built at three drawn places (names and seeds in the PR) holds last year's address for each mayor and county executive by record id, and a second session sees it in a mayor's Journal on day one.

**Waits on.** Nothing.

**Files.** src/core2/modules/speech.ts, src/core2/office-day-acts.ts, src/core2/housing-past.ts

**Notes.** The skills thread is told: an opening item.

**Builder note, Nov 14 (#9346).** The governors' and President's addresses are now given by the same writers on their dates (state kit calendar, federal joint address). The past year's address closes by calling that same writer for the past date inside the opening warm-up the skills thread is building, never by a seeded record. Year one has none until then.
