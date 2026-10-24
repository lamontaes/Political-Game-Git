---
id: play-stop-22-election-win-never-shown
title: "I won my council race and no screen ever tells me"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release I filed for Anson City Council in February 2025 and campaigned for 21 months. The game's results record shows I won seat 0 on November 3, 2026 with 448 votes to Brenda Stanley's 246, Mason Hudson's 169, Sam Rose's 6 and Ethan Stanley's 1. On screen, election night opens an empty-looking party room behind Politics → Campaigns, which still says "ON-BALLOT"; the results pages show eight statewide races and run out before the county, city and council races. The Journal still says "I ran for Council member.", News has no election story, Who you are shows no seat and Government lists the old council. I expected election night to say I won, with my vote count, and the journal and news to say so.

**Rules.** This is a game, not a spreadsheet: winning or losing is golden-path step 5 and the player must see it first. The chain is the acceptance: the result record must reach the journal, the news and the Government screen, by record id.

**Done when.** The owner does the same steps on the next build and is not stopped: after an election the player ran in, election night shows the player's own race first with each candidate's votes, and the next day the journal, News and Politics → Government each say whether they won. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/results.ts, src/bench/play.mjs, src/director/journal.ts, src/bench/story.ts, src/core2/modules/elections.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:32 to 16:34; screenshots 78-day-after-vote-2, 79, 80-results-page-1 to 3, 81, 82. Results contest contest:seat:gus2025:205462:council:0:2026-11-03. Stopper 2 of 3. assigned: Play fixer (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).
