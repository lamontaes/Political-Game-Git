---
id: play-election-night-own-race-first
title: "Election night opens on the player's own race; Campaigns, News and Government say how it went"
area: play
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-play-stop-22
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T15:41:37.664Z
---

**What.** A bounded slice of play-stop-22-election-win-never-shown (which stays open for the journal and the installed-build screenshot). Four bench causes: new results opened the Campaigns sheet and the results sheet sorted only by date and stopped at eight races (src/bench/play.mjs); News lists only public records, and the kept log marks a record naming the player or their circle as circle, so the player's own result never showed (src/bench/calendar.ts newsItems); a filing kept reading on-ballot after its race was decided; and nothing showed who won a seat between the count and the day they take office (src/bench/government.ts).

**Rules.** This is a game, not a spreadsheet: winning or losing is golden-path step 5 and the player sees it first. No hand-written player text: screens show record data and control names from controls.json.

**Done when.** On the bench in a drawn place, after an election the player ran in, the Election night sheet opens by itself with the player's race first and every candidate's votes; Campaigns reads Won or Lost for the filing; News lists the player's election-result record as public; and Government shows the elected winner and the date they take office for each decided seat, shown by screenshots and record ids with place and seed named.

**Files.** src/bench/play.mjs, src/bench/results.ts, src/bench/calendar.ts, src/bench/government.ts, src/bench/data/controls.json

**Notes.** TODO
