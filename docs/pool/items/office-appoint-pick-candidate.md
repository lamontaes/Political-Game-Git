---
id: office-appoint-pick-candidate
title: "The player picks the person when naming a department head"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/appoint-pick-candidate
pr: #4832
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T21:28:04.560Z
---

**What.** The "Name a department head" act (pool item office-appointments) fills a vacant town post with the candidate the official's own reasons rank first, because the office panel has no way to show candidates or take the player's pick. Add the pick: the office panel lists the people the post could go to, ranked by the reasons the engine already keeps (alignment, qualification, acquaintance), and the player's choice is passed to `appoint` as the named person. The player would notice a short list of residents with their jobs and a button to name one of them.

**Rules.** No hand-written player text: the list shows record data and control names, and any sentence comes from the English engine. This is a game, not a spreadsheet: one choice among people, no form. No dice: the ranking is the engine's reasons, and the council confirms by its members' views. Ask why: the nomination and the vote keep reasons by record id. One rule, all 56 places: which posts exist comes from place data.

**Done when.** In a drawn place (`buildBenchWorld`, a seed the builder did not choose, both named in the PR body) with a post open, the office panel returns the ranked candidates with their reasons, a pick of a candidate other than the first is passed to `appoint`, and the appointment record id, the council vote and the new head's job are shown by record id in a test beside src/core2/office-day-name-head.test.ts. The owner plays it: opens the office panel after a department head dies and names someone.

**Files.** src/bench/office.ts, src/bench/handler.ts, src/bench/play.mjs, src/core2/modules/executive.ts, src/core2/office-day-acts.ts

**Notes.** Split from office-appointments. `fillTownPost` in src/core2/modules/executive.ts already builds the candidate pool and the reasons; expose them as a read-only list and let the act's prepared content carry the player's pick, as the interview act carries its outlet.
