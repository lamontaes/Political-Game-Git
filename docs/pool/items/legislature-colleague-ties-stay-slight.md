---
id: legislature-colleague-ties-stay-slight
title: "Legislators who have served together for years open the game barely knowing each other"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Lying builder, Nov 15, from the recount of lies told at three places (Account lead asked whether the opening gives colleagues their past terms)
---

**What.** The opening does count past terms: a member's drawn service start reaches back years (American Samoa's senate at seed 0b6c599b opens with starts from 2015), and the shared sittings since both sat are read. But the ties stay slight. The closest pair in that senate, both serving since January 2019, have shared 2.8 hours and read a closeness of 0.030 on day one. At 4846968 seed 8647-mason no pair in the Texas senate reaches 0.1 by day 120. Six years in one chamber should make colleagues know each other well, and everything that weighs a tie between them (a lie's cost, an ask, leadership votes) sees strangers. Seen: in dev mode, two members who have sat together for years open with a closeness well above a stranger's, and a pair who just arrived together sit near zero.

**Cause.** Found in code: `sittingsBetween` in src/core2/modules/world-legislating.ts counts only floor weeks, starting from the end of committee time, so committee meetings and caucus time add nothing. `sittingHours` in src/core2/sitting-closeness.ts then gives each pair `sittingContactShare` (0.15, TUNABLE with no source for the amount) of a sitting, split among the `knownAmong` colleagues, and fades it at the coworker half-life, so the hours level off at a few.

**Fix.** Count the time members actually share, from the calendars the engines already keep: committee meetings through the committees engine, and caucus meetings through the party engine where it keeps them. Turn `sittingContactShare` into a researched number (the researcher skill), checked against how well legislators report knowing their colleagues after a term. Make no hand-set floor and no new weight.

**Time box.** 6 hours, one Opus session at medium effort.

**Rules.** One rule, all 56 places: the calendars and the share come from data the same way at every place. Wire to the world: the hours feed `closenessBetween`, which every engine already reads.

**Done when.** At the named place territory:AS:maia seed 0b6c599b2140735b80cdc730a4793e7054568c52f90bd08df2761745ff6cdc21, a pair who have served together since 2019 opens with a closeness that the researched share predicts (stated in the test with its source), and a pair who started together in 2025 opens near zero; a played year at three named places runs within the speed bar; a second session sees it in dev mode on main.

**Waits on.** Nothing.

**Files.** src/core2/sitting-closeness.ts, src/core2/modules/world-legislating.ts, src/core2/data/parameters.json
