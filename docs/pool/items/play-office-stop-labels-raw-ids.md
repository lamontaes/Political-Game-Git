---
id: play-office-stop-labels-raw-ids
title: "The office sheet's stop toggles show raw ids (own-hearing, floor-vote, whip-ask) instead of worded labels"
area: play
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: golden/your-office
pr: #6497
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:48:20.021Z
lead: play-first
milestone: play-first
---

**What.** On Politics, Your office, the toggles that choose which moments stop the clock are labeled with their kind ids: own-hearing, state-of-the-state, floor-vote, whip-ask, joint-address, budget-request and nomination. Beside them sit "Ask for an interview with" and "Decided for me", a newsroom picker, and the pay line ends in a payer name and an ISO date. It is the screen where the player proposes an ordinance, golden path step 6, and it reads as a developer screen.

**Rules.** Scenes stop time, or the player does (OWNER-DECISIONS, Oct 27, 5 PM): which moments stop the clock is the director's call, so the toggles are deleted rather than worded, and LAW.md wins over this item's earlier "word each toggle" text. No hand-written player text and player-screen-text: no record kinds and no ISO dates on a player screen. Actions start from people, places and scenes, not menu lists (OWNER-DECISIONS, Oct 20 menu study): the interview picker goes too.

**Done when.** In a bench world drawn from all 56 (place and seed named), Your office shows no stop toggles, no outlet picker, no record kind and no ISO date, shown by a before and after screenshot in the PR; and the test src/bench/office-screen.test.ts fails on main's play.mjs and passes on the branch.

**Time box.** 2 hours.

**You will see.** Your office: your seat, what it pays a year, the next meeting's date in words, the deals for your colleagues, the draft control and your bill.

**Screenshot.** Before and after at 1440 by 900 from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/office.ts, src/bench/handler.ts, src/bench/data/controls.json, src/bench/office-screen.test.ts

**Notes.** Found by the browser run on PR #5533; rescoped by the golden-path session, Oct 28.
