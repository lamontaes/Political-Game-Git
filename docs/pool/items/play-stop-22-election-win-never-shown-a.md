---
id: play-stop-22-election-win-never-shown-a
title: "Election night shows your own race first, with every candidate's votes"
area: play
kind: bug
priority: 1
size: M
status: in-pr
claimed-by:
pr: #6041
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** On the v0.22.10 release I won my council seat 448 to 246 in the records, but election night showed eight statewide races and ran out before the county, city and council races. Nothing on screen said I won. This part puts the player's own contest first on election night with each candidate's total and the result in words.

**Rules.** Serves LAW.md §4, Scenes and conversations. This is a game, not a spreadsheet: winning or losing is golden-path step 5 and the player sees it first. The chain is the acceptance: the screen reads the results record by its contest id.

**Done when.** In a drawn place, after an election the player ran in, the first results page names the player's own contest, each candidate's votes and whether the player won, read from the results record by contest id, shown by a screenshot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** On election night your own race comes first, each candidate with their votes, and the screen says whether you won.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/results.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-22-election-win-never-shown (Oct 24, lane). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

CTO, Oct 25 18:20 UTC: #6041 (m0-m2 lead, branch claude/quirky-ride-vrwwz4-play-stop-22, filed as play-election-night-own-race-first) is this part's PR; it merges under this id. Part b stays after a.
