---
id: words-election-day-and-night-scenes
title: "Election day and night are scenes: canvassing, going to vote as the player's choice, the returns coming in, and conceding or celebrating"
area: words
kind: feature
priority: 1
size: L
status: done
claimed-by:
pr: #6252
blocked-on:
source: "words-and-scenes work order, deliverable 5 (docs/work-orders/lead-words-scenes-2026-10-26.md); the owner's Oct 26 rulings in OWNER-DECISIONS.md (election day is about five minutes of scenes; going to vote is the player's choice)"
lead: words
milestone: play-first
claimed-at:
---

**What.** Election day stops the player at the polling place whether they want to vote or not ("Vote or leave the polling place first"), and election night is a text sheet ("Turnout 34 / 161", "Exit poll", "Where it was won the rest of the town") that opens again on later loads. The owner's Oct 26 rulings ask for about five minutes of scenes instead. A filed candidate canvasses on election morning. Going to vote is a choice the day offers, with a narrator, and the engine never votes for the player. On election night the returns come in as the player watches. Then the player concedes or celebrates. Election night is its own pop-up.

**Rules.** Replace, never layer: the results sheet's code, styles and labels are deleted in the same change, and the forced polling stop goes with it. The engine never votes for the player (Oct 13, kept Oct 26). Scene standard: each beat writes something back (a vote cast or not, a journal line, a relationship or race record) and its roles are cast from the world. No hand-written player text: every line comes from the banks. One rule, all 56 places: the beats read the contest records, never a named place.

**Done when.** In a drawn place (buildBenchWorld, from all 56, seed printed), a player who files and plays to election day in ordinary play reaches each of the four beats in the bench, each citing the contest record id: canvassing, the choice to vote, the returns, and conceding or celebrating. A test asserts that the concession or celebration writes a journal line and a relationship or race record, named by id, and that skipping the polls casts no ballot. Bench screenshots of the four beats at 1440x900 with place and seed.

**Time box.** 4 hours.

**You will see.** On election morning someone from your campaign comes by and you head out with them. Later the day asks whether you go vote, and you can say no. That evening a pop-up shows the count coming in for your race, and when it is called you take a call, concede or celebrate, and the people around you react.

**Screenshot.** Each of the four beats, from a drawn place at 1440x900, in the PR body.

**Files.** src/bench/player.ts, src/bench/handler.ts, src/bench/play.mjs, src/director, data/english/parts/scene-talk.json, data/english/parts/scene-words.json

**Notes.** Owner rulings: OWNER-DECISIONS.md lines on Oct 26 (election day as scenes; election day as the player's choice, closing SG-OFFICE-owner-decision-ballot-stop). Related open item: play-results-sheet-opens-on-every-load (the sheet this replaces).
Sent back 2026-10-27 from PR #6252 (branch words/election-day-scenes): its election-day browser check stops at an open choice in Hoback, Wyoming (run seed 1793085601061); finish on that branch, merge main into it first.
Sent back 2026-10-27 from PR #6252 (branch words/election-day-scenes): election-day panel never shows for the first November (2025) election: East Franklin, NJ, EDAY_SEED=1793092862256; finish on that branch, merge main into it first.
- Merged Oct 27 in PR #6252; awaiting the owner's installed-build check.
